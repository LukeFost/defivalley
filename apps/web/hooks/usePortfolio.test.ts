import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortfolio } from './usePortfolio';
import React from 'react';

// Mock the dependencies
vi.mock('wagmi', () => ({
  useConfig: vi.fn(() => ({})),
}));

vi.mock('@/services/PortfolioService', () => ({
  getMorphoPosition: vi.fn(),
}));

// Import the mocked function
import { getMorphoPosition } from '@/services/PortfolioService';

// Create a wrapper component for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('usePortfolio', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockMarketId = '0xabcdef1234567890' as `0x${string}`;
  const mockPositionData = {
    supplyShares: BigInt(1000000), // 1 USDC worth of shares
    borrowShares: BigInt(0),
    collateral: BigInt(0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    // Mock the service to delay
    (getMorphoPosition as any).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.portfolioData).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.totalValueUsd).toBe(0);
  });

  it('should format portfolio data correctly', async () => {
    // Mock successful response
    (getMorphoPosition as any).mockResolvedValue({
      marketId: mockMarketId,
      positionData: mockPositionData,
    });

    const { result } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolioData).toEqual({
      supplyShares: BigInt(1000000),
      borrowShares: BigInt(0),
      collateral: BigInt(0),
      vbUSDCAmount: 1, // 1000000 / 1e6
    });
    expect(result.current.totalValueUsd).toBe(1);
  });

  it('should calculate vbUSDC amount correctly', async () => {
    // Mock response with larger supply shares
    const largePositionData = {
      supplyShares: BigInt(123456789), // 123.456789 USDC
      borrowShares: BigInt(0),
      collateral: BigInt(0),
    };

    (getMorphoPosition as any).mockResolvedValue({
      marketId: mockMarketId,
      positionData: largePositionData,
    });

    const { result } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.portfolioData?.vbUSDCAmount).toBe(123.456789);
    expect(result.current.totalValueUsd).toBe(123.456789);
  });

  it('should handle errors from the service', async () => {
    // Mock the service to throw an error
    const mockError = new Error('Blockchain RPC failed');
    (getMorphoPosition as any).mockRejectedValue(mockError);

    const { result } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    // Wait for the query to settle and error state to be set
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeTruthy();
      },
      { timeout: 3000 }
    );

    // After loading is complete, check the error state
    expect(result.current.error?.message).toBe('Blockchain RPC failed');
    expect(result.current.portfolioData).toBe(null);
    expect(result.current.totalValueUsd).toBe(0);
  });

  it('should not fetch if no user address is provided', () => {
    const { result } = renderHook(() => usePortfolio(undefined), {
      wrapper: createWrapper(),
    });

    expect(getMorphoPosition).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.portfolioData).toBe(null);
    expect(result.current.totalValueUsd).toBe(0);
  });

  it('should respect stale time and cache time settings', async () => {
    (getMorphoPosition as any).mockResolvedValue({
      marketId: mockMarketId,
      positionData: mockPositionData,
    });

    const { result, rerender } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Service should be called once
    expect(getMorphoPosition).toHaveBeenCalledTimes(1);

    // Rerender within stale time - should not refetch
    rerender();
    expect(getMorphoPosition).toHaveBeenCalledTimes(1);
  });

  it('should correctly format data for a zero-value position', async () => {
    // Mock response with zero values
    const zeroPositionData = {
      supplyShares: BigInt(0),
      borrowShares: BigInt(0),
      collateral: BigInt(0),
    };

    (getMorphoPosition as any).mockResolvedValue({
      marketId: mockMarketId,
      positionData: zeroPositionData,
    });

    const { result } = renderHook(() => usePortfolio(mockUserAddress), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify zero values are handled correctly
    expect(result.current.portfolioData).toEqual({
      supplyShares: BigInt(0),
      borrowShares: BigInt(0),
      collateral: BigInt(0),
      vbUSDCAmount: 0,
    });
    expect(result.current.totalValueUsd).toBe(0);
    expect(result.current.error).toBe(null);
  });
});