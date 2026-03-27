import type { Metadata } from 'next';
import { CapturesProvider } from '@/contexts/CapturesContext';
import { Sidebar } from '@/components/layout/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'CapSave — AI 캡처 오거나이저',
  description: '스크린샷을 AI가 자동 분석·분류·정리해주는 캡처 오거나이저',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <CapturesProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:ml-60">
              {children}
            </main>
          </div>
        </CapturesProvider>
      </body>
    </html>
  );
}
