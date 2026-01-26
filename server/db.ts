import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, children, sessions, InsertChild, InsertSession, Child, Session } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== CHILDREN QUERIES ====================

export async function getChildrenByAdminId(adminId: number): Promise<Child[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get children: database not available");
    return [];
  }
  
  return db.select().from(children).where(eq(children.adminId, adminId));
}

export async function getChildById(childId: number): Promise<Child | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get child: database not available");
    return undefined;
  }
  
  const result = await db.select().from(children).where(eq(children.id, childId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createChild(data: InsertChild): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(children).values(data);
  return Number(result[0].insertId);
}

export async function updateChild(childId: number, data: Partial<InsertChild>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(children).set(data).where(eq(children.id, childId));
}

export async function deleteChild(childId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all sessions for this child first
  await db.delete(sessions).where(eq(sessions.childId, childId));
  // Then delete the child
  await db.delete(children).where(eq(children.id, childId));
}

// ==================== SESSION QUERIES ====================

export async function getSessionsByChildId(childId: number, limit = 50): Promise<Session[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get sessions: database not available");
    return [];
  }
  
  return db.select()
    .from(sessions)
    .where(eq(sessions.childId, childId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);
}

export async function createSession(data: InsertSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sessions).values(data);
  return Number(result[0].insertId);
}

// Update child stats after a session
export async function updateChildAfterSession(
  childId: number,
  sessionData: {
    starsEarned: number;
    totalProblems: number;
    correctAnswers: number;
    crossingTenCorrect: number;
    crossingTenTotal: number;
    date: string;
    accuracy: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const child = await getChildById(childId);
  if (!child) throw new Error("Child not found");
  
  // Calculate new streak
  const today = sessionData.date;
  const yesterday = getYesterdayDate(today);
  let newStreak = 1;
  
  if (child.lastSessionDate === today) {
    // Already played today, keep current streak
    newStreak = child.currentStreak;
  } else if (child.lastSessionDate === yesterday) {
    // Played yesterday, increment streak
    newStreak = child.currentStreak + 1;
  }
  // Otherwise, streak resets to 1
  
  const newLongestStreak = Math.max(child.longestStreak, newStreak);
  
  // Calculate new difficulty level based on accuracy
  let newDifficulty = child.difficultyLevel;
  if (sessionData.accuracy >= 85 && child.difficultyLevel < 5) {
    newDifficulty = child.difficultyLevel + 1;
  } else if (sessionData.accuracy < 50 && child.difficultyLevel > 1) {
    newDifficulty = child.difficultyLevel - 1;
  }
  
  // Check for new badges
  const currentBadges: string[] = child.badges ? JSON.parse(child.badges) : [];
  const newTotalSessions = child.totalSessions + 1;
  const newTotalStars = child.totalStars + sessionData.starsEarned;
  
  // Badge logic
  if (!currentBadges.includes("first_star") && newTotalStars >= 1) {
    currentBadges.push("first_star");
  }
  if (!currentBadges.includes("math_explorer") && newTotalSessions >= 5) {
    currentBadges.push("math_explorer");
  }
  if (!currentBadges.includes("streak_master") && newStreak >= 7) {
    currentBadges.push("streak_master");
  }
  if (!currentBadges.includes("problem_solver") && (child.totalProblems + sessionData.totalProblems) >= 100) {
    currentBadges.push("problem_solver");
  }
  if (!currentBadges.includes("accuracy_ace") && sessionData.accuracy === 100 && sessionData.totalProblems >= 10) {
    currentBadges.push("accuracy_ace");
  }
  if (!currentBadges.includes("star_collector") && newTotalStars >= 50) {
    currentBadges.push("star_collector");
  }
  
  await db.update(children).set({
    totalStars: newTotalStars,
    totalSessions: newTotalSessions,
    totalProblems: child.totalProblems + sessionData.totalProblems,
    totalCorrect: child.totalCorrect + sessionData.correctAnswers,
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    lastSessionDate: today,
    crossingTenCorrect: child.crossingTenCorrect + sessionData.crossingTenCorrect,
    crossingTenTotal: child.crossingTenTotal + sessionData.crossingTenTotal,
    difficultyLevel: newDifficulty,
    badges: JSON.stringify(currentBadges),
  }).where(eq(children.id, childId));
}

function getYesterdayDate(todayStr: string): string {
  const today = new Date(todayStr);
  today.setDate(today.getDate() - 1);
  return today.toISOString().split("T")[0];
}
