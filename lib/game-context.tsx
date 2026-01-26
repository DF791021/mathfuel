import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { trpc } from "./trpc";

const STUDENT_KEY = "mathfuel_current_student";

interface GameContextType {
  progress: ProgressData;
  settings: GameSettings;
  isLoading: boolean;
  currentChildId: number | null;
  updateProgress: (updates: Partial<ProgressData>) => Promise<void>;
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>;
  completeSession: (result: Omit<SessionResult, "date" | "starsEarned">) => Promise<{ starsEarned: number; newBadges: string[] }>;
  resetProgress: () => Promise<void>;
  setCurrentChild: (childId: number | null) => void;
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
  const [currentChildId, setCurrentChildId] = useState<number | null>(null);

  // tRPC mutation for saving sessions to server
  const createSessionMutation = trpc.sessions.create.useMutation();

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      const [loadedProgress, loadedSettings] = await Promise.all([
        loadProgress(),
        loadSettings(),
      ]);
      
      // Check if a student is logged in
      const savedChildId = await AsyncStorage.getItem(STUDENT_KEY);
      if (savedChildId) {
        setCurrentChildId(parseInt(savedChildId, 10));
      }
      
      setProgress(loadedProgress);
      setSettings(loadedSettings);
      setIsLoading(false);
    }
    loadData();
  }, []);

  const setCurrentChild = useCallback((childId: number | null) => {
    setCurrentChildId(childId);
    if (childId) {
      AsyncStorage.setItem(STUDENT_KEY, childId.toString());
    } else {
      AsyncStorage.removeItem(STUDENT_KEY);
    }
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
    const today = new Date().toISOString().split("T")[0];
    const sessionResult: SessionResult = {
      ...result,
      date: new Date().toISOString(),
      starsEarned,
    };

    // Update local progress
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
      sessionHistory: [sessionResult, ...newProgress.sessionHistory].slice(0, 30),
      difficultyLevel: adjustDifficulty(newProgress, result.accuracy, crossingTenAccuracy),
    };

    // Check for new badges
    const newBadges = checkBadges(newProgress);
    if (newBadges.length > 0) {
      newProgress.badges = [...newProgress.badges, ...newBadges];
    }

    setProgress(newProgress);
    await saveProgress(newProgress);

    // If a child is logged in, also save to the server database
    if (currentChildId) {
      try {
        await createSessionMutation.mutateAsync({
          childId: currentChildId,
          date: today,
          totalProblems: result.totalProblems,
          correctAnswers: result.correctAnswers,
          accuracy: result.accuracy,
          averageTime: result.averageTime,
          starsEarned,
          difficultyLevel: newProgress.difficultyLevel,
          crossingTenCorrect: result.crossingTenCorrect || 0,
          crossingTenTotal: result.crossingTenTotal || 0,
          problemDetails: JSON.stringify({
            problemTypes: result.problemTypes,
          }),
        });
        console.log("[GameContext] Session saved to server for child:", currentChildId);
      } catch (error) {
        // Log but don't fail - local progress is still saved
        console.warn("[GameContext] Failed to save session to server:", error);
      }
    }

    return { starsEarned, newBadges };
  }, [progress, currentChildId, createSessionMutation]);

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
        currentChildId,
        updateProgress,
        updateSettings,
        completeSession,
        resetProgress,
        setCurrentChild,
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
