import { describe, it, expect } from "vitest";
import {
  generateProblem,
  generateOptions,
  calculateStars,
  checkBadges,
  updateStreak,
  adjustDifficulty,
  getBadgeInfo,
  getCrossingTenAccuracy,
  ProgressData,
} from "./game-store";

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

function createBaseProgress(overrides: Partial<ProgressData> = {}): ProgressData {
  return {
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
    ...overrides,
  };
}

// ============================================================================
// PROBLEM GENERATION TESTS
// ============================================================================

describe("generateProblem", () => {
  it("generates a valid math problem structure", () => {
    const problem = generateProblem(1, []);
    
    expect(problem).toHaveProperty("id");
    expect(problem).toHaveProperty("num1");
    expect(problem).toHaveProperty("num2");
    expect(problem).toHaveProperty("operator");
    expect(problem).toHaveProperty("answer");
    expect(problem).toHaveProperty("options");
    expect(problem).toHaveProperty("visualType");
    expect(problem).toHaveProperty("isCrossingTen");
    
    expect(typeof problem.id).toBe("string");
    expect(problem.id.length).toBeGreaterThan(0);
  });

  it("generates positive numbers only", () => {
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(Math.floor(Math.random() * 5) + 1, []);
      expect(problem.num1).toBeGreaterThan(0);
      expect(problem.num2).toBeGreaterThan(0);
      expect(problem.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it("generates correct addition answers", () => {
    for (let i = 0; i < 50; i++) {
      const problem = generateProblem(1, []); // Level 1 is addition only
      if (problem.operator === "+") {
        expect(problem.answer).toBe(problem.num1 + problem.num2);
      }
    }
  });

  it("generates correct subtraction answers with non-negative results", () => {
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(4, []); // Level 4 has subtraction
      if (problem.operator === "-") {
        expect(problem.answer).toBe(problem.num1 - problem.num2);
        expect(problem.answer).toBeGreaterThanOrEqual(0);
        expect(problem.num1).toBeGreaterThanOrEqual(problem.num2);
      }
    }
  });

  it("generates subtraction only at level 3+", () => {
    // Level 1-2 should be addition only
    for (let i = 0; i < 50; i++) {
      const problem1 = generateProblem(1, []);
      const problem2 = generateProblem(2, []);
      expect(problem1.operator).toBe("+");
      expect(problem2.operator).toBe("+");
    }
    
    // Level 3+ should have some subtraction
    let hasSubtraction = false;
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(4, []);
      if (problem.operator === "-") {
        hasSubtraction = true;
        break;
      }
    }
    expect(hasSubtraction).toBe(true);
  });

  it("generates unique problem IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(1, []);
      expect(ids.has(problem.id)).toBe(false);
      ids.add(problem.id);
    }
  });

  it("correctly identifies crossing-ten problems", () => {
    // Generate many problems and check crossing-ten flag
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(3, []);
      if (problem.operator === "+") {
        const expectedCrossing = problem.num1 < 10 && problem.num2 < 10 && problem.answer >= 10;
        expect(problem.isCrossingTen).toBe(expectedCrossing);
      }
    }
  });

  it("respects difficulty level for number ranges", () => {
    // Level 1 should have smaller numbers
    for (let i = 0; i < 50; i++) {
      const problem = generateProblem(1, []);
      expect(problem.num1).toBeLessThanOrEqual(8); // maxNum = 5, but can go slightly over
      expect(problem.num2).toBeLessThanOrEqual(8);
    }
    
    // Level 5 can have larger numbers
    let hasLargeNumber = false;
    for (let i = 0; i < 100; i++) {
      const problem = generateProblem(5, []);
      if (problem.num1 > 10 || problem.num2 > 10) {
        hasLargeNumber = true;
        break;
      }
    }
    expect(hasLargeNumber).toBe(true);
  });
});

// ============================================================================
// OPTIONS GENERATION TESTS
// ============================================================================

describe("generateOptions", () => {
  it("always returns exactly 4 options", () => {
    for (let answer = 0; answer <= 30; answer++) {
      const options = generateOptions(answer);
      expect(options).toHaveLength(4);
    }
  });

  it("always includes the correct answer", () => {
    for (let answer = 0; answer <= 30; answer++) {
      const options = generateOptions(answer);
      expect(options).toContain(answer);
    }
  });

  it("never includes duplicate options", () => {
    for (let answer = 0; answer <= 30; answer++) {
      const options = generateOptions(answer);
      const uniqueOptions = new Set(options);
      expect(uniqueOptions.size).toBe(4);
    }
  });

  it("never includes negative numbers", () => {
    for (let answer = 0; answer <= 30; answer++) {
      const options = generateOptions(answer);
      options.forEach(opt => {
        expect(opt).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("handles edge case of answer = 0", () => {
    const options = generateOptions(0);
    expect(options).toHaveLength(4);
    expect(options).toContain(0);
    options.forEach(opt => {
      expect(opt).toBeGreaterThanOrEqual(0);
    });
  });

  it("shuffles options (not always in same order)", () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const options = generateOptions(10);
      results.add(options.join(","));
    }
    // Should have multiple different orderings
    expect(results.size).toBeGreaterThan(1);
  });
});

// ============================================================================
// STARS CALCULATION TESTS
// ============================================================================

describe("calculateStars", () => {
  it("returns 3 stars for 90%+ accuracy", () => {
    expect(calculateStars(90)).toBe(3);
    expect(calculateStars(95)).toBe(3);
    expect(calculateStars(100)).toBe(3);
  });

  it("returns 2 stars for 70-89% accuracy", () => {
    expect(calculateStars(70)).toBe(2);
    expect(calculateStars(75)).toBe(2);
    expect(calculateStars(80)).toBe(2);
    expect(calculateStars(85)).toBe(2);
    expect(calculateStars(89)).toBe(2);
  });

  it("returns 1 star for 50-69% accuracy", () => {
    expect(calculateStars(50)).toBe(1);
    expect(calculateStars(55)).toBe(1);
    expect(calculateStars(60)).toBe(1);
    expect(calculateStars(65)).toBe(1);
    expect(calculateStars(69)).toBe(1);
  });

  it("returns 0 stars for below 50% accuracy", () => {
    expect(calculateStars(0)).toBe(0);
    expect(calculateStars(25)).toBe(0);
    expect(calculateStars(49)).toBe(0);
  });

  it("handles edge cases", () => {
    expect(calculateStars(-10)).toBe(0); // Negative clamped to 0
    expect(calculateStars(150)).toBe(3); // Over 100 clamped to 100
  });
});

// ============================================================================
// BADGE TESTS
// ============================================================================

describe("checkBadges", () => {
  it("awards first_session badge after first session", () => {
    const progress = createBaseProgress({ totalSessions: 1 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("first_session");
  });

  it("awards star_collector badge at 10 stars", () => {
    const progress = createBaseProgress({ totalStars: 10 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("star_collector");
  });

  it("awards streak_starter badge at 3 day streak", () => {
    const progress = createBaseProgress({ currentStreak: 3 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("streak_starter");
  });

  it("awards week_warrior badge at 7 day streak", () => {
    const progress = createBaseProgress({ currentStreak: 7 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("week_warrior");
  });

  it("awards math_explorer badge at 50 correct answers", () => {
    const progress = createBaseProgress({ totalCorrect: 50 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("math_explorer");
  });

  it("awards math_champion badge at 100 correct answers", () => {
    const progress = createBaseProgress({ totalCorrect: 100 });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("math_champion");
  });

  it("does not re-award already earned badges", () => {
    const progress = createBaseProgress({ 
      totalSessions: 1, 
      badges: ["first_session"] 
    });
    const newBadges = checkBadges(progress);
    expect(newBadges).not.toContain("first_session");
  });

  it("can award multiple badges at once", () => {
    const progress = createBaseProgress({ 
      totalSessions: 1,
      totalStars: 10,
      currentStreak: 3,
    });
    const newBadges = checkBadges(progress);
    expect(newBadges).toContain("first_session");
    expect(newBadges).toContain("star_collector");
    expect(newBadges).toContain("streak_starter");
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

// ============================================================================
// STREAK TESTS
// ============================================================================

describe("updateStreak", () => {
  it("starts streak at 1 for first play", () => {
    const progress = createBaseProgress();
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastPlayedDate).toBe(new Date().toDateString());
  });

  it("maintains streak on same day", () => {
    const today = new Date().toDateString();
    const progress = createBaseProgress({ 
      currentStreak: 5, 
      lastPlayedDate: today 
    });
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(5);
    expect(result.lastPlayedDate).toBe(today);
  });

  it("increments streak on consecutive day", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const progress = createBaseProgress({ 
      currentStreak: 3, 
      longestStreak: 3,
      lastPlayedDate: yesterday 
    });
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  it("resets streak after missing a day", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toDateString();
    const progress = createBaseProgress({ 
      currentStreak: 5, 
      longestStreak: 5,
      lastPlayedDate: twoDaysAgo 
    });
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(1);
    // Longest streak should remain unchanged
    expect(result.longestStreak).toBe(5);
  });

  it("updates longest streak when current exceeds it", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const progress = createBaseProgress({ 
      currentStreak: 5, 
      longestStreak: 5, 
      lastPlayedDate: yesterday 
    });
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  it("preserves longest streak when resetting current", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toDateString();
    const progress = createBaseProgress({ 
      currentStreak: 2, 
      longestStreak: 10, 
      lastPlayedDate: threeDaysAgo 
    });
    const result = updateStreak(progress);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
  });
});

// ============================================================================
// ADAPTIVE DIFFICULTY TESTS
// ============================================================================

describe("adjustDifficulty", () => {
  it("increases difficulty when accuracy is 85%+", () => {
    const progress = createBaseProgress({ difficultyLevel: 3 });
    expect(adjustDifficulty(progress, 85)).toBe(4);
    expect(adjustDifficulty(progress, 90)).toBe(4);
    expect(adjustDifficulty(progress, 100)).toBe(4);
  });

  it("decreases difficulty when accuracy is below 50%", () => {
    const progress = createBaseProgress({ difficultyLevel: 3 });
    expect(adjustDifficulty(progress, 49)).toBe(2);
    expect(adjustDifficulty(progress, 30)).toBe(2);
    expect(adjustDifficulty(progress, 0)).toBe(2);
  });

  it("maintains difficulty for moderate accuracy (50-84%)", () => {
    const progress = createBaseProgress({ difficultyLevel: 3 });
    expect(adjustDifficulty(progress, 50)).toBe(3);
    expect(adjustDifficulty(progress, 70)).toBe(3);
    expect(adjustDifficulty(progress, 84)).toBe(3);
  });

  it("does not exceed max difficulty of 5", () => {
    const progress = createBaseProgress({ difficultyLevel: 5 });
    expect(adjustDifficulty(progress, 100)).toBe(5);
  });

  it("does not go below min difficulty of 1", () => {
    const progress = createBaseProgress({ difficultyLevel: 1 });
    expect(adjustDifficulty(progress, 0)).toBe(1);
  });

  it("considers crossing-ten accuracy when provided", () => {
    const progress = createBaseProgress({ difficultyLevel: 3 });
    // High overall accuracy but low crossing-ten accuracy should not increase
    expect(adjustDifficulty(progress, 90, 40)).toBe(3);
    // High overall and crossing-ten accuracy should increase
    expect(adjustDifficulty(progress, 90, 80)).toBe(4);
  });
});

// ============================================================================
// CROSSING-TEN ACCURACY TESTS
// ============================================================================

describe("getCrossingTenAccuracy", () => {
  it("returns 0 when no crossing-ten problems attempted", () => {
    const progress = createBaseProgress({ crossingTenTotal: 0 });
    expect(getCrossingTenAccuracy(progress)).toBe(0);
  });

  it("calculates correct percentage", () => {
    const progress = createBaseProgress({ 
      crossingTenCorrect: 7, 
      crossingTenTotal: 10 
    });
    expect(getCrossingTenAccuracy(progress)).toBe(70);
  });

  it("rounds to nearest integer", () => {
    const progress = createBaseProgress({ 
      crossingTenCorrect: 1, 
      crossingTenTotal: 3 
    });
    expect(getCrossingTenAccuracy(progress)).toBe(33);
  });
});
