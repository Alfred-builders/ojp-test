"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import DOMPurify from "dompurify";
import {
  EnvelopeSimple,
  FloppyDisk,
  PaperPlaneTilt,
  Copy,
  Check,
  BellRinging,
  Bell,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/supabase/mutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailTemplate } from "@/types/email";

interface EmailTemplatesTabProps {
  templates: EmailTemplate[];
}

interface NavCategory {
  label: string;
  icon: React.ReactNode;
  templates: EmailTemplate[];
}

export function EmailTemplatesTab({ templates: initialTemplates }: EmailTemplatesTabProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeId, setActiveId] = useState(templates[0]?.id ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  const clientTemplates = templates.filter((t) => t.category === "client");
  const interneTemplates = templates.filter((t) => t.category === "interne");

  const categories: NavCategory[] = [
    {
      label: "Notifications client",
      icon: <EnvelopeSimple size={14} weight="duotone" />,
      templates: clientTemplates,
    },
    {
      label: "Notifications internes",
      icon: <BellRinging size={14} weight="duotone" />,
      templates: interneTemplates,
    },
  ];

  function scrollTo(id: string) {
    setActiveId(id);
    const el = document.getElementById(`tpl-${id}`);
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const offset = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }
  }

  function handleUpdate(updated: EmailTemplate) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  return (
    <div className="flex gap-0 h-[calc(100dvh-var(--header-height,64px)-120px)] min-h-[400px]">
      {/* Navigation latérale */}
      <div className="w-56 shrink-0 border-r">
        <nav className="space-y-4 overflow-y-auto pr-4 pt-0 h-full">
          {categories.map((cat) => (
            <div key={cat.label} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {cat.label}
              </p>
              {cat.templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => scrollTo(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors text-left",
                    activeId === t.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {t.is_active ? (
                    <Bell size={14} weight="duotone" className="shrink-0 text-muted-foreground" />
                  ) : (
                    <Bell size={14} weight="duotone" className="shrink-0 text-muted-foreground/40" />
                  )}
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>

      {/* Contenu scrollable */}
      <div ref={scrollRef} className="min-w-0 flex-1 scroll-smooth pl-6">
        <div className="pb-32 space-y-8">
          {templates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <EnvelopeSimple size={40} weight="duotone" className="text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Aucun template email configuré.</p>
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} id={`tpl-${t.id}`} className="mx-auto max-w-2xl scroll-mt-4">
              <TemplateEditor
                template={t}
                onUpdate={handleUpdate}
                onActiveChange={() => setActiveId(t.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tag-aware textarea ──────────────────────────────────────────

// const VAR_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Renders text with {{variables}} as visual tags inside a contentEditable div.
 * Variables are rendered as atomic spans that delete as a whole unit.
 */
function TagTextarea({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Convert plain text with {{vars}} to HTML with tag spans
  const toHtml = useCallback((text: string) => {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escaped
      .replace(
        /\{\{(\w+)\}\}/g,
        '<span contenteditable="false" data-variable="$1" class="variable-tag">$1</span>'
      )
      .replace(/\n/g, "<br>");
  }, []);

  // Convert HTML back to plain text with {{vars}}
  const toPlainText = useCallback((el: HTMLElement): string => {
    let text = "";
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent ?? "";
      } else if (node.nodeName === "BR") {
        text += "\n";
      } else if (node instanceof HTMLElement) {
        const varName = node.getAttribute("data-variable");
        if (varName) {
          text += `{{${varName}}}`;
        } else {
          text += toPlainText(node);
        }
      }
    }
    return text;
  }, []);

  // Initialize content
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = DOMPurify.sanitize(toHtml(value), {
        ALLOWED_TAGS: ["span", "br"],
        ALLOWED_ATTR: ["contenteditable", "data-variable", "class"],
      });
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput() {
    if (isComposing.current || !editorRef.current) return;
    const plain = toPlainText(editorRef.current);
    onChange(plain);
  }

  return (
    <div
      ref={editorRef}
      id={id}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => {
        isComposing.current = false;
        handleInput();
      }}
      className={cn(
        "min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "whitespace-pre-wrap break-words font-mono leading-relaxed",
        "[&_.variable-tag]:inline-flex [&_.variable-tag]:items-center [&_.variable-tag]:rounded [&_.variable-tag]:bg-foreground [&_.variable-tag]:text-background [&_.variable-tag]:px-1.5 [&_.variable-tag]:py-0.5 [&_.variable-tag]:text-xs [&_.variable-tag]:font-semibold [&_.variable-tag]:mx-0.5 [&_.variable-tag]:select-all [&_.variable-tag]:cursor-default"
      )}
    />
  );
}

// ── Template Editor ─────────────────────────────────────────────

function TemplateEditor({
  template,
  onUpdate,
  onActiveChange,
}: {
  template: EmailTemplate;
  onUpdate: (template: EmailTemplate) => void;
  onActiveChange: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [isActive, setIsActive] = useState(template.is_active);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("email_templates")
      .update({ subject, body, is_active: isActive })
      .eq("id", template.id);

    if (updateError) {
      toast.error("Erreur lors de la sauvegarde", { description: updateError.message });
    } else {
      toast.success("Template sauvegardé");
      onUpdate({ ...template, subject, body, is_active: isActive });
    }
    setSaving(false);
  }

  async function handleSendTest() {
    setSending(true);

    const supabase = createClient();
    const { error: saveError } = await mutate(
      supabase
        .from("email_templates")
        .update({ subject, body, is_active: isActive })
        .eq("id", template.id),
      "Erreur lors de la sauvegarde avant envoi"
    );
    if (saveError) { setSending(false); return; }

    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_type: template.notification_type,
          test: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Email de test envoyé !");
        onUpdate({ ...template, subject, body, is_active: isActive });
      } else {
        toast.error("Erreur lors de l'envoi", { description: data.error });
      }
    } catch {
      toast.error("Erreur réseau", { description: "Impossible de contacter le serveur." });
    }

    setSending(false);
  }

  function copyVariable(varKey: string) {
    const text = `{{${varKey}}}`;
    navigator.clipboard.writeText(text);
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  }

  const categoryIcon = template.category === "client"
    ? <EnvelopeSimple size={20} weight="duotone" />
    : <BellRinging size={20} weight="duotone" />;

  return (
    <Card onFocus={onActiveChange}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {categoryIcon}
          {template.label}
        </CardTitle>
        <CardDescription>
          {template.category === "client"
            ? "Email envoyé au client"
            : "Email envoyé à l'équipe OJP"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Label htmlFor={`active-${template.id}`} className="text-sm font-medium">
            Notification active
          </Label>
          <Switch
            id={`active-${template.id}`}
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`subject-${template.id}`}>Objet</Label>
          <Input
            id={`subject-${template.id}`}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Corps du message</Label>
          <TagTextarea
            id={`body-${template.id}`}
            value={body}
            onChange={setBody}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Variables disponibles (cliquer pour copier)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {template.available_variables.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.description}
                onClick={() => copyVariable(v.key)}
                className="inline-flex items-center gap-1 rounded bg-foreground px-2 py-1 text-xs font-semibold text-background transition-opacity hover:opacity-80"
              >
                {copiedVar === v.key ? (
                  <Check size={12} weight="bold" />
                ) : (
                  <Copy size={12} weight="bold" />
                )}
                {v.key}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={handleSave} disabled={saving}>
          <FloppyDisk size={16} weight="duotone" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button variant="outline" onClick={handleSendTest} disabled={sending}>
          <PaperPlaneTilt size={16} weight="duotone" />
          {sending ? "Envoi..." : "Envoyer un test"}
        </Button>
      </CardFooter>
    </Card>
  );
}
