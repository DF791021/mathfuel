import { describe, it, expect } from "vitest";
import {
  generateProblem,
  calculateStars,
  checkBadges,
  updateStreak,
  adjustDifficulty,
  getBadgeInfo,
  ProgressData,
} from "./game-store";

describe("generateProblem", () => {
  it("generates a valid math problem at difficulty level 1", () => {
    const problem = generateProblem(1, []);
    
    expect(problem).toHaveProperty("id");
    expect(problem).toHaveProperty("num1");
    expect(problem).toHaveProperty("num2");
    expect(problem).toHaveProperty("operator");
    expect(problem).toHaveProperty("answer");
    expect(problem).toHaveProperty("options");
    expect(problem).toHaveProperty("visualType");
    
    expect(problem.num1).toBeGreaterThan(0);
    expect(problem.num2).toBeGreaterThan(0);
    expect(problem.options).toHaveLength(4);
    expect(problem.options).toContain(problem.answer);
  });

  it("generates addition problems with correct answers", () => {
    // Test multiple problems to ensure correctness
    for (let i = 0; i < 10; i++) {
      const problem = generateProblem(1, []);
      if (problem.operator === "+") {
        expect(problem.answer).toBe(problem.num1 + problem.num2);
      } else {
        expect(problem.answer).toBe(problem.num1 - problem.num2);
      }
    }
  });

  it("generates subtraction problems at higher difficulty", () => {
    let hasSubtraction = false;
    // Generate multiple problems to check for subtraction
    for (let i = 0; i < 50; i++) {
      const problem = generateProblem(3, []);
      if (problem.operator === "-") {
        hasSubtraction = true;
        expect(problem.answer).toBeGreaterThanOrEqual(0);
        break;
      }
    }
    // At difficulty 3+, subtraction should appear
    expect(hasSubtraction).toBe(true);
  });

  it("includes visual type for lower difficulties", () => {
    const problem = generateProblem(1, []);
    expect(["dots", "blocks", "fingers", "none"]).toContain(problem.visualType);
  });
});

describe("calculateStars", () => {
  it("returns 3 stars for 90%+ accuracy", () => {
    expect(calculateStars(90)).toBe(3);
    expect(calculateStars(95)).toBe(3);
    expect(calculateStars(100)).toBe(3);
  });

  it("returns 2 stars for 70-89% accuracy", () => {
    expect(calculateStars(70)).toBe(2);
    expect(calculateStars(80)).toBe(2);
    expect(calculateStars(89)).toBe(2);
  });

  it("returns 1 star for 50-69% accuracy", () => {
    expect(calculateStars(50)).toBe(1);
    expect(calculateStars(60)).toBe(1);
    expect(calculateStars(69)).toBe(1);
  });

  it("returns 0 stars for below 50% accuracy", () => {
    expect(calculateStars(0)).toBe(0);
    expect(calculateStars(30)).toBe(0);
    expect(calculateStars(49)).toBe(0);
  });
});

describe("checkBadges", () => {
  const baseProgress: ProgressData = {
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

  it("awards first_session badge after first session", () => {
    const progress = { ...baseProgress, totalSessions: 1 };
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("first_session");
  });

  it("awards star_collector badge at 10 stars", () => {
    const progress = { ...baseProgress, totalStars: 10 };
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("star_collector");
  });

  it("awards streak_starter badge at 3 day streak", () => {
    const progress = { ...baseProgress, currentStreak: 3 };
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("streak_starter");
  });

  it("awards week_warrior badge at 7 day streak", () => {
    const progress = { ...baseProgress, currentStreak: 7 };
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("week_warrior");
  });

  it("awards math_explorer badge at 50 correct answers", () => {
    const progress = { ...baseProgress, totalCorrect: 50 };
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("math_explorer");
  });

  it("does not re-award already earned badges", () => {
    const progress = { ...baseProgress, totalSessions: 1, badges: ["first_session"] };
    const newBadges = checkBadges(progress);
    expect(newBadges).not.toContain("first_session");
  });
});

describe("updateStreak", () => {
  const baseProgress: ProgressData = {
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

  it("starts streak at 1 for first play", () => {
    const result = updateStreak(baseProgress);
    expect(result.currentStreak).toBe(1);
    expect(result.lastPlayedDate).toBe(new Date().toDateString());
  });

  it("maintains streak on same day", () => {
    const today = new Date().toDateString();
    const progress = { ...baseProgress, currentStreak: 5, lastPlayedDate: today };
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(5);
  });

  it("increments streak on consecutive day", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const progress = { ...baseProgress, currentStreak: 3, lastPlayedDate: yesterday };
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(4);
  });

  it("resets streak after missing a day", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toDateString();
    const progress = { ...baseProgress, currentStreak: 5, lastPlayedDate: twoDaysAgo };
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(1);
  });

  it("updates longest streak when current exceeds it", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const progress = { ...baseProgress, currentStreak: 5, longestStreak: 5, lastPlayedDate: yesterday };
    const result = updateStreak(progress);
    expect(result.longestStreak).toBe(6);
  });
});

describe("adjustDifficulty", () => {
  const baseProgress: ProgressData = {
    totalStars: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    totalProblems: 0,
    totalCorrect: 0,
    lastPlayedDate: null,
    sessionHistory: [],
    badges: [],
    difficultyLevel: 3,
    crossingTenAccuracy: 0,
  };

  it("increases difficulty when accuracy is 85%+", () => {
    const result = adjustDifficulty(baseProgress, 90);
    expect(result).toBe(4);
  });

  it("decreases difficulty when accuracy is below 50%", () => {
    const result = adjustDifficulty(baseProgress, 40);
    expect(result).toBe(2);
  });

  it("maintains difficulty for moderate accuracy", () => {
    const result = adjustDifficulty(baseProgress, 70);
    expect(result).toBe(3);
  });

  it("does not exceed max difficulty of 5", () => {
    const progress = { ...baseProgress, difficultyLevel: 5 };
    const result = adjustDifficulty(progress, 95);
    expect(result).toBe(5);
  });

  it("does not go below min difficulty of 1", () => {
    const progress = { ...baseProgress, difficultyLevel: 1 };
    const result = adjustDifficulty(progress, 30);
    expect(result).toBe(1);
  });
});

describe("getBadgeInfo", () => {
  it("returns correct info for known badges", () => {
    const badge = getBadgeInfo("first_session");
    expect(badge.name).toBe("First Steps");
    expect(badge.emoji).toBe("🎯");
    expect(badge.description).toContain("first session");
  });

  it("returns fallback for unknown badges", () => {
    const badge = getBadgeInfo("unknown_badge");
    expect(badge.name).toBe("Unknown");
    expect(badge.emoji).toBe("❓");
  });
});
