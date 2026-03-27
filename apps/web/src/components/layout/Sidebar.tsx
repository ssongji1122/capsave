'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '홈', icon: '🏠', description: '전체 캡처' },
  { href: '/places', label: '장소', icon: '📍', description: '맛집·카페·여행지' },
  { href: '/texts', label: '텍스트', icon: '📝', description: 'AI·코드·레시피' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-surface border-r border-border">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-primary">CapSave</h1>
          <p className="text-sm text-text-secondary mt-1">AI 캡처 오거나이저</p>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${
                  isActive
                    ? 'bg-surface-elevated text-primary'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className="text-xs text-text-tertiary">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-4 ${
                  isActive ? 'text-primary' : 'text-text-tertiary'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
