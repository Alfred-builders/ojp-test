import { Header } from "@/components/dashboard/header";

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function PageWrapper({ title, children, headerActions }: PageWrapperProps) {
  return (
    <>
      <Header title={title}>{headerActions}</Header>
      <div className="flex-1 p-6">{children}</div>
    </>
  );
}
