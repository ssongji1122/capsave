'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { Home, MapPin, FileText, Map, Compass, Settings, LogOut } from 'lucide-react';

const BRAND_MARK_COLOR = '#F2622E';

const navItems = [
  { href: '/dashboard', label: '홈', icon: Home, description: '전체 캡처' },
  { href: '/places', label: '장소', icon: MapPin, description: '맛집·카페·여행지' },
  { href: '/guides', label: '가이드', icon: Compass, description: '여행 동선 노트' },
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
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-text-primary">
            <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true">
              <path fill={BRAND_MARK_COLOR} d="M28 22c10-12 30-12 38 0 14-6 28 6 24 22 10 10 6 30-10 34-4 12-22 16-32 8-12 8-30 2-32-12C2 66 0 46 12 40c-2-8 6-16 16-18z" />
              <ellipse cx="44" cy="46" rx="3.5" ry="4.5" fill="currentColor" />
              <ellipse cx="56" cy="46" rx="3.5" ry="4.5" fill="currentColor" />
            </svg>
            scrave
          </h1>
          <p className="text-xs text-text-secondary mt-1.5">scrap, save your crave</p>
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
                className={`flex flex-col items-center py-1 px-3 ${
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
