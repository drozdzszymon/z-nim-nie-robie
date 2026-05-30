// Automated web deploy for znimnierobie.pl
// Reads FTP credentials from .secrets/ftp.json (gitignored) and uploads the
// contents of dist/ (produced by `npx expo export --platform web`).
//
// Usage:
//   node scripts/deploy-web.mjs            -> upload dist/ to the configured remoteDir
//   node scripts/deploy-web.mjs --list     -> only connect and list remoteDir (no upload)
//
// The script never hardcodes credentials; they live only in .secrets/ftp.json.

import { Client } from "basic-ftp";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const configPath = path.join(root, ".secrets", "ftp.json");

const listOnly = process.argv.includes("--list");

async function main() {
  // Load config
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (_err) {
    console.error(`✖ Cannot read FTP config at ${configPath}`);
    console.error("  Create .secrets/ftp.json with { host, port, user, password, secure, remoteDir }.");
    process.exit(1);
  }

  if (!listOnly) {
    try {
      await access(distDir, constants.F_OK);
    } catch {
      console.error(`✖ dist/ not found at ${distDir}`);
      console.error("  Run `npx expo export --platform web` first.");
      process.exit(1);
    }
  }

  const client = new Client(30_000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      port: config.port ?? 21,
      user: config.user,
      password: config.password,
      secure: config.secure ?? false,
      secureOptions: { rejectUnauthorized: false },
    });

    const remoteDir = config.remoteDir || "/";
    console.log(`✔ Connected to ${config.host} as ${config.user}`);

    if (listOnly) {
      const list = await client.list(remoteDir);
      console.log(`\nContents of ${remoteDir}:`);
      for (const item of list) {
        console.log(`  ${item.isDirectory ? "[DIR] " : "      "}${item.name}`);
      }
      return;
    }

    console.log(`→ Backing up current remote ${remoteDir} before overwrite ...`);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.join(root, "backups", `www-${stamp}`);
    try {
      await client.downloadToDir(backupDir, remoteDir);
      console.log(`✔ Remote backup saved to backups/www-${stamp}`);
    } catch (err) {
      console.error(`✖ Backup failed (${err.message}) — aborting deploy to stay safe.`);
      process.exitCode = 1;
      return;
    }

    console.log(`→ Uploading dist/ to ${remoteDir} ...`);
    client.trackProgress((info) => {
      if (info.name) process.stdout.write(`  ↑ ${info.name}\r`);
    });
    await client.ensureDir(remoteDir);
    await client.uploadFromDir(distDir, remoteDir);
    client.trackProgress();
    console.log("\n✔ Web deploy complete.");
  } catch (err) {
    console.error("\n✖ Deploy failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

main();
