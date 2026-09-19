// One-off generator for the PWA app icons. Re-run with `node scripts/generate-icons.mjs`
// whenever the brand mark changes — output lands in public/icons/.
import { ImageResponse } from "next/og.js";
import { mkdir, writeFile } from "node:fs/promises";

const ACCENT = "#ec3013";
const CREAM = "#f3f2f2";

function mark({ size, safeZone }) {
  // safeZone shrinks the glyph so it survives Android's maskable-icon crop.
  const fontSize = Math.round(size * safeZone * 0.62);
  return {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ACCENT,
      },
      children: {
        type: "div",
        props: {
          style: {
            fontSize,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            color: CREAM,
            display: "flex",
          },
          children: "H.",
        },
      },
    },
  };
}

const targets = [
  { file: "icon-192.png", size: 192, safeZone: 0.82 },
  { file: "icon-512.png", size: 512, safeZone: 0.82 },
  { file: "icon-512-maskable.png", size: 512, safeZone: 0.6 },
  { file: "apple-touch-icon.png", size: 180, safeZone: 0.82 },
];

async function main() {
  await mkdir("public/icons", { recursive: true });
  for (const t of targets) {
    const res = new ImageResponse(mark(t), { width: t.size, height: t.size });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(`public/icons/${t.file}`, buf);
    console.log(`wrote public/icons/${t.file} (${buf.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
