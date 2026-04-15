import { redirect } from "next/navigation";

export default async function BonCommandeRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/fonderie/suivi/bdc/${id}`);
}
