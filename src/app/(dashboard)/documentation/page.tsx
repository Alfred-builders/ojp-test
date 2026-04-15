import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { DocumentationPage } from "@/components/documentation/documentation-page";

export default function DocumentationRoute() {
  return (
    <PageWrapper title="Documentation" fullHeight noPadding>
      <DocumentationPage />
    </PageWrapper>
  );
}
