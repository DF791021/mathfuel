import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Platform, Dimensions } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useGame } from "@/lib/game-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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
  const { progress } = useGame();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPressed, setIsPressed] = useState(false);

  // Animation values
  const rocketY = useSharedValue(0);
  const rocketRotate = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0);
  const starScale1 = useSharedValue(0);
  const starScale2 = useSharedValue(0);
  const starScale3 = useSharedValue(0);
  const streakPulse = useSharedValue(1);
  const cloudX1 = useSharedValue(-100);
  const cloudX2 = useSharedValue(-150);

  useEffect(() => {
    loadStudentData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Rocket floating animation
    rocketY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Subtle rocket rotation
    rocketRotate.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Button glow pulse
    buttonGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Stars twinkling
    starScale1.value = withDelay(0, withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.5, { duration: 800 })
      ),
      -1,
      true
    ));
    starScale2.value = withDelay(300, withRepeat(
      withSequence(
        withTiming(1, { duration: 900 }),
        withTiming(0.4, { duration: 900 })
      ),
      -1,
      true
    ));
    starScale3.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.6, { duration: 700 })
      ),
      -1,
      true
    ));

    // Cloud floating
    cloudX1.value = withRepeat(
      withTiming(SCREEN_WIDTH + 100, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    cloudX2.value = withDelay(5000, withRepeat(
      withTiming(SCREEN_WIDTH + 150, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    ));
  };

  useEffect(() => {
    // Streak pulse if active
    if (progress.currentStreak > 0) {
      streakPulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [progress.currentStreak]);

  const loadStudentData = async () => {
    try {
      const studentId = await AsyncStorage.getItem(STUDENT_KEY);
      if (!studentId) {
        router.replace("/student" as any);
        return;
      }

      const savedData = await AsyncStorage.getItem(`mathfuel_student_data_${studentId}`);
      if (savedData) {
        setStudent(JSON.parse(savedData));
      } else {
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    buttonScale.value = withSequence(
      withTiming(0.92, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );
    
    setTimeout(() => {
      router.push("/practice");
    }, 200);
  };

  const handleSwitchStudent = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await AsyncStorage.removeItem(STUDENT_KEY);
    router.replace("/student" as any);
  };

  // Animated styles
  const rocketStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: rocketY.value },
      { rotate: `${rocketRotate.value}deg` },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const buttonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(buttonGlow.value, [0, 1], [0.3, 0.7]),
    transform: [{ scale: interpolate(buttonGlow.value, [0, 1], [1, 1.15]) }],
  }));

  const star1Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale1.value }],
    opacity: starScale1.value,
  }));

  const star2Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale2.value }],
    opacity: starScale2.value,
  }));

  const star3Style = useAnimatedStyle(() => ({
    transform: [{ scale: starScale3.value }],
    opacity: starScale3.value,
  }));

  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakPulse.value }],
  }));

  const cloud1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX1.value }],
  }));

  const cloud2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX2.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.loadingContainer]}>
        <LinearGradient
          colors={['#87CEEB', '#B0E0E6', '#E0F7FA']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingEmoji}>🚀</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sky gradient background */}
      <LinearGradient
        colors={['#87CEEB', '#B0E0E6', '#E0F7FA']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Floating clouds */}
      <Animated.View style={[styles.cloud, styles.cloud1, cloud1Style]}>
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloud, styles.cloud2, cloud2Style]}>
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>

      {/* Twinkling stars */}
      <Animated.Text style={[styles.star, styles.star1, star1Style]}>⭐</Animated.Text>
      <Animated.Text style={[styles.star, styles.star2, star2Style]}>✨</Animated.Text>
      <Animated.Text style={[styles.star, styles.star3, star3Style]}>⭐</Animated.Text>

      <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-transparent">
        <View style={styles.content}>
          {/* Header with avatar and switch button */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar}>{student?.avatar || "🦊"}</Text>
              </View>
              <View>
                <Text style={styles.greeting}>Hi, {student?.firstName || "Student"}!</Text>
                <Text style={styles.subGreeting}>Ready to learn? 🎯</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleSwitchStudent}
              style={styles.switchButton}
              activeOpacity={0.8}
            >
              <Text style={styles.switchText}>Switch</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Animated.View style={[styles.statBubble, streakStyle]}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{progress.currentStreak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </Animated.View>
            <View style={styles.statBubble}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{progress.totalStars}</Text>
              <Text style={styles.statLabel}>Stars</Text>
            </View>
            <View style={styles.statBubble}>
              <Text style={styles.statEmoji}>🏆</Text>
              <Text style={styles.statValue}>{progress.badges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>

          {/* Rocket mascot */}
          <Animated.View style={[styles.rocketContainer, rocketStyle]}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.rocketImage}
              contentFit="contain"
            />
          </Animated.View>

          {/* Main CTA Button */}
          <View style={styles.buttonContainer}>
            <Animated.View style={[styles.buttonGlow, buttonGlowStyle]} />
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                onPress={handleStartMath}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                activeOpacity={1}
                style={styles.startButtonOuter}
              >
                <LinearGradient
                  colors={isPressed ? ['#16A34A', '#15803D'] : ['#22C55E', '#16A34A']}
                  style={styles.startButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.startButtonEmoji}>🚀</Text>
                  <Text style={styles.startButtonText}>Start Math!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Encouragement text */}
          <Text style={styles.encouragement}>
            {getEncouragementText(progress.currentStreak, progress.totalStars)}
          </Text>

          {/* Level indicator */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              Level {progress.difficultyLevel} • {getLevelName(progress.difficultyLevel)}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    </View>
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  cloud: {
    position: 'absolute',
  },
  cloud1: {
    top: 80,
  },
  cloud2: {
    top: 180,
  },
  cloudEmoji: {
    fontSize: 60,
    opacity: 0.7,
  },
  star: {
    position: 'absolute',
    fontSize: 24,
  },
  star1: {
    top: 120,
    right: 40,
  },
  star2: {
    top: 200,
    left: 30,
  },
  star3: {
    top: 160,
    right: 80,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    fontSize: 28,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A5F',
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  switchButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  switchText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E3A5F',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  rocketContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  rocketImage: {
    width: 160,
    height: 160,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonGlow: {
    position: 'absolute',
    width: 280,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22C55E',
  },
  startButtonOuter: {
    borderRadius: 32,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 32,
    gap: 12,
  },
  startButtonEmoji: {
    fontSize: 32,
  },
  startButtonText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  encouragement: {
    fontSize: 16,
    color: '#1E3A5F',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  levelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
});
