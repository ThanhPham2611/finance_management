import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listPendingInvitesToMe, listSharesAcceptedToMe, listMyOutgoingShares } from "@/lib/queries/shares";
import { SharedClient } from "@/components/shared-client";

export default async function SharedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [incoming, accepted, outgoing] = await Promise.all([
    listPendingInvitesToMe(supabase, user.id),
    listSharesAcceptedToMe(supabase, user.id),
    listMyOutgoingShares(supabase, user.id),
  ]);

  return <SharedClient incoming={incoming} accepted={accepted} outgoing={outgoing} />;
}
