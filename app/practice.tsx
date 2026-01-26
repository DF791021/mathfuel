import { useState, useEffect, useCallback } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useGame } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { generateProblem, MathProblem } from "@/lib/game-store";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSounds } from "@/hooks/use-sounds";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  ZoomIn,
  interpolateColor,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnswerRecord {
  correct: boolean;
  timeMs: number;
  isCrossingTen: boolean;
}

interface SessionState {
  currentProblemIndex: number;
  problems: MathProblem[];
  answers: AnswerRecord[];
  startTime: number;
}

const COLORS = {
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
};

export default function PracticeScreen() {
  const router = useRouter();
  const { progress, settings, completeSession } = useGame();
  const colors = useColors();

  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [problemStartTime, setProblemStartTime] = useState(Date.now());
  const [streak, setStreak] = useState(0);

  // Sound effects
  const { playCorrect, playIncorrect } = useSounds({ enabled: settings.soundEnabled });

  // Animation values
  const feedbackScale = useSharedValue(0);
  const problemScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const streakPulse = useSharedValue(1);
  const confettiOpacity = useSharedValue(0);

  // Initialize session
  useEffect(() => {
    const problems: MathProblem[] = [];
    for (let i = 0; i < settings.sessionLength; i++) {
      problems.push(generateProblem(progress.difficultyLevel, []));
    }
    setSession({
      currentProblemIndex: 0,
      problems,
      answers: [],
      startTime: Date.now(),
    });
    setProblemStartTime(Date.now());
  }, [settings.sessionLength, progress.difficultyLevel]);

  // Update progress bar animation
  useEffect(() => {
    if (session) {
      const percent = (session.currentProblemIndex / session.problems.length) * 100;
      progressWidth.value = withTiming(percent, { duration: 300, easing: Easing.out(Easing.ease) });
    }
  }, [session?.currentProblemIndex]);

  // Streak pulse animation
  useEffect(() => {
    if (streak > 0) {
      streakPulse.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [streak]);

  const handleAnswer = useCallback((answer: number) => {
    if (!session || showFeedback) return;

    const currentProblem = session.problems[session.currentProblemIndex];
    const correct = answer === currentProblem.answer;
    const timeMs = Date.now() - problemStartTime;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setStreak(s => s + 1);
      confettiOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(500, withTiming(0, { duration: 300 }))
      );
    } else {
      setStreak(0);
    }

    // Show feedback animation
    feedbackScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, { damping: 12 })
    );

    // Problem bounce
    problemScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );

    // Haptic feedback
    if (Platform.OS !== "web" && settings.hapticEnabled) {
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    // Sound effects
    if (correct) {
      playCorrect();
    } else {
      playIncorrect();
    }

    // Update session and move to next problem
    const newAnswers: AnswerRecord[] = [
      ...session.answers, 
      { correct, timeMs, isCrossingTen: currentProblem.isCrossingTen }
    ];
    
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      feedbackScale.value = 0;

      if (session.currentProblemIndex + 1 >= session.problems.length) {
        finishSession(newAnswers, session.problems);
      } else {
        setSession({
          ...session,
          currentProblemIndex: session.currentProblemIndex + 1,
          answers: newAnswers,
        });
        setProblemStartTime(Date.now());
      }
    }, correct ? 800 : 1200);
  }, [session, showFeedback, problemStartTime, settings.hapticEnabled, feedbackScale]);

  const finishSession = async (answers: AnswerRecord[], problems: MathProblem[]) => {
    const correctAnswers = answers.filter(a => a.correct).length;
    const totalProblems = answers.length;
    const accuracy = totalProblems > 0 ? Math.round((correctAnswers / totalProblems) * 100) : 0;
    const averageTime = totalProblems > 0 
      ? Math.round(answers.reduce((sum, a) => sum + a.timeMs, 0) / totalProblems)
      : 0;

    const additionCount = problems.filter(p => p.operator === "+").length;
    const subtractionCount = problems.filter(p => p.operator === "-").length;

    const crossingTenAnswers = answers.filter(a => a.isCrossingTen);
    const crossingTenCorrect = crossingTenAnswers.filter(a => a.correct).length;
    const crossingTenTotal = crossingTenAnswers.length;

    const result = await completeSession({
      totalProblems,
      correctAnswers,
      accuracy,
      averageTime,
      problemTypes: { addition: additionCount, subtraction: subtractionCount },
      crossingTenCorrect,
      crossingTenTotal,
    });

    router.replace({
      pathname: "/results",
      params: {
        stars: result.starsEarned.toString(),
        accuracy: accuracy.toString(),
        correct: correctAnswers.toString(),
        total: totalProblems.toString(),
        newBadges: result.newBadges.join(","),
      },
    });
  };

  const feedbackAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedbackScale.value }],
    opacity: feedbackScale.value,
  }));

  const problemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: problemScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const streakAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakPulse.value }],
  }));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#F0F9FF', '#E0F2FE', '#F0FDFA']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingEmoji}>🧮</Text>
        <Text style={styles.loadingText}>Preparing problems...</Text>
      </View>
    );
  }

  const currentProblem = session.problems[session.currentProblemIndex];
  const correctSoFar = session.answers.filter(a => a.correct).length;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#FAFBFC']}
        style={StyleSheet.absoluteFill}
      />

      {/* Confetti overlay */}
      <Animated.View style={[styles.confettiContainer, confettiStyle]} pointerEvents="none">
        <Text style={[styles.confetti, { top: '20%', left: '10%' }]}>🎉</Text>
        <Text style={[styles.confetti, { top: '15%', right: '15%' }]}>⭐</Text>
        <Text style={[styles.confetti, { top: '25%', left: '30%' }]}>✨</Text>
        <Text style={[styles.confetti, { top: '18%', right: '30%' }]}>🌟</Text>
      </Animated.View>

      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-transparent">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
            <Text style={styles.progressText}>
              {session.currentProblemIndex + 1}/{session.problems.length}
            </Text>
          </View>

          {/* Streak indicator */}
          {streak > 0 && (
            <Animated.View style={[styles.streakBadge, streakAnimatedStyle]}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakText}>{streak}</Text>
            </Animated.View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>✓</Text>
            <Text style={styles.statValue}>{correctSoFar}</Text>
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Visual representation */}
          {currentProblem.visualType !== "none" && (
            <Animated.View entering={FadeInUp.delay(100).duration(300)} style={styles.visualSection}>
              <View style={styles.visualRow}>
                <View style={styles.visualGroup}>
                  {Array.from({ length: Math.min(currentProblem.num1, 10) }).map((_, i) => (
                    <View 
                      key={`a-${i}`}
                      style={[styles.visualDot, { backgroundColor: COLORS.blue }]}
                    />
                  ))}
                </View>
                <Text style={styles.visualOperator}>{currentProblem.operator}</Text>
                <View style={styles.visualGroup}>
                  {Array.from({ length: Math.min(currentProblem.num2, 10) }).map((_, i) => (
                    <View 
                      key={`b-${i}`}
                      style={[styles.visualDot, { backgroundColor: COLORS.green }]}
                    />
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Problem card */}
          <Animated.View style={[styles.problemCard, problemAnimatedStyle]}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.problemCardGradient}
            >
              <Text style={styles.problemText}>
                {currentProblem.num1} {currentProblem.operator} {currentProblem.num2}
              </Text>
              <Text style={styles.equalsSign}>=</Text>
              <View style={styles.questionMark}>
                <Text style={styles.questionMarkText}>?</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Feedback overlay */}
          {showFeedback && (
            <Animated.View style={[styles.feedbackOverlay, feedbackAnimatedStyle]}>
              <View style={[
                styles.feedbackBubble,
                { backgroundColor: isCorrect ? '#22C55E' : '#F97316' }
              ]}>
                <Text style={styles.feedbackEmoji}>
                  {isCorrect ? "🎉" : "💪"}
                </Text>
                <Text style={styles.feedbackText}>
                  {isCorrect ? "Awesome!" : `It's ${currentProblem.answer}`}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Answer options */}
          <View style={styles.optionsGrid}>
            {currentProblem.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption = option === currentProblem.answer;
              
              let bgColors: [string, string] = ['#FFFFFF', '#F8FAFC'];
              let borderColor = '#E2E8F0';
              let textColor = '#0F172A';
              
              if (showFeedback) {
                if (isCorrectOption) {
                  bgColors = ['#22C55E', '#16A34A'];
                  borderColor = '#22C55E';
                  textColor = '#FFFFFF';
                } else if (isSelected && !isCorrect) {
                  bgColors = ['#EF4444', '#DC2626'];
                  borderColor = '#EF4444';
                  textColor = '#FFFFFF';
                }
              } else if (isSelected) {
                borderColor = '#3B82F6';
              }

              return (
                <Animated.View 
                  key={`option-${index}-${option}`}
                  entering={FadeInUp.delay(200 + index * 50).duration(300)}
                >
                  <TouchableOpacity
                    onPress={() => handleAnswer(option)}
                    disabled={showFeedback}
                    activeOpacity={0.8}
                    style={[styles.optionButton, { borderColor }]}
                  >
                    <LinearGradient
                      colors={bgColors}
                      style={styles.optionGradient}
                    >
                      <Text style={[styles.optionText, { color: textColor }]}>
                        {option}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScreenContainer>
    </View>
  );
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
    color: '#64748B',
    fontWeight: '600',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  confetti: {
    position: 'absolute',
    fontSize: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  closeIcon: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 40,
    textAlign: 'right',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statEmoji: {
    fontSize: 16,
    color: '#22C55E',
    fontWeight: '700',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22C55E',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  visualSection: {
    marginBottom: 24,
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  visualGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 90,
    gap: 6,
  },
  visualDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  visualOperator: {
    fontSize: 32,
    fontWeight: '700',
    color: '#64748B',
  },
  problemCard: {
    marginBottom: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  problemCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 24,
    gap: 16,
  },
  problemText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
  },
  equalsSign: {
    fontSize: 48,
    fontWeight: '700',
    color: '#94A3B8',
  },
  questionMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMarkText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#3B82F6',
  },
  feedbackOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  feedbackBubble: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  feedbackEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 320,
  },
  optionButton: {
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  optionGradient: {
    width: 88,
    height: 88,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 36,
    fontWeight: '800',
  },
});
