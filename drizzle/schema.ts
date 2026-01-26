import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Users are admins (parents/teachers) who manage children.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Children (students) table.
 * Each child belongs to an admin (parent/teacher).
 */
export const children = mysqlTable("children", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(), // References users.id
  firstName: varchar("firstName", { length: 100 }).notNull(),
  grade: int("grade").notNull().default(1), // Grade level (1-12)
  avatar: varchar("avatar", { length: 50 }), // Avatar identifier (emoji or icon name)
  pin: varchar("pin", { length: 4 }), // Optional 4-digit PIN
  difficultyLevel: int("difficultyLevel").notNull().default(1), // Current adaptive difficulty (1-5)
  totalStars: int("totalStars").notNull().default(0),
  totalSessions: int("totalSessions").notNull().default(0),
  totalProblems: int("totalProblems").notNull().default(0),
  totalCorrect: int("totalCorrect").notNull().default(0),
  currentStreak: int("currentStreak").notNull().default(0),
  longestStreak: int("longestStreak").notNull().default(0),
  lastSessionDate: varchar("lastSessionDate", { length: 10 }), // YYYY-MM-DD format
  crossingTenCorrect: int("crossingTenCorrect").notNull().default(0),
  crossingTenTotal: int("crossingTenTotal").notNull().default(0),
  badges: text("badges"), // JSON string of badge IDs, parsed in app
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Child = typeof children.$inferSelect;
export type InsertChild = typeof children.$inferInsert;

/**
 * Session history for each child.
 * Tracks individual practice sessions.
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  childId: int("childId").notNull(), // References children.id
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalProblems: int("totalProblems").notNull(),
  correctAnswers: int("correctAnswers").notNull(),
  accuracy: int("accuracy").notNull(), // Percentage 0-100
  averageTime: int("averageTime").notNull(), // Average time per problem in ms
  starsEarned: int("starsEarned").notNull(),
  difficultyLevel: int("difficultyLevel").notNull(),
  crossingTenCorrect: int("crossingTenCorrect").notNull().default(0),
  crossingTenTotal: int("crossingTenTotal").notNull().default(0),
  problemDetails: text("problemDetails"), // JSON string of problem details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
