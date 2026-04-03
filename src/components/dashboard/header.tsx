import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
  backAction?: React.ReactNode;
}

export function Header({ title, children, backAction }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
      <SidebarTrigger />
      {backAction}
      <h1 className="text-lg font-semibold">{title}</h1>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </header>
  );
}
