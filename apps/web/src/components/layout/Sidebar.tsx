'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Home, MapPin, FileText, Map, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: '홈', icon: Home, description: '전체 캡처' },
  { href: '/places', label: '장소', icon: MapPin, description: '맛집·카페·여행지' },
  { href: '/texts', label: '텍스트', icon: FileText, description: 'AI·코드·레시피' },
  { href: '/map', label: '지도', icon: Map, description: '저장 장소 지도' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-surface border-r border-border">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-primary">Scrave</h1>
          <p className="text-sm text-text-secondary mt-1">AI 캡처 오거나이저</p>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
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
                <Icon size={18} />
                <div>
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className="text-xs text-text-tertiary">{item.description}</div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              pathname.startsWith('/settings')
                ? 'bg-surface-elevated text-primary'
                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <Settings size={18} />
            <span className="font-semibold text-sm">설정</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-tertiary hover:bg-surface-elevated hover:text-text-secondary text-sm font-medium text-left transition-colors"
          >
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-4 ${
                  isActive ? 'text-primary' : 'text-text-tertiary'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-xs mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
