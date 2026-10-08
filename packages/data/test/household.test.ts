import { describe, expect, it } from "vitest";
import { JAR_COLORS } from "@hu/domain";
import { createFamilyJar, createHouseholdInvite, getHouseholdOverview, getMemberLastSpendTimes, getMyHousehold, joinHousehold, memberLabel, nameOf, setContribution, setMemberNickname } from "../src/index";
import { fakeClient, type Tables } from "./fake-client";

const NOW = new Date(2026, 9, 5); // tháng 10/2026
const jar = (id: string, over: Record<string, unknown> = {}) => ({ id, name: id, icon: "home", color: "var(--color-accent)", monthly_budget: 0, is_shared: true, alert_at_80: true, rollover: false, is_savings: false, is_active: true, sort_order: 1, household_id: "h1", ...over });

function db(): Tables {
  return {
    household_members: [{ household_id: "h1", user_id: "me", nickname: null }, { household_id: "h1", user_id: "wife", nickname: "vợ" }, { household_id: "h2", user_id: "other", nickname: null }],
    profiles: [{ id: "me", full_name: "An" }, { id: "wife", full_name: "Bình" }],
    jars: [jar("rent"), jar("personal", { is_shared: false, household_id: null })],
    jar_contributions: [
      { jar_id: "rent", user_id: "me", period_month: "2026-10-01", amount: 3_000_000 },
      { jar_id: "rent", user_id: "wife", period_month: "2026-10-01", amount: "2000000" },
      { jar_id: "rent", user_id: "me", period_month: "2026-09-01", amount: 9_999_999 },
    ],
    transactions: [
      { user_id: "wife", created_at: "2026-10-03T10:00:00Z", jar_id: "rent", amount: 1, type: "expense", transaction_date: "2026-10-03", jars: { household_id: "h1" } },
      { user_id: "wife", created_at: "2026-10-01T10:00:00Z", jar_id: "rent", amount: 1, type: "expense", transaction_date: "2026-10-01", jars: { household_id: "h1" } },
      { user_id: "me", created_at: "2026-10-02T08:00:00Z", jar_id: "rent", amount: 1, type: "expense", transaction_date: "2026-10-02", jars: { household_id: "h1" } },
      { user_id: "other", created_at: "2026-10-04T08:00:00Z", jar_id: "x", amount: 1, type: "expense", transaction_date: "2026-10-04", jars: { household_id: "h2" } },
    ],
  };
}

describe("member names", () => {
  it("shows yourself as Bạn, others by nickname else name", () => {
    expect(memberLabel({ name: "An", nickname: null, isMe: true })).toBe("Bạn");
    expect(memberLabel({ name: "Bình", nickname: "vợ", isMe: false })).toBe("vợ");
    expect(memberLabel({ name: "Bình", nickname: null, isMe: false })).toBe("Bình");
  });

  it("falls back to Người thân for someone who left", () => {
    const members = [{ userId: "wife", name: "Bình", nickname: "vợ", isMe: false }];
    expect(nameOf(members, "wife")).toBe("vợ");
    expect(nameOf(members, "stranger")).toBe("Người thân");
  });
});

describe("getMyHousehold", () => {
  it("is null for someone without a household", async () => {
    expect(await getMyHousehold(fakeClient(db()), "nobody")).toBeNull();
  });

  it("lists the members with their profile names and nicknames", async () => {
    expect(await getMyHousehold(fakeClient(db()), "me")).toEqual({
      id: "h1",
      members: [{ userId: "me", name: "Bạn", nickname: null, isMe: true }, { userId: "wife", name: "Bình", nickname: "vợ", isMe: false }],
    });
  });
});

describe("getMemberLastSpendTimes", () => {
  it("returns each member's newest spend in this household only", async () => {
    expect(await getMemberLastSpendTimes(fakeClient(db()), "h1")).toEqual({ wife: "2026-10-03T10:00:00Z", me: "2026-10-02T08:00:00Z" });
  });
});

describe("getHouseholdOverview", () => {
  it("is empty for someone without a household", async () => {
    expect(await getHouseholdOverview(fakeClient(db()), "nobody", NOW)).toEqual({ household: null, familyJars: [], lastSpendByUser: {} });
  });

  it("returns only family jars with this month's pledge of every member (0 when none), colors made drawable", async () => {
    const tables = db();
    tables.jar_contributions = tables.jar_contributions.filter((row) => row.user_id !== "wife");
    const overview = await getHouseholdOverview(fakeClient(tables), "me", NOW);
    expect(overview.familyJars).toHaveLength(1);
    expect(overview.familyJars[0].jar).toMatchObject({ id: "rent", isShared: true, color: "#9A5B13" });
    expect(overview.familyJars[0].contributions).toEqual([{ userId: "me", name: "Bạn", amount: 3_000_000 }, { userId: "wife", name: "vợ", amount: 0 }]);
    expect(overview.lastSpendByUser.wife).toBe("2026-10-03T10:00:00Z");
  });

  it("converts string amounts and ignores other months", async () => {
    const overview = await getHouseholdOverview(fakeClient(db()), "me", NOW);
    expect(overview.familyJars[0].contributions.map((c) => c.amount)).toEqual([3_000_000, 2_000_000]);
  });
});

describe("invite, join and nickname", () => {
  it("creates an invite from either an array or a single row, and surfaces failures", async () => {
    const asArray = fakeClient({}, { create_household_invite: () => ({ data: [{ code: "A1B2C3D4", expires_at: "2026-10-12T00:00:00Z" }] }) });
    expect(await createHouseholdInvite(asArray)).toEqual({ data: { code: "A1B2C3D4", expiresAt: "2026-10-12T00:00:00Z" }, error: null });
    const asRow = fakeClient({}, { create_household_invite: () => ({ data: { code: "ZZ", expires_at: "x" } }) });
    expect((await createHouseholdInvite(asRow)).data?.code).toBe("ZZ");
    expect(await createHouseholdInvite(fakeClient({}, { create_household_invite: () => ({ error: { message: "đã đủ 5 người" } }) }))).toEqual({ data: null, error: { code: "SUPABASE", message: "đã đủ 5 người" } });
    expect((await createHouseholdInvite(fakeClient({}, { create_household_invite: () => ({ data: [] }) }))).error?.message).toBe("Không tạo được mã mời.");
  });

  it("joins with a trimmed code, and refuses an empty one without calling the server", async () => {
    let received: unknown;
    const client = fakeClient({}, { join_household: (args) => ((received = args), {}) });
    expect(await joinHousehold(client, "  A1B2C3D4 ")).toEqual({ data: undefined, error: null });
    expect(received).toEqual({ p_code: "A1B2C3D4" });

    received = undefined;
    expect(await joinHousehold(client, "   ")).toEqual({ data: null, error: { code: "VALIDATION", message: "Nhập mã mời trước đã." } });
    expect(received).toBeUndefined();
    expect((await joinHousehold(fakeClient({}, { join_household: () => ({ error: { message: "Mã không hợp lệ" } }) }), "x")).error?.message).toBe("Mã không hợp lệ");
  });

  it("trims the nickname", async () => {
    let received: unknown;
    await setMemberNickname(fakeClient({}, { set_member_nickname: (args) => ((received = args), {}) }), "wife", "  vợ ");
    expect(received).toEqual({ p_user_id: "wife", p_nickname: "vợ" });
  });
});

describe("createFamilyJar", () => {
  it("needs a name and a household", async () => {
    expect((await createFamilyJar(fakeClient(db()), "me", { name: "  " })).error?.message).toBe("Cần đặt tên cho hũ.");
    expect((await createFamilyJar(fakeClient(db()), "nobody", { name: "Ăn chung" })).error?.message).toBe("Cần lập gia đình trước khi tạo hũ gia đình.");
  });

  it("creates a shared jar in the user's household, starting at zero with a drawable color no other jar uses", async () => {
    const tables = db();
    tables.jars.push(jar("taken", { color: JAR_COLORS[0] }));
    // Web gửi `var(--color-accent)` (không vẽ được trên mobile): bị bỏ, cấp màu chưa dùng.
    expect(await createFamilyJar(fakeClient(tables), "me", { name: " Ăn chung ", color: "var(--color-accent)" })).toEqual({ data: undefined, error: null });
    expect(tables.jars.at(-1)).toMatchObject({ user_id: "me", name: "Ăn chung", is_shared: true, household_id: "h1", monthly_budget: 0, color: JAR_COLORS[1], icon: "home", alert_at_80: true, rollover: false });
  });
});

describe("setContribution", () => {
  it("rejects negative or non-finite amounts", async () => {
    expect((await setContribution(fakeClient(db()), "me", "rent", -1, NOW)).error?.message).toBe("Số tiền không thể âm.");
    expect((await setContribution(fakeClient(db()), "me", "rent", Number.NaN, NOW)).error?.code).toBe("VALIDATION");
  });

  it("replaces my pledge for this month and recomputes the jar budget as everyone's total", async () => {
    const tables = db();
    expect(await setContribution(fakeClient(tables), "me", "rent", 4_000_000, NOW)).toEqual({ data: undefined, error: null });
    const mine = tables.jar_contributions.filter((row) => row.user_id === "me" && row.period_month === "2026-10-01");
    expect(mine).toHaveLength(1);
    expect(mine[0].amount).toBe(4_000_000);
    expect(tables.jar_contributions.find((row) => row.period_month === "2026-09-01")?.amount).toBe(9_999_999);
    expect(tables.jars.find((row) => row.id === "rent")?.monthly_budget).toBe(6_000_000); // 4tr của mình + 2tr của vợ
  });

  it("stops at the first failure and does not touch the budget", async () => {
    const tables = db();
    const result = await setContribution(fakeClient(tables, {}, { "jar_contributions.upsert": "permission denied" }), "me", "rent", 1, NOW);
    expect(result).toEqual({ data: null, error: { code: "SUPABASE", message: "permission denied" } });
    expect(tables.jars.find((row) => row.id === "rent")?.monthly_budget).toBe(0);
  });
});
