import { triggerProposal, triggerResearch } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";
import { ArrowRightIcon, SparkIcon } from "@/components/icons";
import { BUTTON } from "@/components/ui";
import type { TenderStatus } from "@/lib/backend";
import type { ReactNode } from "react";

type NextStepProps = { tenderId: number; status: TenderStatus };

function Working({ title, children, retry }: { title: string; children: string; retry: ReactNode }) {
  return (
    <>
      <p className="font-display text-2xl">{title}</p>
      <div className="relative mt-5 h-0.5 overflow-hidden rounded-full bg-paper/15" aria-hidden="true">
        <span className="absolute inset-y-0 w-1/3 animate-sweep rounded-full bg-amber" />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-paper/70">{children}</p>
      <p className="mt-3 text-xs leading-relaxed text-paper/50">
        La page se met à jour seule. Si rien ne bouge, vérifiez que l&apos;agent olivesoft-rfp tourne et que ses clés API sont définies.
      </p>
      <div className="mt-5">{retry}</div>
    </>
  );
}

// Le bon déclencheur du backend selon l'étape : trigger-research, puis trigger-proposal.
export function NextStep({ tenderId, status }: NextStepProps) {
  const research = triggerResearch.bind(null, tenderId);
  const proposal = triggerProposal.bind(null, tenderId);

  return (
    <div className="animate-rise rounded-sm bg-ink p-6 text-paper shadow-[0_24px_48px_-30px_rgba(28,31,39,0.9)]">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-amber">Prochaine étape</p>
      <div className="mt-3">
        {status === "RESEARCHING" && (
          <Working title="Recherche prospect en cours" retry={<ActionForm action={research} label="Relancer la recherche" pendingLabel="Envoi…" variant="ghost" />}>
            L&apos;agent interroge le web (organisme, marché, budget) puis synthétise un profil prospect.
          </Working>
        )}
        {status === "GENERATING_PROPOSAL" && (
          <Working title="Rédaction en cours" retry={<ActionForm action={proposal} label="Relancer la rédaction" pendingLabel="Envoi…" variant="ghost" />}>
            Recherche des projets et profils OliveSoft pertinents, rédaction structurée, puis export .pptx.
          </Working>
        )}
        {(status === "DETECTED" || status === "FAILED") && (
          <>
            <p className="font-display text-2xl">{status === "FAILED" ? "L'étape précédente a échoué" : "Qualifier le prospect"}</p>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">
              Secteur, budget estimé et partenaires clés de l&apos;acheteur, à partir de recherches web.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <ActionForm action={research} label="Lancer la recherche prospect" pendingLabel="Envoi à l'agent…" variant="accent" icon={<SparkIcon />} />
              {status === "FAILED" && <ActionForm action={proposal} label="Rédiger la proposition" pendingLabel="Envoi à l'agent…" variant="ghost" />}
            </div>
          </>
        )}
        {status === "RESEARCHED" && (
          <>
            <p className="font-display text-2xl">Rédiger la proposition</p>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">
              Références et profils OliveSoft retenus par le RAG, argumentaire honnête sur les écarts, export .pptx.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <ActionForm action={proposal} label="Générer la proposition" pendingLabel="Envoi à l'agent…" variant="accent" icon={<SparkIcon />} />
              <ActionForm action={research} label="Refaire la recherche" pendingLabel="Envoi…" variant="ghost" />
            </div>
          </>
        )}
        {status === "PROPOSAL_READY" && (
          <>
            <p className="font-display text-2xl">Proposition prête</p>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">Relisez-la, ajustez le texte puis téléchargez le .pptx.</p>
            <div className="mt-5 flex flex-col gap-2">
              <a href="#proposition" className={`${BUTTON.accent} w-full`}>
                Relire la proposition <ArrowRightIcon />
              </a>
              <ActionForm action={proposal} label="Générer une nouvelle version" pendingLabel="Envoi à l'agent…" variant="ghost" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
