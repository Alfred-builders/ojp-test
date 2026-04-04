import { getParametres } from "@/lib/parametres";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ParametresForm } from "@/components/parametres/parametres-form";

export default async function ParametresPage() {
  const parametres = await getParametres();

  return (
    <PageWrapper title="Paramètres">
      <ParametresForm parametres={parametres} />
    </PageWrapper>
  );
}
