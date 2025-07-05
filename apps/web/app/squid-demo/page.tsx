'use client';

import dynamic from 'next/dynamic';

// Import SquidRouterDemo dynamically to avoid SSR issues
const SquidRouterDemo = dynamic(() => import('@/components/SquidRouterDemo'), { ssr: false });

export default function SquidDemoPage() {
  return <SquidRouterDemo />;
}