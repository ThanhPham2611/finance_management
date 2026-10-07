import { describe, expect, it } from "vitest";
import { createShareRequest, getSharedOwnerOverview, getSharesOverview, respondToShare, revokeShare } from "../src/index";
import { fakeClient, type Tables } from "./fake-client";

const NOW = new Date(2026, 9, 5);
const share = (id: string, owner_id: string, viewer_id: string, status: string, created_at: string) => ({ id, owner_id, viewer_id, status, created_at });
const jar = (id: string, user_id: string, over: Record<string, unknown> = {}) => ({ id, user_id, name: id, icon: null, color: "oklch(0.5 0.1 40)", monthly_budget: 1_000_000, is_shared: false, alert_at_80: true, rollover: false, is_savings: false, is_active: true, sort_order: 1, ...over });

function db(): Tables {
  return {
    profiles: [{ id: "me", full_name: "An" }, { id: "bob", full_name: "Bob" }, { id: "carol", full_name: null }, { id: "dave", full_name: "Dave" }],
    expense_shares: [
      share("s1", "bob", "me", "pending", "2026-10-02T00:00:00Z"),
      share("s2", "carol", "me", "accepted", "2026-10-01T00:00:00Z"),
      share("s3", "dave", "me", "declined", "2026-09-30T00:00:00Z"),
      share("s4", "me", "bob", "accepted", "2026-09-01T00:00:00Z"),
      share("s5", "me", "carol", "pending", "2026-09-02T00:00:00Z"),
      share("s6", "me", "dave", "revoked", "2026-09-03T00:00:00Z"),
    ],
    jars: [jar("food", "carol"), jar("mine", "me"), jar("old", "carol", { is_active: false })],
    transactions: [
      { id: "t1", jar_id: "food", user_id: "carol", amount: 40_000, note: "Phở", type: "expense", transaction_date: "2026-10-03", created_at: "2026-10-03T01:00:00Z", jars: { name: "food", icon: null, color: "oklch(0.5 0.1 40)" } },
      { id: "t2", jar_id: "food", user_id: "carol", amount: 100_000, note: null, type: "deposit", transaction_date: "2026-10-04", created_at: "2026-10-04T01:00:00Z", jars: { name: "food", icon: null, color: "#174C3C" } },
      { id: "t3", jar_id: "food", user_id: "carol", amount: 999, note: "tháng trước", type: "expense", transaction_date: "2026-09-20", created_at: "2026-09-20T01:00:00Z", jars: { name: "food", icon: null, color: "#174C3C" } },
      { id: "t4", jar_id: "mine", user_id: "me", amount: 5, note: "của tôi", type: "expense", transaction_date: "2026-10-04", created_at: "2026-10-04T02:00:00Z", jars: { name: "mine", icon: null, color: "#174C3C" } },
    ],
  };
}

describe("getSharesOverview", () => {
  it("splits invites to me, people sharing with me, and who I share with (without revoked)", async () => {
    const overview = await getSharesOverview(fakeClient(db()), "me");
    expect(overview.incoming).toEqual([{ id: "s1", ownerId: "bob", ownerName: "Bob", status: "pending", createdAt: "2026-10-02T00:00:00Z" }]);
    expect(overview.accepted.map((s) => [s.ownerId, s.ownerName])).toEqual([["carol", "Người dùng"]]); // chưa có tên → "Người dùng"
    expect(overview.outgoing.map((s) => [s.viewerName, s.status])).toEqual([["Người dùng", "pending"], ["Bob", "accepted"]]);
    expect(overview.outgoing.some((s) => s.status === "revoked")).toBe(false);
  });

  it("is empty for someone with no shares", async () => {
    expect(await getSharesOverview(fakeClient(db()), "nobody")).toEqual({ incoming: [], accepted: [], outgoing: [] });
  });
});

describe("getSharedOwnerOverview", () => {
  it("is null unless the owner has an ACCEPTED share with the viewer", async () => {
    expect(await getSharedOwnerOverview(fakeClient(db()), "bob", "me", NOW)).toBeNull(); // chỉ mới pending
    expect(await getSharedOwnerOverview(fakeClient(db()), "dave", "me", NOW)).toBeNull(); // đã từ chối
    expect(await getSharedOwnerOverview(fakeClient(db()), "stranger", "me", NOW)).toBeNull();
  });

  it("returns the owner's own active jars and this month's transactions, never the viewer's", async () => {
    const result = await getSharedOwnerOverview(fakeClient(db()), "carol", "me", NOW);
    expect(result?.ownerName).toBe("Người dùng");
    expect(result?.jars.map((j) => j.id)).toEqual(["food"]); // không có hũ của "me" hay hũ đã ngừng
    expect(result?.jars[0]).toMatchObject({ spent: 40_000 - 100_000, color: "#9A5B13", monthlyBudget: 1_000_000 }); // nạp trừ ngược; màu CSS → hex
    expect(result?.transactions.map((t) => t.id)).toEqual(["t2", "t1"]); // mới nhất trước, không có tháng trước
    expect(result?.transactions[1]).toMatchObject({ jarName: "food", jarColor: "#9A5B13", userId: "carol" });
  });
});

describe("share actions", () => {
  it("sends the invite with a trimmed email and refuses an empty one", async () => {
    let received: unknown;
    const client = fakeClient({}, { create_share_request: (args) => ((received = args), {}) });
    expect(await createShareRequest(client, "  bob@example.com ")).toEqual({ data: undefined, error: null });
    expect(received).toEqual({ p_viewer_email: "bob@example.com" });

    received = undefined;
    expect(await createShareRequest(client, "  ")).toEqual({ data: null, error: { code: "VALIDATION", message: "Nhập email người bạn muốn chia sẻ." } });
    expect(received).toBeUndefined();
  });

  it("passes the server's refusal message through", async () => {
    const client = fakeClient({}, { create_share_request: () => ({ error: { message: "Khong tim thay nguoi dung voi email nay." } }) });
    expect((await createShareRequest(client, "x@y.z")).error).toEqual({ code: "SUPABASE", message: "Khong tim thay nguoi dung voi email nay." });
  });

  it("responds and revokes through the RPCs", async () => {
    const calls: [string, unknown][] = [];
    const client = fakeClient({}, { respond_to_share_request: (a) => (calls.push(["respond", a]), {}), revoke_share: (a) => (calls.push(["revoke", a]), {}) });
    await respondToShare(client, "s1", true);
    await respondToShare(client, "s1", false);
    await revokeShare(client, "s4");
    expect(calls).toEqual([["respond", { p_share_id: "s1", p_accept: true }], ["respond", { p_share_id: "s1", p_accept: false }], ["revoke", { p_share_id: "s4" }]]);
    expect((await revokeShare(fakeClient({}, { revoke_share: () => ({ error: { message: "không có quyền" } }) }), "s4")).error?.message).toBe("không có quyền");
  });
});
