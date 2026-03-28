import { CapturesProvider } from '@/contexts/CapturesContext';
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
        <GuestMigration />
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-60">
            {children}
          </main>
        </div>
      </CapturesProvider>
    </UserPreferencesProvider>
  );
}
