import type { Metadata } from 'next';
import { GuideDraftScreen } from '@/components/guides/GuideDraftScreen';

export const metadata: Metadata = {
  title: '가이드 초안 | Scrave',
  robots: { index: false, follow: false },
};

export default function GuideDraftPage() {
  return <GuideDraftScreen />;
}
