"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary mt-1.5 justify-center",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (
        <>
          <Icon name="loader-circle" className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
