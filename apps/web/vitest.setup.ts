import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock HTMLElement.focus to prevent focus errors
const mockFocus = vi.fn();
const mockBlur = vi.fn();

// Delete existing properties first, then redefine
delete (HTMLElement.prototype as any).focus;
delete (HTMLElement.prototype as any).blur;

Object.defineProperty(HTMLElement.prototype, 'focus', {
  value: mockFocus,
  writable: true,
  configurable: true,
});

Object.defineProperty(HTMLElement.prototype, 'blur', {
  value: mockBlur,
  writable: true,
  configurable: true,
});

// Also mock for generic Element in case HeadlessUI uses that
Object.defineProperty(Element.prototype, 'focus', {
  value: mockFocus,
  writable: true,
  configurable: true,
});

Object.defineProperty(Element.prototype, 'blur', {
  value: mockBlur,
  writable: true,
  configurable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    has: vi.fn(),
    toString: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useChainId: () => 1,
  useBalance: () => ({
    data: { formatted: '1000', symbol: 'ETH' },
    isLoading: false,
  }),
  useWriteContract: () => ({
    writeContract: vi.fn(),
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    data: null,
    isLoading: false,
  }),
  useReadContract: () => ({
    data: null,
    isLoading: false,
  }),
}));

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    parseUnits: vi.fn(),
    formatUnits: vi.fn(),
  };
});

// Mock Phaser
vi.mock('phaser', () => ({
  Game: vi.fn(),
  Scene: vi.fn(),
  AUTO: 'auto',
  WEBGL: 'webgl',
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: any) => fn,
}));

// Mock zustand
vi.mock('zustand', () => ({
  create: vi.fn(),
}));

// Mock the store
vi.mock('@/app/store', () => ({
  useUI: vi.fn(() => ({
    showCorralModal: vi.fn(),
    hideCorralModal: vi.fn(),
    showWellModal: vi.fn(),
    hideWellModal: vi.fn(),
    showOrchardModal: vi.fn(),
    hideOrchardModal: vi.fn(),
    isCorralModalOpen: false,
    isWellModalOpen: false,
    isOrchardModalOpen: false,
  })),
  useAppStore: vi.fn(),
  useTransactions: vi.fn(),
  usePlayerData: vi.fn(),
  useFlowQuest: vi.fn(),
  useConfig: vi.fn(),
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Privy
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
    ready: true,
    authenticated: false,
  }),
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Radix components
vi.mock('@radix-ui/react-dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => children,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => children,
  DialogContent: ({ children }: { children: React.ReactNode }) => children,
  DialogHeader: ({ children }: { children: React.ReactNode }) => children,
  DialogTitle: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@radix-ui/react-context-menu', () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => children,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => children,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => children,
  ContextMenuItem: ({ children }: { children: React.ReactNode }) => children,
}));