import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import {
  ProgressData,
  GameSettings,
  loadProgress,
  saveProgress,
  loadSettings,
  saveSettings,
  updateStreak,
  checkBadges,
  adjustDifficulty,
  calculateStars,
  SessionResult,
} from "./game-store";

interface GameContextType {
  progress: ProgressData;
  settings: GameSettings;
  isLoading: boolean;
  updateProgress: (updates: Partial<ProgressData>) => Promise<void>;
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>;
  completeSession: (result: Omit<SessionResult, "date" | "starsEarned">) => Promise<{ starsEarned: number; newBadges: string[] }>;
  resetProgress: () => Promise<void>;
}

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

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressData>(defaultProgress);
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const [loadedProgress, loadedSettings] = await Promise.all([
        loadProgress(),
        loadSettings(),
      ]);
      setProgress(loadedProgress);
      setSettings(loadedSettings);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const updateProgress = useCallback(async (updates: Partial<ProgressData>) => {
    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);
    await saveProgress(newProgress);
  }, [progress]);

  const updateSettings = useCallback(async (updates: Partial<GameSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings]);

  const completeSession = useCallback(async (result: Omit<SessionResult, "date" | "starsEarned">) => {
    const starsEarned = calculateStars(result.accuracy);
    const sessionResult: SessionResult = {
      ...result,
      date: new Date().toISOString(),
      starsEarned,
    };

    // Update progress
    let newProgress = updateStreak(progress);
    
    // Calculate crossing-ten accuracy for this session
    const crossingTenAccuracy = result.crossingTenTotal > 0 
      ? Math.round((result.crossingTenCorrect / result.crossingTenTotal) * 100)
      : undefined;
    
    newProgress = {
      ...newProgress,
      totalStars: newProgress.totalStars + starsEarned,
      totalSessions: newProgress.totalSessions + 1,
      totalProblems: newProgress.totalProblems + result.totalProblems,
      totalCorrect: newProgress.totalCorrect + result.correctAnswers,
      crossingTenCorrect: newProgress.crossingTenCorrect + (result.crossingTenCorrect || 0),
      crossingTenTotal: newProgress.crossingTenTotal + (result.crossingTenTotal || 0),
      sessionHistory: [sessionResult, ...newProgress.sessionHistory].slice(0, 30), // Keep last 30 sessions
      difficultyLevel: adjustDifficulty(newProgress, result.accuracy, crossingTenAccuracy),
    };

    // Check for new badges
    const newBadges = checkBadges(newProgress);
    if (newBadges.length > 0) {
      newProgress.badges = [...newProgress.badges, ...newBadges];
    }

    setProgress(newProgress);
    await saveProgress(newProgress);

    return { starsEarned, newBadges };
  }, [progress]);

  const resetProgress = useCallback(async () => {
    setProgress(defaultProgress);
    await saveProgress(defaultProgress);
  }, []);

  return (
    <GameContext.Provider
      value={{
        progress,
        settings,
        isLoading,
        updateProgress,
        updateSettings,
        completeSession,
        resetProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
