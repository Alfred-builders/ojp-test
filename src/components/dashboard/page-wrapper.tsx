import { Header } from "@/components/dashboard/header";

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
}

export function PageWrapper({ title, children }: PageWrapperProps) {
  return (
    <>
      <Header title={title} />
      <div className="flex-1 p-6">{children}</div>
    </>
  );
}
