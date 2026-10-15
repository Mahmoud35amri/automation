"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions";
import { BUTTON } from "./ui";

type ActionFormProps = {
  action: () => Promise<FormState>;
  label: string;
  pendingLabel: string;
  icon?: ReactNode;
  variant?: keyof typeof BUTTON;
};

export function ActionForm({ action, label, pendingLabel, icon, variant = "primary" }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="w-full">
      <button type="submit" disabled={pending} className={`${BUTTON[variant]} w-full`}>
        {icon}
        {pending ? pendingLabel : label}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-brick">
          {state.error}
        </p>
      )}
    </form>
  );
}
