import { Text, View, TouchableOpacity, StyleSheet, Platform, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getBadgeInfo } from "@/lib/game-store";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSounds } from "@/hooks/use-sounds";
import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const { playCelebration } = useSounds();

  const stars = parseInt(params.stars || "0");
  const accuracy = parseInt(params.accuracy || "0");
  const correct = parseInt(params.correct || "0");
  const total = parseInt(params.total || "0");
  const newBadges = params.newBadges ? params.newBadges.split(",").filter(Boolean) : [];

  const celebrationScale = useSharedValue(0);
  const starScales = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const confettiOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    // Celebration animation sequence
    celebrationScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    
    // Confetti burst
    confettiOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2000, withTiming(0, { duration: 500 }))
    );
    
    // Glow pulse
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Stars animation with delay
    starScales.forEach((scale, index) => {
      if (index < stars) {
        scale.value = withDelay(
          500 + index * 250,
          withSequence(
            withSpring(1.4, { damping: 6 }),
            withSpring(1, { damping: 10 })
          )
        );
      }
    });

    // Success haptic
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Play celebration sound
    playCelebration();
  }, []);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value,
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value * 0.5,
    transform: [{ scale: 1 + glowPulse.value * 0.1 }],
  }));

  const getMessage = () => {
    if (accuracy >= 90) return "Amazing!";
    if (accuracy >= 70) return "Great Job!";
    if (accuracy >= 50) return "Good Work!";
    return "Keep Going!";
  };

  const getSubMessage = () => {
    if (accuracy >= 90) return "You're a math superstar! 🌟";
    if (accuracy >= 70) return "You're getting better every day!";
    if (accuracy >= 50) return "Practice makes perfect!";
    return "Every problem makes you stronger!";
  };

  const getEmoji = () => {
    if (accuracy >= 90) return "🏆";
    if (accuracy >= 70) return "🎉";
    if (accuracy >= 50) return "👍";
    return "💪";
  };

  const getGradientColors = (): [string, string] => {
    if (accuracy >= 90) return ['#F59E0B', '#D97706'];
    if (accuracy >= 70) return ['#22C55E', '#16A34A'];
    if (accuracy >= 50) return ['#3B82F6', '#2563EB'];
    return ['#8B5CF6', '#7C3AED'];
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#F0FDFA']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Glow effect */}
      <Animated.View style={[styles.glowCircle, glowStyle]}>
        <LinearGradient
          colors={[getGradientColors()[0] + '40', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Confetti */}
      <Animated.View style={[styles.confettiContainer, confettiStyle]} pointerEvents="none">
        <Text style={[styles.confetti, { top: '10%', left: '10%' }]}>🎉</Text>
        <Text style={[styles.confetti, { top: '8%', right: '15%' }]}>⭐</Text>
        <Text style={[styles.confetti, { top: '15%', left: '25%' }]}>✨</Text>
        <Text style={[styles.confetti, { top: '12%', right: '25%' }]}>🌟</Text>
        <Text style={[styles.confetti, { top: '18%', left: '5%' }]}>🎊</Text>
        <Text style={[styles.confetti, { top: '20%', right: '8%' }]}>✨</Text>
      </Animated.View>

      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-transparent">
        <View style={styles.content}>
          {/* Celebration Header */}
          <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
            <View style={styles.emojiContainer}>
              <Text style={styles.celebrationEmoji}>{getEmoji()}</Text>
            </View>
            <Text style={styles.celebrationText}>{getMessage()}</Text>
            <Text style={styles.subMessage}>{getSubMessage()}</Text>
          </Animated.View>

          {/* Stars */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.starsContainer}>
            {[0, 1, 2].map((index) => {
              const animatedStyle = useAnimatedStyle(() => ({
                transform: [{ scale: starScales[index].value }],
                opacity: index < stars ? starScales[index].value : 0.2,
              }));
              
              return (
                <Animated.View key={index} style={[styles.starWrapper, animatedStyle]}>
                  <Text style={styles.starEmoji}>⭐</Text>
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Stats Card */}
          <Animated.View entering={FadeInUp.delay(600).duration(400)} style={styles.statsCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.statsCardGradient}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <LinearGradient
                    colors={getGradientColors()}
                    style={styles.statCircle}
                  >
                    <Text style={styles.statValue}>{accuracy}%</Text>
                  </LinearGradient>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statCircle, { backgroundColor: '#22C55E' }]}>
                    <Text style={styles.statValue}>{correct}</Text>
                  </View>
                  <Text style={styles.statLabel}>Correct</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statCircle, { backgroundColor: '#64748B' }]}>
                    <Text style={styles.statValue}>{total}</Text>
                  </View>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* New Badges */}
          {newBadges.length > 0 && (
            <Animated.View entering={FadeInUp.delay(800).duration(400)} style={styles.badgesSection}>
              <Text style={styles.badgesTitle}>🏅 New Badge Earned!</Text>
              {newBadges.map((badgeId) => {
                const badge = getBadgeInfo(badgeId);
                return (
                  <View key={badgeId} style={styles.badgeCard}>
                    <LinearGradient
                      colors={['#FEF3C7', '#FDE68A']}
                      style={styles.badgeCardGradient}
                    >
                      <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                      <View style={styles.badgeInfo}>
                        <Text style={styles.badgeName}>{badge.name}</Text>
                        <Text style={styles.badgeDescription}>{badge.description}</Text>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* Buttons */}
          <Animated.View entering={FadeInUp.delay(1000).duration(400)} style={styles.buttonsContainer}>
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.replace("/practice");
              }}
              activeOpacity={0.9}
              style={styles.primaryButtonOuter}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.primaryButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.primaryButtonEmoji}>🚀</Text>
                <Text style={styles.primaryButtonText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                router.replace("/");
              }}
              style={styles.secondaryButton}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowCircle: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 400,
    borderRadius: 200,
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  confetti: {
    position: 'absolute',
    fontSize: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emojiContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  celebrationEmoji: {
    fontSize: 56,
  },
  celebrationText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  starWrapper: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starEmoji: {
    fontSize: 48,
  },
  statsCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  statsCardGradient: {
    padding: 24,
    borderRadius: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E2E8F0',
  },
  badgesSection: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    marginBottom: 24,
  },
  badgesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  badgeCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  badgeEmoji: {
    fontSize: 40,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 13,
    color: '#A16207',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  primaryButtonOuter: {
    borderRadius: 28,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 28,
    gap: 10,
  },
  primaryButtonEmoji: {
    fontSize: 22,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#64748B',
  },
});
