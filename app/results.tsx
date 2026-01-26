import { Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getBadgeInfo } from "@/lib/game-store";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stars: string;
    accuracy: string;
    correct: string;
    total: string;
    newBadges: string;
  }>();
  const colors = useColors();

  const stars = parseInt(params.stars || "0");
  const accuracy = parseInt(params.accuracy || "0");
  const correct = parseInt(params.correct || "0");
  const total = parseInt(params.total || "0");
  const newBadges = params.newBadges ? params.newBadges.split(",").filter(Boolean) : [];

  const celebrationScale = useSharedValue(0);
  const starScales = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    // Celebration animation sequence
    celebrationScale.value = withSpring(1, { damping: 12 });
    
    // Stars animation with delay
    starScales.forEach((scale, index) => {
      if (index < stars) {
        scale.value = withDelay(
          300 + index * 200,
          withSequence(
            withSpring(1.3, { damping: 8 }),
            withSpring(1, { damping: 12 })
          )
        );
      }
    });

    // Stats fade in
    statsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    
    // Buttons fade in
    buttonsOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));

    // Success haptic
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value,
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const getMessage = () => {
    if (accuracy >= 90) return "Amazing work!";
    if (accuracy >= 70) return "Great job!";
    if (accuracy >= 50) return "Good effort!";
    return "Keep practicing!";
  };

  const getEmoji = () => {
    if (accuracy >= 90) return "🎉";
    if (accuracy >= 70) return "🌟";
    if (accuracy >= 50) return "👍";
    return "💪";
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-6">
      <View className="flex-1 justify-center items-center gap-8">
        {/* Celebration */}
        <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
          <Text style={styles.celebrationEmoji}>{getEmoji()}</Text>
          <Text style={[styles.celebrationText, { color: colors.foreground }]}>
            {getMessage()}
          </Text>
        </Animated.View>

        {/* Stars */}
        <View className="flex-row gap-4">
          {[0, 1, 2].map((index) => {
            const animatedStyle = useAnimatedStyle(() => ({
              transform: [{ scale: starScales[index].value }],
              opacity: starScales[index].value,
            }));
            
            return (
              <Animated.View key={index} style={animatedStyle}>
                <Text style={[
                  styles.starEmoji,
                  { opacity: index < stars ? 1 : 0.3 }
                ]}>
                  ⭐
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Stats */}
        <Animated.View style={[styles.statsContainer, statsStyle]}>
          <View 
            className="bg-surface rounded-2xl p-6 w-full"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {accuracy}%
                </Text>
                <Text className="text-sm text-muted">Accuracy</Text>
              </View>
              <View className="items-center">
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {correct}/{total}
                </Text>
                <Text className="text-sm text-muted">Correct</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* New Badges */}
        {newBadges.length > 0 && (
          <Animated.View style={[styles.badgesContainer, statsStyle]}>
            <Text className="text-lg font-semibold text-foreground mb-3">
              New Badge Earned!
            </Text>
            {newBadges.map((badgeId) => {
              const badge = getBadgeInfo(badgeId);
              return (
                <View 
                  key={badgeId}
                  className="flex-row items-center gap-3 bg-surface px-4 py-3 rounded-xl"
                  style={{ borderColor: colors.warning, borderWidth: 2 }}
                >
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <View>
                    <Text className="font-semibold text-foreground">{badge.name}</Text>
                    <Text className="text-sm text-muted">{badge.description}</Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.replace("/practice");
            }}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Play Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.replace("/");
            }}
            style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  celebrationContainer: {
    alignItems: "center",
    gap: 8,
  },
  celebrationEmoji: {
    fontSize: 80,
  },
  celebrationText: {
    fontSize: 32,
    fontWeight: "700",
  },
  starEmoji: {
    fontSize: 48,
  },
  statsContainer: {
    width: "100%",
    maxWidth: 320,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  badgesContainer: {
    alignItems: "center",
    gap: 8,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  buttonsContainer: {
    width: "100%",
    maxWidth: 280,
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
