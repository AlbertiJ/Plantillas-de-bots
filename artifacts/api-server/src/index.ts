import { networkInterfaces } from "node:os";
import app from "./app";
import { logger } from "./lib/logger";
import { bootstrap } from "./lib/credentials-store";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bootstrap admin credentials BEFORE we start listening so the banner
// can include the initial password if it was just generated.
const boot = bootstrap();

function getLanAddresses(): string[] {
  const addrs: string[] = [];
  const ifaces = networkInterfaces();
  for (const list of Object.values(ifaces)) {
    if (!list) continue;
    for (const i of list) {
      if (i.family === "IPv4" && !i.internal) addrs.push(i.address);
    }
  }
  return addrs;
}

function printBanner(): void {
  const lines: string[] = [];
  const sep = "=".repeat(70);
  lines.push("");
  lines.push(sep);
  lines.push("  PLANTILLAS DE BOTS - API SERVER");
  lines.push(sep);
  lines.push("");
  lines.push("  Servidor escuchando. Abre el panel en alguna de estas URLs:");
  lines.push(`    - http://localhost:${port}`);
  lines.push(`    - http://127.0.0.1:${port}`);
  for (const ip of getLanAddresses()) {
    lines.push(`    - http://${ip}:${port}   (LAN)`);
  }
  lines.push("");

  if (boot.created && boot.initialPassword) {
    lines.push("  >>> CREDENCIALES INICIALES DE ADMIN <<<");
    lines.push(`    Usuario:    admin`);
    lines.push(`    Contrasena: ${boot.initialPassword}`);
    lines.push("");
    lines.push("  Cambiala desde /admin tras el primer login.");
    lines.push("  Esta contrasena NO se vuelve a mostrar.");
  } else {
    lines.push("  Admin ya configurado. Si olvidaste la clave, borra");
    lines.push("  data/credentials/ y reinicia para regenerar.");
  }

  lines.push("");
  lines.push(sep);
  lines.push("");

  // Use console.log so the banner is plain text (not JSON-wrapped by pino).
  console.log(lines.join("\n"));
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  printBanner();
  logger.info({ port }, "Server listening");
});
