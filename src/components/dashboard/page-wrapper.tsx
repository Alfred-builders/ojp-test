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
      <div className={fullHeight ? "flex-1 flex flex-col min-w-0 px-6 pt-6 pb-8 overflow-hidden" : "flex-1 min-w-0 px-6 pt-6 pb-8"}>
        {children}
      </div>
    </>
  );
}
