import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-6">
      <SidebarTrigger />
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
