import { redirect } from "next/navigation";

export default async function CommandeDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/ventes/${id}`);
}
