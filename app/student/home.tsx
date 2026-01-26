import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGame } from "@/lib/game-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const STUDENT_KEY = "mathfuel_current_student";

type StudentData = {
  id: number;
  firstName: string;
  avatar: string | null;
  totalStars: number;
  currentStreak: number;
  difficultyLevel: number;
};

export default function StudentHomeScreen() {
  const colors = useColors();
  const { progress, isLoading: gameLoading } = useGame();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      const studentId = await AsyncStorage.getItem(STUDENT_KEY);
      if (!studentId) {
        // No student logged in, redirect to login
        router.replace("/student" as any);
        return;
      }

      // Load student data from local storage
      const savedData = await AsyncStorage.getItem(`mathfuel_student_data_${studentId}`);
      if (savedData) {
        setStudent(JSON.parse(savedData));
      } else {
        // Create default student data
        const defaultStudent: StudentData = {
          id: parseInt(studentId, 10),
          firstName: "Student",
          avatar: "🦊",
          totalStars: progress.totalStars,
          currentStreak: progress.currentStreak,
          difficultyLevel: progress.difficultyLevel,
        };
        setStudent(defaultStudent);
      }
    } catch (err) {
      console.error("Failed to load student:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMath = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/practice");
  };

  const handleSwitchStudent = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await AsyncStorage.removeItem(STUDENT_KEY);
    router.replace("/student" as any);
  };

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6">
      {/* Header with Switch Student */}
      <View className="flex-row items-center justify-between mt-4 mb-8">
        <View className="flex-row items-center gap-3">
          <View 
            className="w-12 h-12 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.avatar}>{student?.avatar || "👤"}</Text>
          </View>
          <View>
            <Text className="text-lg font-semibold text-foreground">
              {student?.firstName || "Student"}
            </Text>
            <Text className="text-xs text-muted">Ready to learn!</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={handleSwitchStudent}
          style={[styles.switchButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Text className="text-xs text-muted">Switch</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center gap-8">
        {/* Stats Display */}
        <View className="flex-row gap-6">
          <View className="items-center">
            <Text style={styles.statValue}>{progress.totalStars}</Text>
            <Text className="text-sm text-muted">⭐ Stars</Text>
          </View>
          <View className="items-center">
            <Text style={styles.statValue}>{progress.currentStreak}</Text>
            <Text className="text-sm text-muted">🔥 Streak</Text>
          </View>
        </View>

        {/* Big Start Button */}
        <TouchableOpacity
          onPress={handleStartMath}
          style={[styles.startButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonEmoji}>🚀</Text>
          <Text style={styles.startButtonText}>Start Math!</Text>
        </TouchableOpacity>

        {/* Encouragement Text */}
        <Text className="text-base text-muted text-center">
          {getEncouragementText(progress.currentStreak, progress.totalStars)}
        </Text>
      </View>

      {/* Level Indicator */}
      <View className="items-center pb-8">
        <View 
          className="px-4 py-2 rounded-full"
          style={{ backgroundColor: colors.surface }}
        >
          <Text className="text-sm text-muted">
            Level {progress.difficultyLevel} • {getLevelName(progress.difficultyLevel)}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

function getEncouragementText(streak: number, stars: number): string {
  if (streak >= 7) return "Amazing streak! Keep it going! 🌟";
  if (streak >= 3) return "Great job! You're on a roll! 🎉";
  if (stars >= 50) return "You're a math superstar! ⭐";
  if (stars >= 20) return "Keep collecting those stars! 🌟";
  if (stars >= 5) return "You're doing great! 👏";
  return "Let's practice some math today! 📚";
}

function getLevelName(level: number): string {
  const names = ["Beginner", "Explorer", "Adventurer", "Champion", "Master"];
  return names[Math.min(level - 1, names.length - 1)];
}

const styles = StyleSheet.create({
  avatar: {
    fontSize: 24,
  },
  switchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "bold",
  },
  startButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});
