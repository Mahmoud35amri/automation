import Link from "next/link";
import { BUTTON } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="animate-rise mx-auto max-w-xl py-16 text-center">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">404</p>
      <h1 className="mt-4 font-display text-4xl font-light text-ink">Ce dossier n&apos;existe pas</h1>
      <p className="mt-4 text-sm text-muted">Le tender a peut-être été supprimé du backend.</p>
      <div className="mt-8">
        <Link href="/" className={BUTTON.primary}>
          Retour au pipeline
        </Link>
      </div>
    </div>
  );
}
