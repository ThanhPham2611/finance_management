"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { logout } from "@/app/logout/actions";
import { displayNameOf, initialOf, type CurrentProfile } from "@/lib/queries/profile";
import { ChatDrawer } from "@/components/chat-drawer";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: "layout-dashboard" },
  { href: "/jars", label: "Hũ ngân sách", icon: "wallet" },
  { href: "/allocate", label: "Chia lương", icon: "calculator" },
  { href: "/transactions", label: "Giao dịch", icon: "receipt" },
  { href: "/reports", label: "Báo cáo", icon: "chart-no-axes-column" },
  { href: "/household", label: "Gia đình", icon: "users" },
  { href: "/shared", label: "Chia sẻ", icon: "share-2" },
];

const TAB_ITEMS = [
  { href: "/", label: "Tổng quan", icon: "layout-dashboard" },
  { href: "/jars", label: "Hũ", icon: "wallet" },
  { href: "/allocate", label: "Chia lương", icon: "calculator" },
  { href: "/reports", label: "Báo cáo", icon: "chart-no-axes-column" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Full-screen entry flows: they render their own close (X) and bottom
// action bar, so the persistent tab bar must get out of the way instead
// of stacking on top of them on mobile.
const TAKEOVER_PATHS = ["/transactions/new", "/jars/new"];

function isTakeover(pathname: string) {
  return TAKEOVER_PATHS.some((p) => pathname.startsWith(p));
}

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: CurrentProfile | null;
}) {
  const pathname = usePathname();
  const takeover = isTakeover(pathname);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-[210px] shrink-0 flex-col border-r-2 border-divider py-4.5 md:flex">
        <div className="px-4.5 pb-4.5 font-heading text-[17px] font-extrabold">
          Hũ<span className="text-accent">.</span>
        </div>
        <nav className="flex flex-col">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-4.5 py-2.5 text-[13px]"
                style={active ? { background: "var(--color-accent)", color: "var(--color-bg)" } : undefined}
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 border-t-2 border-divider p-4.5">
          <div className="grid h-7 w-7 place-items-center bg-text text-[11px] font-semibold text-bg">
            {profile ? initialOf(profile) : "?"}
          </div>
          <div className="flex-1 truncate text-[12px]">{profile ? displayNameOf(profile) : "Chưa đăng nhập"}</div>
          <Link href="/?tour=1" aria-label="Xem hướng dẫn lại" className="text-neutral-700 hover:text-accent">
            <Icon name="circle-help" className="h-4 w-4" />
          </Link>
          <form action={logout}>
            <button type="submit" aria-label="Đăng xuất" className="text-neutral-700 hover:text-accent">
              <Icon name="log-out" className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className={takeover ? "flex-1" : "flex-1 pb-[88px] md:pb-0"}>{children}</main>

        {/* Mobile bottom tab bar — hidden during a takeover flow (own bottom action bar) */}
        {!takeover && (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid h-[72px] grid-cols-5 items-center border-t-2 border-divider bg-bg md:hidden">
          {TAB_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
          <div className="grid place-items-center">
            <Link data-tour="add-transaction-mobile" href="/transactions/new" className="grid h-12 w-12 place-items-center bg-accent text-bg">
              <Icon name="plus" className="h-6 w-6" />
            </Link>
          </div>
          {TAB_ITEMS.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
        )}
      </div>

      <ChatDrawer />
    </div>
  );
}

function TabLink({ item, active }: { item: (typeof TAB_ITEMS)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex flex-col items-center gap-1 text-[10px]"
      style={{ color: active ? "var(--color-accent)" : "var(--color-neutral-700)" }}
    >
      <Icon name={item.icon} className="h-[18px] w-[18px]" />
      {item.label}
    </Link>
  );
}
