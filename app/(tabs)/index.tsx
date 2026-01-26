import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useGame } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function HomeScreen() {
  const router = useRouter();
  const { progress, isLoading } = useGame();
  const colors = useColors();
  const buttonScale = useSharedValue(1);

  const handlePlayPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 15 })
    );
    router.push("/practice");
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  const todayStars = progress.sessionHistory.length > 0 && 
    new Date(progress.sessionHistory[0].date).toDateString() === new Date().toDateString()
      ? progress.sessionHistory[0].starsEarned
      : 0;

  return (
    <ScreenContainer className="px-6">
      <View className="flex-1 justify-between py-8">
        {/* Header with streak */}
        <View className="items-center gap-2">
          <View className="flex-row items-center gap-2 bg-surface px-4 py-2 rounded-full">
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text className="text-lg font-semibold text-foreground">
              {progress.currentStreak} Day Streak
            </Text>
          </View>
        </View>

        {/* Main content */}
        <View className="items-center gap-8">
          {/* Mascot/Logo area */}
          <View 
            className="w-32 h-32 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.mascotEmoji}>🧮</Text>
          </View>

          {/* Welcome message */}
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground text-center">
              Ready to Learn?
            </Text>
            <Text className="text-base text-muted text-center px-8">
              Practice math with fun visual problems!
            </Text>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-6">
            <View className="items-center bg-surface px-5 py-3 rounded-2xl">
              <Text style={styles.starEmoji}>⭐</Text>
              <Text className="text-2xl font-bold text-foreground">{progress.totalStars}</Text>
              <Text className="text-xs text-muted">Total Stars</Text>
            </View>
            <View className="items-center bg-surface px-5 py-3 rounded-2xl">
              <Text style={styles.starEmoji}>✨</Text>
              <Text className="text-2xl font-bold text-foreground">{todayStars}</Text>
              <Text className="text-xs text-muted">Today</Text>
            </View>
            <View className="items-center bg-surface px-5 py-3 rounded-2xl">
              <Text style={styles.starEmoji}>🏆</Text>
              <Text className="text-2xl font-bold text-foreground">{progress.badges.length}</Text>
              <Text className="text-xs text-muted">Badges</Text>
            </View>
          </View>
        </View>

        {/* Play button */}
        <View className="items-center pb-4">
          <Animated.View style={animatedButtonStyle}>
            <TouchableOpacity
              onPress={handlePlayPress}
              activeOpacity={0.9}
              style={[styles.playButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.playButtonText}>Play Now</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text className="text-sm text-muted mt-3">
            Level {progress.difficultyLevel} • {progress.totalSessions} sessions completed
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fireEmoji: {
    fontSize: 20,
  },
  mascotEmoji: {
    fontSize: 64,
  },
  starEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  playButton: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
});
