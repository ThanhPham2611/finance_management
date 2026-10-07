"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatDrawer } from "@/components/chat-drawer";
import { Icon } from "@/components/icon";
import { logout } from "@/app/logout/actions";
import { desktopNavigation, mobileNavigation, type NavigationItem } from "@/lib/navigation";
import { displayNameOf, initialOf, type CurrentProfile } from "@/lib/queries/profile";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]);
}

const TAKEOVER_PATHS = ["/transactions/new", "/jars/new"];

export function AppShell({ children, profile }: { children: React.ReactNode; profile: CurrentProfile | null }) {
  const pathname = usePathname();
  const takeover = TAKEOVER_PATHS.some((path) => pathname.startsWith(path));

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-divider bg-surface px-3 py-5 md:flex">
        <Link href="/" className="mb-7 flex items-center gap-3 px-3 text-text no-underline" aria-label="Hũ — về tổng quan">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-primary font-heading text-xl font-extrabold text-on-primary">H</span>
          <span><span className="block font-heading text-xl font-extrabold">Hũ</span><span className="block text-xs text-neutral-700">Tiền rõ ràng, lòng nhẹ tênh</span></span>
        </Link>
        <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
          {desktopNavigation.map((item) => <DesktopLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
        </nav>
        <div className="mt-auto rounded-card border border-divider bg-bg p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary">{profile ? initialOf(profile) : "?"}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{profile ? displayNameOf(profile) : "Chưa đăng nhập"}</p><Link href="/?tour=1" className="text-xs text-neutral-700 hover:text-primary">Xem lại hướng dẫn</Link></div>
            <form action={logout}><button type="submit" aria-label="Đăng xuất" className="icon-button"><Icon name="log-out" className="h-4 w-4" /></button></form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {!takeover && <header className="sticky top-0 z-10 flex h-14 items-center border-b border-divider bg-bg/95 px-4 backdrop-blur md:hidden"><Link href="/" className="font-heading text-xl font-extrabold text-text">Hũ<span className="text-accent">.</span></Link></header>}
        <main className={takeover ? "min-h-screen" : "min-h-screen pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0"}>{children}</main>
        {!takeover && (
          <>
            <Link data-tour="add-transaction-mobile" href="/transactions/new" aria-label="Thêm giao dịch" className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-30 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-primary text-on-primary shadow-lg md:hidden"><Icon name="plus" className="h-6 w-6" /></Link>
            <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(68px+env(safe-area-inset-bottom))] grid-cols-5 border-t border-divider bg-surface px-1 pb-[env(safe-area-inset-bottom)] md:hidden">
              {mobileNavigation.map((item) => <MobileLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}
            </nav>
          </>
        )}
      </div>
      <ChatDrawer />
    </div>
  );
}

function DesktopLink({ item, active }: { item: NavigationItem; active: boolean }) {
  return <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-[15px] font-semibold transition-colors ${active ? "bg-primary text-on-primary" : "text-neutral-800 hover:bg-surface-subtle hover:text-text"}`}><Icon name={item.icon} className="h-[18px] w-[18px]" />{item.label}</Link>;
}

function MobileLink({ item, active }: { item: NavigationItem; active: boolean }) {
  return <Link href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold ${active ? "text-primary" : "text-neutral-700"}`}><Icon name={item.icon} className="h-5 w-5" /><span>{item.label}</span></Link>;
}
