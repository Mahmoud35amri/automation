"use client";

import { useState, useTransition } from "react";
import { saveProposal } from "@/app/actions";
import type { ProposalSection } from "@/lib/pptx";
import { DownloadIcon, PencilIcon } from "./icons";
import { BUTTON, INPUT } from "./ui";

type Item = { heading: string; text: string };

type ProposalDocumentProps = {
  tenderId: number;
  proposalId: number;
  version: number;
  updated: string;
  sections: ProposalSection[];
  downloadUrl: string | null;
};

export function ProposalDocument({ tenderId, proposalId, version, updated, sections, downloadUrl }: ProposalDocumentProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sections);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const updateSection = (index: number, patch: Partial<ProposalSection>) =>
    setDraft((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const updateItem = (index: number, itemIndex: number, patch: Partial<Item>) =>
    setDraft((current) =>
      current.map((s, i) =>
        i === index ? { ...s, items: s.items?.map((it, j) => (j === itemIndex ? { ...it, ...patch } : it)) } : s,
      ),
    );

  const save = () =>
    startSaving(async () => {
      const result = await saveProposal(tenderId, proposalId, draft);
      setError(result.error);
      if (!result.error) setEditing(false);
    });

  const cancel = () => {
    setDraft(sections);
    setError(null);
    setEditing(false);
  };

  const shown = editing ? draft : sections;

  return (
    <article className="rounded-sm border border-line bg-card shadow-[0_1px_0_var(--color-line),0_18px_40px_-28px_rgba(28,31,39,0.35)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-6 py-4 text-paper">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-amber">Proposition commerciale · v{version}</p>
          <p className="mt-1 text-xs text-paper/60">Mise à jour {updated}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button type="button" onClick={cancel} disabled={saving} className="rounded-sm px-3 py-2 text-sm text-paper/70 hover:text-paper">
                Annuler
              </button>
              <button type="button" onClick={save} disabled={saving} className={BUTTON.accent}>
                {saving ? "Enregistrement…" : "Enregistrer et régénérer le .pptx"}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-sm border border-paper/20 px-3 py-2 text-sm hover:border-paper/60">
                <PencilIcon /> Relire et modifier
              </button>
              {downloadUrl && (
                <a href={downloadUrl} className="inline-flex items-center gap-2 rounded-sm bg-amber px-3 py-2 text-sm font-medium text-ink hover:bg-amber/90">
                  <DownloadIcon /> Télécharger .pptx
                </a>
              )}
            </>
          )}
        </div>
      </header>

      {error && <p role="alert" className="border-b border-line bg-brick/5 px-6 py-3 text-sm text-brick">{error}</p>}

      <div className="divide-y divide-line">
        {shown.map((section, si) => (
          <section key={si} className="grid gap-4 px-6 py-6 md:grid-cols-[3rem_1fr]">
            <span className="font-display text-3xl leading-none text-amber-deep/80 tabular-nums">{String(section.number).padStart(2, "0")}</span>
            <div className="min-w-0">
              {editing ? (
                <input aria-label="Titre de section" className={`${INPUT} font-display text-lg`} value={section.title} onChange={(e) => updateSection(si, { title: e.target.value })} />
              ) : (
                <h3 className="font-display text-xl text-ink">{section.title}</h3>
              )}

              {section.body !== undefined &&
                (editing ? (
                  <textarea aria-label={`Texte — ${section.title}`} className={`${INPUT} mt-3 min-h-28 leading-relaxed field-sizing-content`} value={section.body} onChange={(e) => updateSection(si, { body: e.target.value })} />
                ) : (
                  <p className="mt-2 whitespace-pre-line text-[0.95rem] leading-relaxed text-text">{section.body}</p>
                ))}

              {section.items?.map((item, ii) => (
                <div key={ii} className="mt-4 border-l-2 border-amber pl-4">
                  {editing ? (
                    <>
                      <input aria-label="Intitulé" className={`${INPUT} font-medium`} value={item.heading} onChange={(e) => updateItem(si, ii, { heading: e.target.value })} />
                      <textarea aria-label={`Texte — ${item.heading}`} className={`${INPUT} mt-2 min-h-20 leading-relaxed field-sizing-content`} value={item.text} onChange={(e) => updateItem(si, ii, { text: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-ink">{item.heading}</p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{item.text}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
