import { redirect } from "next/navigation";

export default async function BonLivraisonRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/fonderie/suivi/bdl/${id}`);
}
