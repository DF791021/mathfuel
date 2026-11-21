import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

// ============================================================================
// CORE USER TABLE
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  userType: mysqlEnum("userType", ["student", "parent", "teacher", "admin"]).default("student").notNull(),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  gradeLevel: int("gradeLevel"), // 1, 2, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// MATHFUEL CONTENT: SKILL TREE
// ============================================================================

/**
 * Math domains (top-level categories)
 * e.g., "Number Sense", "Operations", "Place Value"
 */
export const mathDomains = mysqlTable("mathDomains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // emoji or icon name
  displayOrder: int("displayOrder").notNull().default(0),
  gradeLevel: int("gradeLevel").notNull(), // 1, 2, etc.
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MathDomain = typeof mathDomains.$inferSelect;
export type InsertMathDomain = typeof mathDomains.$inferInsert;

/**
 * Skills within a domain
 * e.g., "Addition within 10", "Subtraction within 20"
 */
export const mathSkills = mysqlTable("mathSkills", {
  id: int("id").autoincrement().primaryKey(),
  domainId: int("domainId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  gradeLevel: int("gradeLevel").notNull(),
  displayOrder: int("displayOrder").notNull().default(0),
  prerequisiteSkillId: int("prerequisiteSkillId"), // skill that should be mastered first
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MathSkill = typeof mathSkills.$inferSelect;
export type InsertMathSkill = typeof mathSkills.$inferInsert;

/**
 * Problem templates for generating questions
 * Each template can produce many concrete problems
 */
export const mathProblems = mysqlTable("mathProblems", {
  id: int("id").autoincrement().primaryKey(),
  skillId: int("skillId").notNull(),
  problemType: mysqlEnum("problemType", [
    "multiple_choice",
    "numeric_input",
    "true_false",
    "fill_blank",
    "comparison",
    "word_problem",
    "ordering",
  ]).notNull(),
  difficulty: int("difficulty").notNull().default(1), // 1-5 scale
  questionText: text("questionText").notNull(),
  questionImage: varchar("questionImage", { length: 500 }), // optional image URL
  correctAnswer: varchar("correctAnswer", { length: 200 }).notNull(),
  answerType: mysqlEnum("answerType", ["number", "text", "boolean", "choice"]).notNull(),
  choices: json("choices"), // JSON array for multiple choice: ["3", "4", "5", "6"]
  explanation: text("explanation").notNull(), // shown after answering
  hintSteps: json("hintSteps").notNull(), // JSON array of progressive hints: ["Think about...", "Try counting...", "The answer is close to..."]
  tags: varchar("tags", { length: 500 }), // comma-separated: "addition,single-digit,visual"
  isActive: boolean("isActive").default(true).notNull(),
  timesServed: int("timesServed").default(0).notNull(),
  timesCorrect: int("timesCorrect").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MathProblem = typeof mathProblems.$inferSelect;
export type InsertMathProblem = typeof mathProblems.$inferInsert;

// ============================================================================
// MATHFUEL: PRACTICE SESSIONS & STUDENT PERFORMANCE
// ============================================================================

/**
 * Practice sessions - a single sitting of math practice
 */
export const practiceSessions = mysqlTable("practiceSessions", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  sessionType: mysqlEnum("sessionType", ["daily", "practice", "review", "assessment"]).default("daily").notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).default("in_progress").notNull(),
  totalProblems: int("totalProblems").default(0).notNull(),
  correctAnswers: int("correctAnswers").default(0).notNull(),
  hintsUsed: int("hintsUsed").default(0).notNull(),
  totalTimeSeconds: int("totalTimeSeconds").default(0).notNull(),
  averageDifficulty: int("averageDifficulty").default(1).notNull(), // average difficulty served (1-5 * 100 for precision)
  skillsFocused: json("skillsFocused"), // JSON array of skill IDs practiced
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = typeof practiceSessions.$inferInsert;

/** Server-owned, versioned practice missions. A nullable unique active key allows
 * one resumable run per learner/mission and any number of completed runs. */
export const missionRuns = mysqlTable("missionRuns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  studentId: int("studentId").notNull(),
  missionId: mysqlEnum("missionId", ["make-ten", "bridge-ten"]).notNull(),
  activeKey: varchar("activeKey", { length: 64 }).unique(),
  contentVersion: int("contentVersion").notNull().default(1),
  revision: int("revision").notNull().default(0),
  status: mysqlEnum("status", ["in_progress", "completed"]).notNull().default("in_progress"),
  state: json("state").$type<import("../server/missions/engine").MissionState>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

/**
 * Individual problem attempts within a session
 */
export const problemAttempts = mysqlTable("problemAttempts", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  studentId: int("studentId").notNull(),
  problemId: int("problemId").notNull(),
  skillId: int("skillId").notNull(),
  studentAnswer: varchar("studentAnswer", { length: 200 }),
  isCorrect: boolean("isCorrect").notNull(),
  isFirstTry: boolean("isFirstTry").default(true).notNull(),
  hintsViewed: int("hintsViewed").default(0).notNull(), // how many hint steps they saw
  timeSpentSeconds: int("timeSpentSeconds").default(0).notNull(),
  difficulty: int("difficulty").notNull(), // difficulty of the problem at time of serving
  attemptNumber: int("attemptNumber").default(1).notNull(), // 1st, 2nd, 3rd try
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProblemAttempt = typeof problemAttempts.$inferSelect;
export type InsertProblemAttempt = typeof problemAttempts.$inferInsert;

/**
 * Student skill mastery - tracks progress per skill per student
 */
export const studentSkillMastery = mysqlTable("studentSkillMastery", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  skillId: int("skillId").notNull(),
  masteryLevel: mysqlEnum("masteryLevel", ["not_started", "practicing", "close", "mastered"]).default("not_started").notNull(),
  masteryScore: int("masteryScore").default(0).notNull(), // 0-100
  totalAttempts: int("totalAttempts").default(0).notNull(),
  correctAttempts: int("correctAttempts").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(), // consecutive correct
  bestStreak: int("bestStreak").default(0).notNull(),
  averageTimeSeconds: int("averageTimeSeconds").default(0).notNull(),
  lastPracticedAt: timestamp("lastPracticedAt"),
  masteredAt: timestamp("masteredAt"), // when they first hit "mastered"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentSkillMastery = typeof studentSkillMastery.$inferSelect;
export type InsertStudentSkillMastery = typeof studentSkillMastery.$inferInsert;

/**
 * Student daily stats - aggregated daily performance
 */
export const studentDailyStats = mysqlTable("studentDailyStats", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  sessionsCompleted: int("sessionsCompleted").default(0).notNull(),
  problemsAttempted: int("problemsAttempted").default(0).notNull(),
  problemsCorrect: int("problemsCorrect").default(0).notNull(),
  hintsUsed: int("hintsUsed").default(0).notNull(),
  totalTimeSeconds: int("totalTimeSeconds").default(0).notNull(),
  skillsImproved: int("skillsImproved").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentDailyStat = typeof studentDailyStats.$inferSelect;
export type InsertStudentDailyStat = typeof studentDailyStats.$inferInsert;

/**
 * Student streaks - track daily practice streaks
 */
export const studentStreaks = mysqlTable("studentStreaks", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().unique(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastActiveDate: varchar("lastActiveDate", { length: 10 }), // YYYY-MM-DD
  totalActiveDays: int("totalActiveDays").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentStreak = typeof studentStreaks.$inferSelect;
export type InsertStudentStreak = typeof studentStreaks.$inferInsert;

/**
 * Badges / achievements earned by students
 */
export const studentBadges = mysqlTable("studentBadges", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  badgeType: varchar("badgeType", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // emoji
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type StudentBadge = typeof studentBadges.$inferSelect;
export type InsertStudentBadge = typeof studentBadges.$inferInsert;

// ============================================================================
// MATHFUEL: PARENT-STUDENT LINKING
// ============================================================================

/**
 * Parent-child relationships
 */
export const parentStudentLinks = mysqlTable("parentStudentLinks", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId").notNull(),
  studentId: int("studentId").notNull(),
  relationship: varchar("relationship", { length: 50 }).default("parent").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ParentStudentLink = typeof parentStudentLinks.$inferSelect;
export type InsertParentStudentLink = typeof parentStudentLinks.$inferInsert;

// ============================================================================
// MATHFUEL: INVITE CODES (Parent-Child Linking)
// ============================================================================

export const inviteCodes = mysqlTable("inviteCodes", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedBy: int("usedBy"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

// ============================================================================
// MATHFUEL: PASSWORD RESET TOKENS
// ============================================================================

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

// ============================================================================
// MATHFUEL: AI FEEDBACK RATINGS
// ============================================================================

/**
 * AI feedback ratings - students rate MathBuddy's hints and explanations
 * Used to measure AI quality and improve prompts over time.
 */
export const aiFeedback = mysqlTable("aiFeedback", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull(),
  sessionId: int("sessionId"), // practice session context
  problemId: int("problemId"), // which problem the AI responded to
  responseType: mysqlEnum("responseType", ["hint", "explanation", "session_summary"]).notNull(),
  rating: mysqlEnum("rating", ["up", "down"]).notNull(), // thumbs up or down
  aiResponseText: text("aiResponseText"), // the actual AI text that was rated
  comment: text("comment"), // optional free-text comment from student
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AIFeedback = typeof aiFeedback.$inferSelect;
export type InsertAIFeedback = typeof aiFeedback.$inferInsert;

// ============================================================================
// REVENUE ENGINE TABLES (Existing - Kept)
// ============================================================================

/**
 * Subscriptions - Stripe ledger
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }).notNull().unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 100 }).notNull().unique(),
  status: mysqlEnum("status", ["trialing", "active", "incomplete", "incomplete_expired", "past_due", "canceled", "unpaid"]).notNull(),
  priceId: varchar("priceId", { length: 100 }).notNull(),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  canceledAt: timestamp("canceledAt"),
  latestInvoiceId: varchar("latestInvoiceId", { length: 100 }),
  lastPaymentStatus: mysqlEnum("lastPaymentStatus", ["succeeded", "failed", "pending"]),
  lastWebhookEventId: varchar("lastWebhookEventId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Admin Settings
 */
export const adminSettings = mysqlTable("adminSettings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: json("value").notNull(),
  type: mysqlEnum("type", ["boolean", "string", "number", "json"]).notNull(),
  description: text("description"),
  updatedBy: int("updatedBy").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminSetting = typeof adminSettings.$inferSelect;
export type InsertAdminSetting = typeof adminSettings.$inferInsert;

/**
 * Feature Flags
 */
export const featureFlags = mysqlTable("featureFlags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").default(false).notNull(),
  owner: varchar("owner", { length: 100 }).notNull(),
  rolloutPercentage: int("rolloutPercentage").default(0).notNull(),
  targetRoles: varchar("targetRoles", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

/**
 * Audit Log
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: varchar("resourceId", { length: 100 }),
  changes: json("changes"),
  metadata: json("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

/**
 * Webhook Events
 */
export const webhookEvents = mysqlTable("webhookEvents", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 100 }).notNull().unique(),
  type: varchar("type", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "succeeded", "failed"]).default("pending").notNull(),
  payload: json("payload").notNull(),
  error: text("error"),
  attempts: int("attempts").default(0).notNull(),
  maxRetries: int("maxRetries").default(3).notNull(),
  nextRetryAt: timestamp("nextRetryAt"),
  lastAttemptAt: timestamp("lastAttemptAt"),
  succeededAt: timestamp("succeededAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * Email Sends
 */
export const emailSends = mysqlTable("emailSends", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientUserId: int("recipientUserId"),
  type: varchar("type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  externalId: varchar("externalId", { length: 100 }),
  error: text("error"),
  sentAt: timestamp("sentAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  bouncedAt: timestamp("bouncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailSend = typeof emailSends.$inferSelect;
export type InsertEmailSend = typeof emailSends.$inferInsert;

/**
 * Notifications (admin-only)
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["admin"]).notNull(),
  type: mysqlEnum("type", [
    "payment_received",
    "payment_failed",
    "subscription_change",
    "new_signup",
    "system_alert",
    "content_update",
  ]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  linkUrl: varchar("linkUrl", { length: 500 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
  dismissedAt: timestamp("dismissedAt"),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * RBAC Permissions
 */
export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  capability: varchar("capability", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
