export type AuthRouteGroup = "auth" | "tabs" | "public";

export function destinationForSession(isSignedIn: boolean, group: AuthRouteGroup): "/login" | "/overview" | null {
  if (!isSignedIn && group === "tabs") return "/login";
  if (isSignedIn && group === "auth") return "/overview";
  return null;
}
