import { CapturesProvider } from '@/contexts/CapturesContext';
import { GuestCapturesProvider } from '@/contexts/GuestCapturesContext';
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { GuestMigration } from '@/components/auth/GuestMigration';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserPreferencesProvider>
      <CapturesProvider>
        <GuestCapturesProvider>
          <GuestMigration />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 lg:ml-60">
              {children}
            </main>
          </div>
        </GuestCapturesProvider>
      </CapturesProvider>
    </UserPreferencesProvider>
  );
}
