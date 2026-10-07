import Link from "next/link";
import type { ReactNode } from "react";
import { FormError } from "@/components/primitives";

export function AuthShell({ title, subtitle, error, children, alternate }: { title: string; subtitle: string; error?: string; children: ReactNode; alternate: { prompt: string; href: string; label: string } }) {
  return (
    <main className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
      <section className="relative hidden overflow-hidden bg-primary p-12 text-on-primary lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 font-heading text-2xl font-extrabold">Hũ<span className="text-[#E6AE65]">.</span></div>
        <div className="relative z-10 max-w-xl"><p className="mb-5 text-sm font-bold tracking-[.14em] text-[#BFD8CC]">MỖI KHOẢN TIỀN ĐỀU CÓ CHỖ CỦA NÓ</p><h1 className="text-5xl leading-[1.12]">Nhìn rõ hôm nay.<br />An tâm cho ngày mai.</h1><p className="mt-6 max-w-md text-lg text-[#D8E6DF]">Chia thu nhập thành những chiếc hũ có mục đích, theo dõi nhịp chi tiêu và cùng gia đình giữ kế hoạch.</p></div>
        <div aria-hidden="true" className="relative z-10 grid max-w-lg grid-cols-3 gap-3"><LedgerTile label="Sinh hoạt" value="42%" /><LedgerTile label="Tương lai" value="28%" /><LedgerTile label="Tận hưởng" value="18%" /></div>
        <div aria-hidden="true" className="absolute -right-28 -top-28 h-96 w-96 rounded-full border-[72px] border-white/5" />
      </section>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-flex items-center gap-2 font-heading text-2xl font-extrabold text-text lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-[14px] bg-primary text-on-primary">H</span>Hũ</Link>
          <p className="eyebrow">CHÀO MỪNG ĐẾN VỚI HŨ</p><h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1><p className="mt-2 text-neutral-700">{subtitle}</p>
          {error ? <div className="mt-6"><FormError>{error}</FormError></div> : null}
          <div className="mt-7">{children}</div>
          <p className="mt-7 text-center text-neutral-700">{alternate.prompt} <Link href={alternate.href} className="font-bold text-primary hover:underline">{alternate.label}</Link></p>
        </div>
      </section>
    </main>
  );
}

function LedgerTile({ label, value }: { label: string; value: string }) {
  return <div className="rounded-card border border-white/15 bg-white/10 p-4 backdrop-blur"><p className="text-sm text-[#CFE0D8]">{label}</p><p className="mt-2 font-heading text-2xl font-extrabold">{value}</p></div>;
}
