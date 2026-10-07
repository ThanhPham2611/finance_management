import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Icon } from "@/components/icon";
import { formatVND } from "@/lib/format";

function join(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Button({ variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "destructive" }) {
  return <button className={join("btn", variant === "destructive" ? "btn-destructive" : `btn-${variant}`, className)} {...props} />;
}

export function IconButton({ label, icon, className, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { label: string; icon: string }) {
  return <button type="button" aria-label={label} title={label} className={join("icon-button", className)} {...props}><Icon name={icon} className="h-5 w-5" /></button>;
}

export function Input({ label, error, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return <label className="field block"><span>{label}</span><input className={join("input", error && "border-destructive", className)} aria-invalid={Boolean(error)} {...props} />{error ? <span className="mt-1 block text-sm text-destructive" role="alert">{error}</span> : hint ? <span className="mt-1 block text-sm text-neutral-700">{hint}</span> : null}</label>;
}

export function Select({ label, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="field block"><span>{label}</span><select className={join("input", className)} {...props}>{children}</select></label>;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={join("rounded-card border border-divider bg-surface p-4 shadow-sm", className)} {...props} />;
}

export function Amount({ value, tone = "default", className = "" }: { value: number; tone?: "default" | "success" | "danger"; className?: string }) {
  return <span className={join("font-heading text-3xl font-extrabold tabular-nums", tone === "success" && "text-success", tone === "danger" && "text-destructive", className)}>{formatVND(value)} <span className="text-base font-semibold text-neutral-700">₫</span></span>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return <span className={join("inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold", tone === "neutral" && "bg-surface-subtle text-neutral-800", tone === "success" && "bg-[#E5EEE9] text-success", tone === "warning" && "bg-accent-100 text-accent-700", tone === "danger" && "bg-[#FDECEA] text-destructive")}>{children}</span>;
}

export function EmptyState({ icon, title, message, action }: { icon: string; title: string; message: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-divider bg-surface px-5 py-12 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-surface-subtle text-neutral-700"><Icon name={icon} className="h-6 w-6" /></span><div><h2 className="text-xl">{title}</h2><p className="mt-1 max-w-sm text-neutral-700">{message}</p></div>{action}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={join("block animate-pulse rounded-control bg-neutral-200", className)} />;
}

export function FormError({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-control border border-destructive/30 bg-[#FDECEA] px-3 py-2.5 text-sm text-destructive">{children}</div>;
}

export function Toast({ children, tone = "status" }: { children: ReactNode; tone?: "status" | "error" }) {
  return <div role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className={join("rounded-control border bg-surface px-4 py-3 shadow-md", tone === "error" ? "border-destructive text-destructive" : "border-divider text-text")}>{children}</div>;
}
