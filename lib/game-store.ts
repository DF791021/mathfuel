import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// TYPES
// ============================================================================

export interface MathProblem {
  id: string;
  num1: number;
  num2: number;
  operator: "+" | "-";
  answer: number;
  options: number[];
  visualType: "dots" | "blocks" | "fingers" | "none";
  isCrossingTen: boolean; // Track this for analytics
}

export interface SessionResult {
  date: string;
  totalProblems: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  starsEarned: number;
  problemTypes: { addition: number; subtraction: number };
  crossingTenCorrect: number;
  crossingTenTotal: number;
}

export interface ProgressData {
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  totalProblems: number;
  totalCorrect: number;
  lastPlayedDate: string | null;
  sessionHistory: SessionResult[];
  badges: string[];
  difficultyLevel: number; // 1-5
  crossingTenCorrect: number;
  crossingTenTotal: number;
}

export interface GameSettings {
  sessionLength: number;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  parentPin: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  PROGRESS: "mathfuel_progress",
  SETTINGS: "mathfuel_settings",
} as const;

const defaultProgress: ProgressData = {
  totalStars: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  totalProblems: 0,
  totalCorrect: 0,
  lastPlayedDate: null,
  sessionHistory: [],
  badges: [],
  difficultyLevel: 1,
  crossingTenCorrect: 0,
  crossingTenTotal: 0,
};

const defaultSettings: GameSettings = {
  sessionLength: 10,
  soundEnabled: true,
  hapticEnabled: true,
  parentPin: "1234",
};

// ============================================================================
// DATA VALIDATION
// ============================================================================

/**
 * Validates and sanitizes progress data to ensure all fields are valid.
 * Returns a clean ProgressData object, filling in defaults for missing/invalid fields.
 */
function validateProgressData(data: unknown): ProgressData {
  if (!data || typeof data !== "object") {
    return { ...defaultProgress };
  }

  const raw = data as Record<string, unknown>;

  return {
    totalStars: isValidNonNegativeInt(raw.totalStars) ? raw.totalStars as number : 0,
    currentStreak: isValidNonNegativeInt(raw.currentStreak) ? raw.currentStreak as number : 0,
    longestStreak: isValidNonNegativeInt(raw.longestStreak) ? raw.longestStreak as number : 0,
    totalSessions: isValidNonNegativeInt(raw.totalSessions) ? raw.totalSessions as number : 0,
    totalProblems: isValidNonNegativeInt(raw.totalProblems) ? raw.totalProblems as number : 0,
    totalCorrect: isValidNonNegativeInt(raw.totalCorrect) ? raw.totalCorrect as number : 0,
    lastPlayedDate: typeof raw.lastPlayedDate === "string" ? raw.lastPlayedDate : null,
    sessionHistory: Array.isArray(raw.sessionHistory) ? raw.sessionHistory as SessionResult[] : [],
    badges: Array.isArray(raw.badges) ? (raw.badges as string[]).filter(b => typeof b === "string") : [],
    difficultyLevel: isValidDifficulty(raw.difficultyLevel) ? raw.difficultyLevel as number : 1,
    crossingTenCorrect: isValidNonNegativeInt(raw.crossingTenCorrect) ? raw.crossingTenCorrect as number : 0,
    crossingTenTotal: isValidNonNegativeInt(raw.crossingTenTotal) ? raw.crossingTenTotal as number : 0,
  };
}

/**
 * Validates and sanitizes settings data.
 */
function validateSettingsData(data: unknown): GameSettings {
  if (!data || typeof data !== "object") {
    return { ...defaultSettings };
  }

  const raw = data as Record<string, unknown>;

  return {
    sessionLength: isValidSessionLength(raw.sessionLength) ? raw.sessionLength as number : 10,
    soundEnabled: typeof raw.soundEnabled === "boolean" ? raw.soundEnabled : true,
    hapticEnabled: typeof raw.hapticEnabled === "boolean" ? raw.hapticEnabled : true,
    parentPin: typeof raw.parentPin === "string" && raw.parentPin.length >= 4 ? raw.parentPin : "1234",
  };
}

function isValidNonNegativeInt(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidDifficulty(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isValidSessionLength(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 5 && value <= 30;
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

export async function loadProgress(): Promise<ProgressData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return validateProgressData(parsed);
    }
  } catch (error) {
    console.error("Error loading progress:", error);
  }
  return { ...defaultProgress };
}

export async function saveProgress(progress: ProgressData): Promise<boolean> {
  try {
    // Validate before saving to ensure data integrity
    const validated = validateProgressData(progress);
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(validated));
    return true;
  } catch (error) {
    console.error("Error saving progress:", error);
    return false;
  }
}

export async function loadSettings(): Promise<GameSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return validateSettingsData(parsed);
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return { ...defaultSettings };
}

export async function saveSettings(settings: GameSettings): Promise<boolean> {
  try {
    const validated = validateSettingsData(settings);
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(validated));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

// ============================================================================
// PROBLEM GENERATION - ROCK SOLID
// ============================================================================

/**
 * Generates a unique problem ID using timestamp and random component.
 */
function generateProblemId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Determines if a problem "crosses ten" (sum goes from single to double digits).
 * For addition: num1 + num2 crosses 10 if num1 < 10 and result >= 10
 * This is a key 1st grade skill to track.
 */
function isCrossingTenProblem(num1: number, num2: number, operator: "+" | "-"): boolean {
  if (operator === "+") {
    return num1 < 10 && num2 < 10 && (num1 + num2) >= 10;
  }
  // For subtraction: crossing ten when going from >= 10 to < 10
  return num1 >= 10 && (num1 - num2) < 10;
}

/**
 * Generates answer options that are:
 * 1. Always exactly 4 unique numbers
 * 2. Always include the correct answer
 * 3. Never include negative numbers
 * 4. Shuffled randomly
 */
export function generateOptions(correctAnswer: number): number[] {
  const options = new Set<number>();
  options.add(correctAnswer);

  // Add nearby "plausible" wrong answers (common mistakes)
  const nearbyOffsets = [1, -1, 2, -2, 10, -10];
  for (const offset of nearbyOffsets) {
    const candidate = correctAnswer + offset;
    if (candidate >= 0 && options.size < 4) {
      options.add(candidate);
    }
  }

  // If still need more options, add random numbers in reasonable range
  const maxRange = Math.max(correctAnswer + 5, 20);
  let attempts = 0;
  while (options.size < 4 && attempts < 100) {
    const candidate = Math.floor(Math.random() * maxRange);
    if (candidate >= 0) {
      options.add(candidate);
    }
    attempts++;
  }

  // Fallback: if somehow still not 4 options, add sequential numbers
  let fallback = 0;
  while (options.size < 4) {
    if (!options.has(fallback)) {
      options.add(fallback);
    }
    fallback++;
  }

  // Convert to array and shuffle using Fisher-Yates
  const optionsArray = Array.from(options);
  for (let i = optionsArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionsArray[i], optionsArray[j]] = [optionsArray[j], optionsArray[i]];
  }

  return optionsArray;
}

/**
 * Generates a math problem based on difficulty level.
 * 
 * Difficulty levels:
 * 1: Addition only, numbers 1-5, always visual
 * 2: Addition only, numbers 1-10, mostly visual
 * 3: Addition + some subtraction, numbers 1-12, some crossing-ten
 * 4: Addition + subtraction, numbers 1-15, more crossing-ten
 * 5: Addition + subtraction, numbers 1-20, minimal visuals
 */
export function generateProblem(difficultyLevel: number, _recentErrors: string[] = []): MathProblem {
  // Clamp difficulty to valid range
  const level = Math.max(1, Math.min(5, difficultyLevel));
  
  // Determine number ranges based on difficulty
  const maxNum = [5, 10, 12, 15, 20][level - 1];
  
  // Determine if subtraction is allowed (level 3+)
  const allowSubtraction = level >= 3;
  const useSubtraction = allowSubtraction && Math.random() < 0.4;
  
  let num1: number;
  let num2: number;
  let operator: "+" | "-";
  let answer: number;

  if (useSubtraction) {
    operator = "-";
    // For subtraction: num1 must be >= num2 to avoid negative results
    // Generate num1 first, then num2 <= num1
    num1 = Math.floor(Math.random() * (maxNum - 1)) + 2; // At least 2
    num2 = Math.floor(Math.random() * num1) + 1; // 1 to num1
    answer = num1 - num2;
  } else {
    operator = "+";
    
    // At level 3+, sometimes generate "crossing ten" problems
    const shouldCrossTen = level >= 3 && Math.random() < 0.3;
    
    if (shouldCrossTen) {
      // Generate numbers that will cross 10
      // e.g., 7 + 5 = 12, 8 + 4 = 12, 6 + 6 = 12
      num1 = Math.floor(Math.random() * 8) + 2; // 2-9
      const minNum2 = Math.max(1, 10 - num1 + 1); // Ensures crossing 10
      const maxNum2 = Math.min(maxNum, 20 - num1); // Keeps result reasonable
      num2 = Math.floor(Math.random() * (maxNum2 - minNum2 + 1)) + minNum2;
    } else {
      // Regular addition
      num1 = Math.floor(Math.random() * maxNum) + 1;
      num2 = Math.floor(Math.random() * maxNum) + 1;
    }
    
    answer = num1 + num2;
  }

  // Determine visual type based on difficulty
  let visualType: MathProblem["visualType"];
  if (level <= 2) {
    visualType = Math.random() < 0.7 ? "dots" : "blocks";
  } else if (level <= 3) {
    visualType = Math.random() < 0.5 ? "dots" : "none";
  } else if (level <= 4) {
    visualType = Math.random() < 0.3 ? "dots" : "none";
  } else {
    visualType = "none";
  }

  // Generate guaranteed unique options
  const options = generateOptions(answer);

  return {
    id: generateProblemId(),
    num1,
    num2,
    operator,
    answer,
    options,
    visualType,
    isCrossingTen: isCrossingTenProblem(num1, num2, operator),
  };
}

// ============================================================================
// SCORING & STARS
// ============================================================================

/**
 * Calculate stars earned based on accuracy percentage.
 * 
 * 90%+ = 3 stars (excellent)
 * 70-89% = 2 stars (good)
 * 50-69% = 1 star (keep trying)
 * <50% = 0 stars (practice more)
 */
export function calculateStars(accuracy: number): number {
  // Clamp accuracy to 0-100
  const clampedAccuracy = Math.max(0, Math.min(100, accuracy));
  
  if (clampedAccuracy >= 90) return 3;
  if (clampedAccuracy >= 70) return 2;
  if (clampedAccuracy >= 50) return 1;
  return 0;
}

// ============================================================================
// BADGES
// ============================================================================

interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (progress: ProgressData) => boolean;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "first_session",
    name: "First Steps",
    emoji: "🎯",
    description: "Completed your first session!",
    condition: (p) => p.totalSessions >= 1,
  },
  {
    id: "star_collector",
    name: "Star Collector",
    emoji: "⭐",
    description: "Earned 10 stars!",
    condition: (p) => p.totalStars >= 10,
  },
  {
    id: "streak_starter",
    name: "Streak Starter",
    emoji: "🔥",
    description: "3 days in a row!",
    condition: (p) => p.currentStreak >= 3,
  },
  {
    id: "week_warrior",
    name: "Week Warrior",
    emoji: "💪",
    description: "7 days in a row!",
    condition: (p) => p.currentStreak >= 7,
  },
  {
    id: "math_explorer",
    name: "Math Explorer",
    emoji: "🧭",
    description: "Solved 50 problems!",
    condition: (p) => p.totalCorrect >= 50,
  },
  {
    id: "math_champion",
    name: "Math Champion",
    emoji: "🏆",
    description: "Solved 100 problems!",
    condition: (p) => p.totalCorrect >= 100,
  },
];

/**
 * Check which new badges should be awarded based on current progress.
 * Returns array of badge IDs that are newly earned (not already in progress.badges).
 */
export function checkBadges(progress: ProgressData): string[] {
  const newBadges: string[] = [];
  
  for (const badge of BADGE_DEFINITIONS) {
    if (!progress.badges.includes(badge.id) && badge.condition(progress)) {
      newBadges.push(badge.id);
    }
  }
  
  return newBadges;
}

/**
 * Get display information for a badge by ID.
 */
export function getBadgeInfo(badgeId: string): { name: string; emoji: string; description: string } {
  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (badge) {
    return { name: badge.name, emoji: badge.emoji, description: badge.description };
  }
  return { name: "Unknown", emoji: "❓", description: "" };
}

/**
 * Get all badge definitions (for displaying all badges including locked ones).
 */
export function getAllBadges(): BadgeDefinition[] {
  return [...BADGE_DEFINITIONS];
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

/**
 * Update streak based on when the user last played.
 * 
 * Rules:
 * - Same day: no change to streak
 * - Consecutive day: increment streak
 * - Missed a day: reset streak to 1
 * - First time playing: start streak at 1
 */
export function updateStreak(progress: ProgressData): ProgressData {
  const today = new Date();
  const todayStr = today.toDateString();
  const lastPlayed = progress.lastPlayedDate;

  // First time playing
  if (!lastPlayed) {
    return {
      ...progress,
      currentStreak: 1,
      longestStreak: Math.max(1, progress.longestStreak),
      lastPlayedDate: todayStr,
    };
  }

  // Same day - no change
  if (lastPlayed === todayStr) {
    return progress;
  }

  // Calculate days difference
  const lastDate = new Date(lastPlayed);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const diffMs = todayMidnight.getTime() - lastMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    // Consecutive day - increment streak
    const newStreak = progress.currentStreak + 1;
    return {
      ...progress,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, progress.longestStreak),
      lastPlayedDate: todayStr,
    };
  } else {
    // Missed a day (or more) - reset streak
    return {
      ...progress,
      currentStreak: 1,
      lastPlayedDate: todayStr,
    };
  }
}

// ============================================================================
// ADAPTIVE DIFFICULTY
// ============================================================================

/**
 * Adjust difficulty based on session performance.
 * 
 * Rules:
 * - 85%+ accuracy: increase difficulty (if not at max)
 * - 50-84% accuracy: maintain current difficulty
 * - <50% accuracy: decrease difficulty (if not at min)
 * 
 * Also considers crossing-ten accuracy for more nuanced adjustment.
 */
export function adjustDifficulty(
  progress: ProgressData,
  sessionAccuracy: number,
  crossingTenAccuracy?: number
): number {
  const currentLevel = progress.difficultyLevel;
  
  // Clamp accuracy
  const accuracy = Math.max(0, Math.min(100, sessionAccuracy));
  
  // Base adjustment
  let newLevel = currentLevel;
  
  if (accuracy >= 85) {
    newLevel = currentLevel + 1;
  } else if (accuracy < 50) {
    newLevel = currentLevel - 1;
  }
  
  // Additional consideration: if crossing-ten accuracy is provided and low,
  // don't increase difficulty even if overall accuracy is high
  if (crossingTenAccuracy !== undefined && crossingTenAccuracy < 60 && newLevel > currentLevel) {
    newLevel = currentLevel; // Hold at current level
  }
  
  // Clamp to valid range
  return Math.max(1, Math.min(5, newLevel));
}

/**
 * Calculate crossing-ten accuracy from progress data.
 */
export function getCrossingTenAccuracy(progress: ProgressData): number {
  if (progress.crossingTenTotal === 0) return 0;
  return Math.round((progress.crossingTenCorrect / progress.crossingTenTotal) * 100);
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export { defaultProgress, defaultSettings, validateProgressData, validateSettingsData };
