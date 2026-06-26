import fs from "fs";
import path from "path";

function getDataDir(): string {
  return process.env.DATABASE_DIR
    ? path.resolve(process.env.DATABASE_DIR)
    : path.join(process.cwd(), "data");
}

export function getBackupDir(): string {
  const dir = path.join(getDataDir(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJsonBackup<T>(name: string, data: T): void {
  const file = path.join(getBackupDir(), `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

export function readJsonBackup<T>(name: string): T | null {
  const file = path.join(getBackupDir(), `${name}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function getDataDirForLogs(): string {
  return getDataDir();
}
