"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/primitives";

export function Dialog({ open, title, children, onClose, sheet = false }: { open: boolean; title: string; children: ReactNode; onClose(): void; sheet?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-labelledby="hu-dialog-title" onClose={onClose} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className={sheet ? "m-0 mt-auto w-full max-w-none rounded-t-sheet border-0 bg-surface p-0 text-text backdrop:bg-text/40 md:m-auto md:max-w-lg md:rounded-sheet" : "w-[min(92vw,34rem)] rounded-sheet border-0 bg-surface p-0 text-text shadow-lg backdrop:bg-text/40"}>
      <div className="flex min-h-14 items-center gap-3 border-b border-divider px-4"><h2 id="hu-dialog-title" className="flex-1 text-xl">{title}</h2><IconButton label="Đóng" icon="x" onClick={onClose} /></div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
