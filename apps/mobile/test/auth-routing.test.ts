import { describe, expect, it } from "vitest";
import { destinationForSession } from "../src/lib/auth-routing";

describe("mobile auth routing", () => {
  it("sends signed-out users away from protected tabs", () => {
    expect(destinationForSession(false, "tabs")).toBe("/login");
  });

  it("sends signed-in users away from auth screens", () => {
    expect(destinationForSession(true, "auth")).toBe("/overview");
  });

  it("does not redirect users already in the correct route group", () => {
    expect(destinationForSession(true, "tabs")).toBeNull();
    expect(destinationForSession(false, "auth")).toBeNull();
  });
});
