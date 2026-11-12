import { requireAccess } from "@/lib/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav, MobileTopBar } from "@/components/shell/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAccess();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1600px] gap-6 p-4 lg:p-4">
      <Sidebar role={profile.role} name={profile.name} />
      <main className="min-w-0 flex-1 pb-28 lg:py-4 lg:pb-8 lg:pr-4">
        <MobileTopBar role={profile.role} name={profile.name} />
        {children}
      </main>
      <BottomNav role={profile.role} name={profile.name} />
    </div>
  );
}
