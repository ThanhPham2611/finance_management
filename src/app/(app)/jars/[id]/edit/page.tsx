import { notFound, redirect } from "next/navigation";
import { JarEditForm } from "@/components/jar-edit-form";
import { createClient } from "@/lib/supabase/server";
import { getJarWithSpent } from "@/lib/queries/jars";

export default async function EditJarPage({ params }: PageProps<"/jars/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jar = await getJarWithSpent(supabase, id);
  if (!jar) notFound();

  return <JarEditForm jar={jar} />;
}
