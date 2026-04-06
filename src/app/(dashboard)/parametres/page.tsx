import { getParametres } from "@/lib/parametres";
import { getAllSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { PageWrapper } from "@/components/dashboard/page-wrapper";
import { ParametresForm } from "@/components/parametres/parametres-form";
import type { EmailTemplate } from "@/types/email";
import type { SettingsMap } from "@/types/settings";

async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_templates")
    .select("*")
    .order("category")
    .order("notification_type");
  return (data as EmailTemplate[]) ?? [];
}

export default async function ParametresPage() {
  const [parametres, emailTemplates, settings] = await Promise.all([
    getParametres(),
    getEmailTemplates(),
    getAllSettings() as Promise<SettingsMap>,
  ]);

  return (
    <PageWrapper title="Paramètres" fullHeight>
      <ParametresForm
        parametres={parametres}
        emailTemplates={emailTemplates}
        settings={settings}
      />
    </PageWrapper>
  );
}
