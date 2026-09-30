import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "apps/mobile"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const forbidden = [/service[_-]?role/i, /ANTHROPIC_API_KEY/, /OPENAI_API_KEY/, /NEXT_PUBLIC_.*(?:SECRET|SERVICE|AI_KEY)/];
const hits = files.filter((file) => forbidden.some((pattern) => pattern.test(readFileSync(file, "utf8"))));
if (hits.length) {
  throw new Error(`Server-only secret reference found in mobile source: ${hits.join(", ")}`);
}
console.log(`Checked ${files.length} tracked mobile files: no server-only secret references.`);
