import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);

  // Phong ve: neu proxy khong chan duoc (cache stale, matcher bo sot, ...)
  // thi layout nay van khong duoc render dashboard cho nguoi chua dang nhap.
  if (!profile) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
