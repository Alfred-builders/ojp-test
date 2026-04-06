"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Factory,
  FloppyDisk,
  MapPin,
  NotePencil,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Header } from "@/components/dashboard/header";

export default function NewFonderiePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  async function handleCreate() {
    if (!nom.trim()) {
      setError("Le nom est obligatoire");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from("fonderies")
      .insert({
        nom: nom.trim(),
        adresse: adresse || null,
        code_postal: codePostal || null,
        ville: ville || null,
        telephone: telephone || null,
        email: email || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    setSaving(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }
    router.push(`/fonderies/${data.id}`);
  }

  return (
    <>
      <Header
        title="Nouvelle fonderie"
        backAction={
          <Link href="/fonderies">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft size={16} weight="regular" />
            </Button>
          </Link>
        }
      >
        <Button size="sm" disabled={saving} onClick={handleCreate}>
          <FloppyDisk size={16} weight="duotone" />
          {saving ? "Création..." : "Créer"}
        </Button>
      </Header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory size={20} weight="duotone" />
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="CPoR Devises" />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="01 44 82 64 00" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@fonderie.fr" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={20} weight="duotone" />
                Adresse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Adresse</Label>
                <Input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="4 rue de la Bourse" />
              </div>
              <div className="space-y-1.5">
                <Label>Code postal</Label>
                <Input value={codePostal} onChange={(e) => setCodePostal(e.target.value)} placeholder="75002" />
              </div>
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Paris" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NotePencil size={20} weight="duotone" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur la fonderie..."
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
