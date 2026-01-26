import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, Switch } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGame } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { getCrossingTenAccuracy, ProgressData, GameSettings, SessionResult } from "@/lib/game-store";
import * as Haptics from "expo-haptics";

type TabType = "dashboard" | "settings";

export default function ParentScreen() {
  const { progress, settings, updateSettings, resetProgress, isLoading } = useGame();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleUnlock = () => {
    if (pinInput === settings.parentPin) {
      setIsUnlocked(true);
      setPinError(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setPinError(true);
      setPinInput("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  // PIN Lock Screen
  if (!isUnlocked) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 justify-center items-center gap-6">
          <View 
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.lockEmoji}>🔒</Text>
          </View>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-foreground">Parent Area</Text>
            <Text className="text-base text-muted text-center">
              Enter PIN to access dashboard and settings
            </Text>
          </View>
          
          <View className="w-full max-w-[200px]">
            <TextInput
              value={pinInput}
              onChangeText={setPinInput}
              placeholder="Enter PIN"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleUnlock}
              style={[
                styles.pinInput,
                { 
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: pinError ? colors.error : colors.border,
                }
              ]}
            />
            {pinError && (
              <Text className="text-sm text-center mt-2" style={{ color: colors.error }}>
                Incorrect PIN. Try again.
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleUnlock}
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.unlockButtonText}>Unlock</Text>
          </TouchableOpacity>

          <Text className="text-xs text-muted text-center px-8">
            Default PIN is 1234. You can change it in settings.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // Calculate stats
  const recentSessions = progress.sessionHistory.slice(0, 7);
  const avgAccuracy = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length)
    : 0;
  const totalTimeMinutes = Math.round(
    recentSessions.reduce((sum, s) => sum + (s.averageTime * s.totalProblems), 0) / 60000
  );
  const crossingTenAccuracy = getCrossingTenAccuracy(progress);

  return (
    <ScreenContainer className="px-6">
      {/* Tab Switcher */}
      <View className="flex-row bg-surface rounded-xl p-1 mt-4 mb-6">
        <TouchableOpacity
          onPress={() => setActiveTab("dashboard")}
          style={[
            styles.tab,
            activeTab === "dashboard" && { backgroundColor: colors.primary }
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === "dashboard" ? "#FFFFFF" : colors.muted }
          ]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("settings")}
          style={[
            styles.tab,
            activeTab === "settings" && { backgroundColor: colors.primary }
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === "settings" ? "#FFFFFF" : colors.muted }
          ]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {activeTab === "dashboard" ? (
          <DashboardContent 
            progress={progress} 
            avgAccuracy={avgAccuracy}
            totalTimeMinutes={totalTimeMinutes}
            crossingTenAccuracy={crossingTenAccuracy}
            recentSessions={recentSessions}
            colors={colors}
          />
        ) : (
          <SettingsContent 
            settings={settings}
            updateSettings={updateSettings}
            resetProgress={resetProgress}
            colors={colors}
          />
        )}
      </ScrollView>

      {/* Lock button */}
      <TouchableOpacity
        onPress={() => {
          setIsUnlocked(false);
          setPinInput("");
        }}
        style={[styles.lockButton, { backgroundColor: colors.surface }]}
        activeOpacity={0.8}
      >
        <Text className="text-sm text-muted">Lock</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

interface DashboardContentProps {
  progress: ProgressData;
  avgAccuracy: number;
  totalTimeMinutes: number;
  crossingTenAccuracy: number;
  recentSessions: SessionResult[];
  colors: ReturnType<typeof useColors>;
}

function DashboardContent({ progress, avgAccuracy, crossingTenAccuracy, recentSessions, colors }: DashboardContentProps) {
  return (
    <View className="gap-6">
      {/* Overview Cards */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">Overview</Text>
        <View className="flex-row flex-wrap gap-3">
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text className="text-sm text-muted mb-1">Current Level</Text>
            <Text style={[styles.cardValue, { color: colors.primary }]}>
              Level {progress.difficultyLevel}
            </Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text className="text-sm text-muted mb-1">Avg Accuracy (7 days)</Text>
            <Text style={[styles.cardValue, { color: colors.success }]}>
              {avgAccuracy}%
            </Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text className="text-sm text-muted mb-1">Total Sessions</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {progress.totalSessions}
            </Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text className="text-sm text-muted mb-1">Problems Solved</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {progress.totalProblems}
            </Text>
          </View>
        </View>
      </View>

      {/* Crossing Ten Skill Tracking */}
      {progress.crossingTenTotal > 0 && (
        <View>
          <Text className="text-xl font-bold text-foreground mb-4">Key Skill: Crossing Ten</Text>
          <View 
            className="bg-surface rounded-xl p-4"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="font-medium text-foreground">Accuracy</Text>
                <Text className="text-xs text-muted">
                  {progress.crossingTenCorrect}/{progress.crossingTenTotal} correct
                </Text>
              </View>
              <Text style={[styles.cardValue, { 
                color: crossingTenAccuracy >= 70 ? colors.success : 
                       crossingTenAccuracy >= 50 ? colors.warning : colors.error 
              }]}>
                {crossingTenAccuracy}%
              </Text>
            </View>
            <View className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${crossingTenAccuracy}%`,
                  backgroundColor: crossingTenAccuracy >= 70 ? colors.success : 
                                   crossingTenAccuracy >= 50 ? colors.warning : colors.error
                }}
              />
            </View>
            <Text className="text-xs text-muted mt-2">
              "Crossing ten" (e.g., 7+5=12) is a key 1st grade skill. This tracks how well your child handles these problems.
            </Text>
          </View>
        </View>
      )}

      {/* AI Insights */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">AI Insights</Text>
        <View 
          className="bg-surface rounded-xl p-4"
          style={{ borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.primary + "10" }}
        >
          <View className="flex-row items-start gap-3">
            <Text style={styles.insightEmoji}>🤖</Text>
            <View className="flex-1">
              <Text className="font-semibold text-foreground mb-2">Learning Analysis</Text>
              {progress.totalSessions === 0 ? (
                <Text className="text-sm text-muted leading-5">
                  No sessions completed yet. Once your child starts practicing, we'll provide personalized insights about their learning patterns and progress.
                </Text>
              ) : (
                <Text className="text-sm text-muted leading-5">
                  {generateInsight(progress, avgAccuracy, crossingTenAccuracy)}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Recent Sessions */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">Recent Sessions</Text>
        {recentSessions.length === 0 ? (
          <View 
            className="bg-surface rounded-xl p-6 items-center"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text className="text-muted text-center">
              No sessions yet. Start practicing to see progress here!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {recentSessions.map((session, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between bg-surface rounded-xl p-4"
                style={{ borderColor: colors.border, borderWidth: 1 }}
              >
                <View>
                  <Text className="font-medium text-foreground">
                    {new Date(session.date).toLocaleDateString()}
                  </Text>
                  <Text className="text-xs text-muted">
                    {session.correctAnswers}/{session.totalProblems} correct
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text style={{ color: colors.warning }}>
                    {"⭐".repeat(session.starsEarned)}
                  </Text>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: session.accuracy >= 70 ? colors.success + "20" : colors.warning + "20" }}
                  >
                    <Text style={{ 
                      color: session.accuracy >= 70 ? colors.success : colors.warning,
                      fontSize: 12,
                      fontWeight: "600"
                    }}>
                      {session.accuracy}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function generateInsight(progress: ProgressData, avgAccuracy: number, crossingTenAccuracy: number): string {
  const insights: string[] = [];
  
  // Overall performance
  if (avgAccuracy >= 85) {
    insights.push(`Excellent progress! Your child is performing well with ${avgAccuracy}% accuracy.`);
  } else if (avgAccuracy >= 70) {
    insights.push(`Good progress! Your child is building confidence with ${avgAccuracy}% accuracy.`);
  } else if (avgAccuracy >= 50) {
    insights.push(`Your child is working through foundational concepts with ${avgAccuracy}% accuracy.`);
  } else {
    insights.push(`Your child is in the early learning phase. The system is providing extra visual support.`);
  }
  
  // Crossing-ten specific insight
  if (progress.crossingTenTotal >= 5) {
    if (crossingTenAccuracy >= 80) {
      insights.push(`They're mastering "crossing ten" problems (${crossingTenAccuracy}% accuracy) - a key 1st grade skill!`);
    } else if (crossingTenAccuracy >= 50) {
      insights.push(`"Crossing ten" problems (like 7+5) need more practice (${crossingTenAccuracy}% accuracy). The system will provide more visual aids for these.`);
    } else {
      insights.push(`"Crossing ten" problems are challenging right now (${crossingTenAccuracy}% accuracy). Consider using physical objects at home to practice.`);
    }
  }
  
  // Streak encouragement
  if (progress.currentStreak >= 7) {
    insights.push(`Amazing ${progress.currentStreak}-day streak! Consistency is building strong math foundations.`);
  } else if (progress.currentStreak >= 3) {
    insights.push(`Great ${progress.currentStreak}-day streak! Keep the momentum going.`);
  }
  
  // Difficulty adjustment
  if (progress.difficultyLevel >= 4) {
    insights.push(`They're ready for advanced problems at Level ${progress.difficultyLevel}.`);
  } else if (progress.difficultyLevel === 1 && progress.totalSessions > 3) {
    insights.push(`The system is keeping problems simple to build confidence before advancing.`);
  }
  
  return insights.join(" ");
}

interface SettingsContentProps {
  settings: GameSettings;
  updateSettings: (updates: Partial<GameSettings>) => Promise<void>;
  resetProgress: () => Promise<void>;
  colors: ReturnType<typeof useColors>;
}

function SettingsContent({ settings, updateSettings, resetProgress, colors }: SettingsContentProps) {
  const [newPin, setNewPin] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handlePinChange = () => {
    if (newPin.length === 4) {
      updateSettings({ parentPin: newPin });
      setNewPin("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  return (
    <View className="gap-6">
      {/* Session Settings */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">Session Settings</Text>
        <View 
          className="bg-surface rounded-xl p-4"
          style={{ borderColor: colors.border, borderWidth: 1 }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-medium text-foreground">Problems per Session</Text>
              <Text className="text-xs text-muted">Current: {settings.sessionLength}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => updateSettings({ sessionLength: Math.max(5, settings.sessionLength - 5) })}
                style={[styles.adjustButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text className="text-lg text-foreground">-</Text>
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-foreground w-8 text-center">
                {settings.sessionLength}
              </Text>
              <TouchableOpacity
                onPress={() => updateSettings({ sessionLength: Math.min(30, settings.sessionLength + 5) })}
                style={[styles.adjustButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text className="text-lg text-foreground">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="font-medium text-foreground">Sound Effects</Text>
              <Text className="text-xs text-muted">Audio feedback for answers</Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => updateSettings({ soundEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.soundEnabled ? colors.primary : colors.muted}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="font-medium text-foreground">Haptic Feedback</Text>
              <Text className="text-xs text-muted">Vibration on interactions</Text>
            </View>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(value) => updateSettings({ hapticEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary + "80" }}
              thumbColor={settings.hapticEnabled ? colors.primary : colors.muted}
            />
          </View>
        </View>
      </View>

      {/* Security */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">Security</Text>
        <View 
          className="bg-surface rounded-xl p-4"
          style={{ borderColor: colors.border, borderWidth: 1 }}
        >
          <Text className="font-medium text-foreground mb-2">Change PIN</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              value={newPin}
              onChangeText={setNewPin}
              placeholder="New 4-digit PIN"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handlePinChange}
              style={[
                styles.pinInputSmall,
                { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }
              ]}
            />
            <TouchableOpacity
              onPress={handlePinChange}
              disabled={newPin.length !== 4}
              style={[
                styles.saveButton,
                { backgroundColor: newPin.length === 4 ? colors.primary : colors.muted }
              ]}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Data Management */}
      <View>
        <Text className="text-xl font-bold text-foreground mb-4">Data Management</Text>
        <View 
          className="bg-surface rounded-xl p-4"
          style={{ borderColor: colors.error, borderWidth: 1 }}
        >
          {!showResetConfirm ? (
            <TouchableOpacity
              onPress={() => setShowResetConfirm(true)}
              activeOpacity={0.8}
            >
              <Text className="font-medium" style={{ color: colors.error }}>
                Reset All Progress
              </Text>
              <Text className="text-xs text-muted mt-1">
                This will delete all stars, badges, and session history
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-3">
              <Text className="font-medium" style={{ color: colors.error }}>
                Are you sure? This cannot be undone.
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowResetConfirm(false)}
                  style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text className="text-foreground">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    resetProgress();
                    setShowResetConfirm(false);
                  }}
                  style={[styles.confirmButton, { backgroundColor: colors.error }]}
                >
                  <Text style={{ color: "#FFFFFF" }}>Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* About */}
      <View 
        className="bg-surface rounded-xl p-4 items-center"
        style={{ borderColor: colors.border, borderWidth: 1 }}
      >
        <Text style={styles.aboutEmoji}>🧮</Text>
        <Text className="font-semibold text-foreground">MathFuel</Text>
        <Text className="text-xs text-muted">Adaptive Math Learning for 1st Grade</Text>
        <Text className="text-xs text-muted mt-2">Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockEmoji: {
    fontSize: 40,
  },
  pinInput: {
    fontSize: 24,
    textAlign: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    letterSpacing: 8,
  },
  unlockButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 24,
  },
  unlockButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  lockButton: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  insightEmoji: {
    fontSize: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pinInputSmall: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  aboutEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
});
