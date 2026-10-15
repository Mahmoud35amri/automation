"use client";

import { BUTTON, Command } from "@/components/ui";

type ErrorPageProps = { error: Error & { digest?: string }; retry: () => void };

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  return (
    <div className="animate-rise mx-auto max-w-xl py-16 text-center">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-brick">Backend injoignable</p>
      <h1 className="mt-4 font-display text-4xl font-light text-ink">Les données n&apos;ont pas pu être chargées</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        L&apos;interface lit tout depuis l&apos;API FastAPI (BACKEND_URL). Vérifiez qu&apos;elle tourne, à la racine du dépôt :
      </p>
      <Command>uvicorn app.main:app --port 8000</Command>
      {error.digest && <p className="mt-4 font-mono text-xs text-muted">Réf. {error.digest}</p>}
      <div className="mt-8">
        <button type="button" onClick={retry} className={BUTTON.primary}>
          Réessayer
        </button>
      </div>
    </div>
  );
}
