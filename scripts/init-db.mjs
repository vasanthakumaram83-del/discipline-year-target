import { createHash, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, isAbsolute, dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env", "utf8").split(/\r?\n/).find(x => x.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch { return undefined; }
}
const url = envValue("DATABASE_URL") || "file:./dev.db";
if (!url.startsWith("file:")) throw new Error("db:init supports SQLite file: URLs only.");
let file = url.slice("file:".length).split("?")[0];
if (!isAbsolute(file)) file = resolve("prisma", file.replace(/^\.\//, ""));
const migrationPath = resolve("prisma/migrations/20261003000000_init/migration.sql");
const migrationSql = readFileSync(migrationPath, "utf8");
const checksum = createHash("sha256").update(migrationSql).digest("hex");
mkdirSync(dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec("PRAGMA foreign_keys=ON;");
const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x => x.name);
const expected = ["User","TaskDefinition","DailyTask","JournalEntry","SleepRecord","GainLedger","ExcuseLedger","DailySummary","RecoveryRecord"];
const expectedColumns = {
  User:["id","email","passwordHash","name","recoveryMode","allowNegativeGain","createdAt"],
  TaskDefinition:["id","title","category","startTime","endTime","plannedMinutes","requiresContent","order","active"],
  DailyTask:["id","userId","date","taskId","status","actualStart","actualEnd","actualMinutes","content","notes","subject","focus","difficulty","updatedAt","createdAt"],
  JournalEntry:["id","userId","date","reflection","topics","achievements","problems","tomorrowPlan","updatedAt"],
  SleepRecord:["id","userId","date","sleepTime","wakeTime","durationMinutes","notes"],
  GainLedger:["id","userId","date","type","minutes","description","balanceAfter","createdAt"],
  ExcuseLedger:["id","userId","date","hours","reason","description","gainBefore","gainAfter","createdAt"],
  DailySummary:["id","userId","date","scheduledMinutes","actualMinutes","gainMinutes","completedTasks","missedTasks","updatedAt"],
  RecoveryRecord:["id","userId","date","missedDate","taskId","minutes","note","createdAt"]
};
if (!names.includes("_prisma_migrations")) {
  const existing = names.filter(n => !n.startsWith("sqlite_"));
  if (existing.length === 0) db.exec(migrationSql);
  else {
    const complete = expected.every(table => existing.includes(table) && expectedColumns[table].every(column => db.prepare(`PRAGMA table_info("${table}")`).all().some(item => item.name === column)));
    if (!complete) throw new Error("Database has a partial or mismatched schema. Back it up and inspect it before applying migrations.");
  }
  db.exec(`CREATE TABLE "_prisma_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checksum" TEXT NOT NULL,
    "finished_at" DATETIME,
    "migration_name" TEXT NOT NULL,
    "logs" TEXT,
    "rolled_back_at" DATETIME,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  );`);
  db.prepare(`INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","started_at","applied_steps_count") VALUES (?,?,?,?,?,?)`).run(randomUUID(), checksum, new Date().toISOString(), "20261003000000_init", new Date().toISOString(), 1);
  console.log(`Initialized SQLite schema and recorded migration: ${file}`);
} else {
  const applied = db.prepare(`SELECT "checksum" FROM "_prisma_migrations" WHERE "migration_name"=? AND "finished_at" IS NOT NULL`).get("20261003000000_init");
  if (!applied) throw new Error("Migration history exists without the initial migration; inspect the database before changing it.");
  if (applied.checksum !== checksum) throw new Error("The applied migration checksum differs from this source. Do not apply a changed migration to this database.");
  console.log(`SQLite schema is already initialized: ${file}`);
}
db.close();
