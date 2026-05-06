import { promises as fs } from "fs";
import path from "path";

export type HawkeyeUser = {
  id: string;
  name: string;
  class: string;
  activity: string;
  testsTaken: number;
  lastActive: string;
  usageCount: number;
};

export type KnowledgeDoc = {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  text: string;
  chunks: string[];
};

export type ActivityLog = {
  id: string;
  createdAt: string;
  userQuery: string;
  aiResponse: string;
  error?: string;
  mode?: string;
  user?: string;
};

type HawkeyeDB = {
  users: HawkeyeUser[];
  knowledge: KnowledgeDoc[];
  activity: ActivityLog[];
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "hawkeye.json");

const emptyDB: HawkeyeDB = { users: [], knowledge: [], activity: [] };

async function ensureDB(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(emptyDB, null, 2), "utf8");
  }
}

export async function readDB(): Promise<HawkeyeDB> {
  await ensureDB();
  const raw = await fs.readFile(dbPath, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      knowledge: Array.isArray(parsed.knowledge) ? parsed.knowledge : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
    };
  } catch {
    return { ...emptyDB };
  }
}

export async function writeDB(db: HawkeyeDB): Promise<void> {
  await ensureDB();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

export async function upsertUser(input: Pick<HawkeyeUser, "name" | "class"> & Partial<HawkeyeUser>): Promise<HawkeyeUser> {
  const db = await readDB();
  const now = new Date().toISOString();
  const nameKey = input.name.trim().toLowerCase();
  let user = db.users.find((u) => u.name.trim().toLowerCase() === nameKey && u.class === input.class);

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      class: input.class,
      activity: input.activity || "Active",
      testsTaken: input.testsTaken || 0,
      lastActive: now,
      usageCount: input.usageCount || 0,
    };
    db.users.push(user);
  } else {
    user.activity = input.activity ?? user.activity;
    user.lastActive = now;
    user.usageCount = (user.usageCount || 0) + (input.usageCount || 0);
    user.testsTaken = (user.testsTaken || 0) + (input.testsTaken || 0);
  }

  await writeDB(db);
  return user;
}

export async function removeUser(id: string): Promise<boolean> {
  const db = await readDB();
  const before = db.users.length;
  db.users = db.users.filter((u) => u.id !== id);
  if (db.users.length !== before) {
    await writeDB(db);
    return true;
  }
  return false;
}

export async function addKnowledge(doc: KnowledgeDoc): Promise<void> {
  const db = await readDB();
  db.knowledge.unshift(doc);
  db.knowledge = db.knowledge.slice(0, 200);
  await writeDB(db);
}

export async function addActivity(log: ActivityLog): Promise<void> {
  const db = await readDB();
  db.activity.unshift(log);
  db.activity = db.activity.slice(0, 500);
  await writeDB(db);
}
