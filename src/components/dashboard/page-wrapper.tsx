import { Header } from "@/components/dashboard/header";

interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  backAction?: React.ReactNode;
  fullHeight?: boolean;
  noPadding?: boolean;
}

export function PageWrapper({ title, children, headerActions, backAction, fullHeight, noPadding }: PageWrapperProps) {
  return (
    <>
      <Header title={title} backAction={backAction}>{headerActions}</Header>
      <div className={fullHeight ? `relative flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden${noPadding ? "" : " px-6 pt-4 pb-4"}` : "flex-1 overflow-y-auto min-w-0 px-6 pt-6 pb-8"}>
        {children}
      </div>
    </>
  );
}
