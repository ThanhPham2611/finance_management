// Chay `next dev`, tu dong chuyen sang port ke tiep neu port mong muon dang bi chiem.
// Ly do: next dev cua repo nay bao loi thay vi tu fallback port khi bi trung (xem AGENTS.md).
import { createServer } from "node:net";
import { spawn } from "node:child_process";

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "0.0.0.0");
  });
}

async function findFreePort(start) {
  let port = start;
  while (!(await isPortFree(port))) port++;
  return port;
}

const startPort = Number(process.env.PORT) || 3000;
const port = await findFreePort(startPort);
if (port !== startPort) {
  console.log(`Port ${startPort} dang duoc su dung, chuyen sang port ${port}.`);
}

const child = spawn("next", ["dev", "-p", String(port), ...process.argv.slice(2)], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));
