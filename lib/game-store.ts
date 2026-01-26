import AsyncStorage from "@react-native-async-storage/async-storage";

// Types
export interface MathProblem {
  id: string;
  num1: number;
  num2: number;
  operator: "+" | "-";
  answer: number;
  options: number[];
  visualType: "dots" | "blocks" | "fingers" | "none";
}

export interface SessionResult {
  date: string;
  totalProblems: number;
  correctAnswers: number;
  accuracy: number;
  averageTime: number;
  starsEarned: number;
  problemTypes: { addition: number; subtraction: number };
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
  crossingTenAccuracy: number; // Track this specific skill
}

export interface GameSettings {
  sessionLength: number; // Number of problems per session
  soundEnabled: boolean;
  hapticEnabled: boolean;
  parentPin: string;
}

const STORAGE_KEYS = {
  PROGRESS: "mathfuel_progress",
  SETTINGS: "mathfuel_settings",
};

// Default values
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
  crossingTenAccuracy: 0,
};

const defaultSettings: GameSettings = {
  sessionLength: 10,
  soundEnabled: true,
  hapticEnabled: true,
  parentPin: "1234",
};

// Load progress from storage
export async function loadProgress(): Promise<ProgressData> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (stored) {
      return { ...defaultProgress, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading progress:", error);
  }
  return defaultProgress;
}

// Save progress to storage
export async function saveProgress(progress: ProgressData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error("Error saving progress:", error);
  }
}

// Load settings from storage
export async function loadSettings(): Promise<GameSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return defaultSettings;
}

// Save settings to storage
export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Generate a math problem based on difficulty
export function generateProblem(difficultyLevel: number, recentErrors: string[]): MathProblem {
  const id = Math.random().toString(36).substring(7);
  
  // Determine max number based on difficulty
  const maxNum = Math.min(5 + difficultyLevel * 3, 20);
  const useSubtraction = difficultyLevel >= 2 && Math.random() > 0.6;
  
  let num1: number, num2: number, answer: number;
  let operator: "+" | "-" = "+";
  
  if (useSubtraction) {
    operator = "-";
    // For subtraction, ensure positive result
    num1 = Math.floor(Math.random() * maxNum) + 2;
    num2 = Math.floor(Math.random() * num1) + 1;
    answer = num1 - num2;
  } else {
    // Addition
    num1 = Math.floor(Math.random() * maxNum) + 1;
    num2 = Math.floor(Math.random() * maxNum) + 1;
    
    // At higher difficulties, include "crossing ten" problems
    if (difficultyLevel >= 3 && Math.random() > 0.5) {
      num1 = Math.floor(Math.random() * 9) + 2; // 2-10
      num2 = 10 - num1 + Math.floor(Math.random() * 5) + 1; // Forces crossing 10
    }
    
    answer = num1 + num2;
  }
  
  // Generate wrong options
  const options = generateOptions(answer, maxNum);
  
  // Determine visual type based on difficulty
  let visualType: MathProblem["visualType"] = "dots";
  if (difficultyLevel <= 2) {
    visualType = Math.random() > 0.5 ? "dots" : "blocks";
  } else if (difficultyLevel <= 4) {
    visualType = Math.random() > 0.7 ? "none" : "dots";
  } else {
    visualType = "none";
  }
  
  return { id, num1, num2, operator, answer, options, visualType };
}

// Generate answer options including the correct answer
function generateOptions(correctAnswer: number, maxNum: number): number[] {
  const options = new Set<number>([correctAnswer]);
  
  // Add nearby wrong answers
  const nearby = [correctAnswer - 1, correctAnswer + 1, correctAnswer - 2, correctAnswer + 2];
  nearby.forEach(n => {
    if (n >= 0 && n <= maxNum + 10 && options.size < 4) {
      options.add(n);
    }
  });
  
  // Fill remaining with random numbers
  while (options.size < 4) {
    const random = Math.floor(Math.random() * (maxNum + 5));
    if (random >= 0) {
      options.add(random);
    }
  }
  
  // Shuffle options
  return Array.from(options).sort(() => Math.random() - 0.5);
}

// Calculate stars earned based on accuracy
export function calculateStars(accuracy: number): number {
  if (accuracy >= 90) return 3;
  if (accuracy >= 70) return 2;
  if (accuracy >= 50) return 1;
  return 0;
}

// Check and award badges
export function checkBadges(progress: ProgressData): string[] {
  const newBadges: string[] = [];
  
  if (progress.totalSessions >= 1 && !progress.badges.includes("first_session")) {
    newBadges.push("first_session");
  }
  if (progress.totalStars >= 10 && !progress.badges.includes("star_collector")) {
    newBadges.push("star_collector");
  }
  if (progress.currentStreak >= 3 && !progress.badges.includes("streak_starter")) {
    newBadges.push("streak_starter");
  }
  if (progress.currentStreak >= 7 && !progress.badges.includes("week_warrior")) {
    newBadges.push("week_warrior");
  }
  if (progress.totalCorrect >= 50 && !progress.badges.includes("math_explorer")) {
    newBadges.push("math_explorer");
  }
  if (progress.totalCorrect >= 100 && !progress.badges.includes("math_champion")) {
    newBadges.push("math_champion");
  }
  
  return newBadges;
}

// Get badge display info
export function getBadgeInfo(badgeId: string): { name: string; emoji: string; description: string } {
  const badges: Record<string, { name: string; emoji: string; description: string }> = {
    first_session: { name: "First Steps", emoji: "🎯", description: "Completed your first session!" },
    star_collector: { name: "Star Collector", emoji: "⭐", description: "Earned 10 stars!" },
    streak_starter: { name: "Streak Starter", emoji: "🔥", description: "3 days in a row!" },
    week_warrior: { name: "Week Warrior", emoji: "💪", description: "7 days in a row!" },
    math_explorer: { name: "Math Explorer", emoji: "🧭", description: "Solved 50 problems!" },
    math_champion: { name: "Math Champion", emoji: "🏆", description: "Solved 100 problems!" },
  };
  
  return badges[badgeId] || { name: "Unknown", emoji: "❓", description: "" };
}

// Update streak based on last played date
export function updateStreak(progress: ProgressData): ProgressData {
  const today = new Date().toDateString();
  const lastPlayed = progress.lastPlayedDate;
  
  if (!lastPlayed) {
    return { ...progress, currentStreak: 1, lastPlayedDate: today };
  }
  
  const lastDate = new Date(lastPlayed);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Same day, no change
    return progress;
  } else if (diffDays === 1) {
    // Consecutive day
    const newStreak = progress.currentStreak + 1;
    return {
      ...progress,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, progress.longestStreak),
      lastPlayedDate: today,
    };
  } else {
    // Streak broken
    return { ...progress, currentStreak: 1, lastPlayedDate: today };
  }
}

// Adjust difficulty based on performance
export function adjustDifficulty(progress: ProgressData, sessionAccuracy: number): number {
  const currentLevel = progress.difficultyLevel;
  
  if (sessionAccuracy >= 85 && currentLevel < 5) {
    return currentLevel + 1;
  } else if (sessionAccuracy < 50 && currentLevel > 1) {
    return currentLevel - 1;
  }
  
  return currentLevel;
}
