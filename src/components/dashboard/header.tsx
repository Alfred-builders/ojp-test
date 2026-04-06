import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SearchTrigger } from "@/components/dashboard/search-trigger";

interface HeaderProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  backAction?: React.ReactNode;
}

export function Header({ title, children, backAction }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 shadow-sm bg-white dark:bg-card px-6">
      <SidebarTrigger />
      {backAction}
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <SearchTrigger />
        <NotificationBell />
      </div>
    </header>
  );
}
