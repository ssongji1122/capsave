import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CaptureExperience } from '@/components/captures/CaptureExperience';

export const metadata: Metadata = {
  title: 'FIGURE (2) — Scrave',
  robots: { index: false, follow: false },
};

export default function CaptureLabPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CaptureExperience />;
}
