import { describe, expect, it } from "vitest";
import { displayNameOf, getProfile, initialOf, markTourSeen } from "../src/index";
import { fakeClient } from "./fake-client";

describe("getProfile", () => {
  it("returns the name and whether the tour was seen", async () => {
    const client = fakeClient({ profiles: [{ id: "me", full_name: "An", has_seen_tour: false }] });
    expect(await getProfile(client, "me")).toEqual({ fullName: "An", hasSeenTour: false });
  });

  it("treats a missing profile row as already seen, so nobody is nagged by a broken side feature", async () => {
    expect(await getProfile(fakeClient({ profiles: [] }), "me")).toEqual({ fullName: null, hasSeenTour: true });
  });

  it("surfaces a database error", async () => {
    await expect(getProfile(fakeClient({}, {}, { "profiles.select": "boom" }), "me")).rejects.toMatchObject({ message: "boom" });
  });
});

describe("markTourSeen", () => {
  it("flips only this user's flag", async () => {
    const tables = { profiles: [{ id: "me", has_seen_tour: false }, { id: "wife", has_seen_tour: false }] };
    expect(await markTourSeen(fakeClient(tables), "me")).toEqual({ data: undefined, error: null });
    expect(tables.profiles).toEqual([{ id: "me", has_seen_tour: true }, { id: "wife", has_seen_tour: false }]);
  });

  it("reports a failure", async () => {
    const result = await markTourSeen(fakeClient({ profiles: [] }, {}, { "profiles.update": "permission denied" }), "me");
    expect(result).toEqual({ data: null, error: { code: "SUPABASE", message: "permission denied" } });
  });
});

describe("display name and initial", () => {
  it("prefers the full name, then the email's local part, then a generic name", () => {
    expect(displayNameOf("  An Nguyễn ", "an@x.com")).toBe("An Nguyễn");
    expect(displayNameOf(null, "an@x.com")).toBe("an");
    expect(displayNameOf("  ", undefined)).toBe("Người dùng");
  });

  it("uses an upper-case first letter", () => {
    expect(initialOf("ân", null)).toBe("Â");
    expect(initialOf(null, "bob@x.com")).toBe("B");
    expect(initialOf(null, null)).toBe("?");
  });
});
