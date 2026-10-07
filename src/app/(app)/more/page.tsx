import Link from "next/link";
import { logout } from "@/app/logout/actions";
import { Icon } from "@/components/icon";
import { Card } from "@/components/primitives";
import { moreNavigation } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayNameOf, getCurrentProfile } from "@/lib/queries/profile";

export default async function MorePage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">KHÔNG GIAN CỦA BẠN</p><h1>Thêm</h1><p>Tính năng nâng cao và cài đặt tài khoản.</p></div></header>
      <Card className="divide-y divide-divider p-0">
        {moreNavigation.slice(0, 3).map((item) => <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-3 px-4 text-text hover:bg-surface-subtle"><Icon name={item.icon} className="h-5 w-5 text-primary" /><span className="flex-1 font-semibold">{item.label}</span><Icon name="chevron-right" className="h-5 w-5 text-neutral-600" /></Link>)}
      </Card>
      <Card id="account" className="space-y-4"><div><p className="eyebrow">TÀI KHOẢN</p><h2 className="mt-1 text-xl">{profile ? displayNameOf(profile) : "Tài khoản Hũ"}</h2></div><div className="flex flex-wrap gap-2"><Link href="/?tour=1" className="btn btn-secondary">Xem lại hướng dẫn</Link><form action={logout}><button type="submit" className="btn btn-ghost text-destructive">Đăng xuất</button></form></div></Card>
    </div>
  );
}
