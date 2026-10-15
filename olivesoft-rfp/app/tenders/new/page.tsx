import type { Metadata } from "next";
import { ManualTenderForm, NlpImportForm } from "@/components/NewTenderForms";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nouveau tender" };

export default function NewTenderPage() {
  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Appels d'offres · Ajout"
        title="Nouveau tender"
        lead="Le scraper alimente le pipeline automatiquement depuis les portails publics. Pour un appel d'offres reçu autrement, importez son extraction NLP ou saisissez-le."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <NlpImportForm />
        <ManualTenderForm />
      </div>
    </div>
  );
}
