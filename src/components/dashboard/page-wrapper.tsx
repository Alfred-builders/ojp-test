import { Header } from "@/components/dashboard/header";

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  backAction?: React.ReactNode;
  fullHeight?: boolean;
}

export function PageWrapper({ title, children, headerActions, backAction, fullHeight }: PageWrapperProps) {
  return (
    <>
      <Header title={title} backAction={backAction}>{headerActions}</Header>
      <div className={fullHeight ? "flex-1 flex flex-col overflow-hidden p-6" : "flex-1 overflow-y-auto p-6"}>
        {children}
      </div>
    </>
  );
}
