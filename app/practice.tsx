import { useState, useEffect, useCallback } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useGame } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { generateProblem, MathProblem } from "@/lib/game-store";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

interface SessionState {
  currentProblemIndex: number;
  problems: MathProblem[];
  answers: { correct: boolean; timeMs: number }[];
  startTime: number;
}

export default function PracticeScreen() {
  const router = useRouter();
  const { progress, settings, completeSession } = useGame();
  const colors = useColors();

  const [session, setSession] = useState<SessionState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [problemStartTime, setProblemStartTime] = useState(Date.now());

  const feedbackScale = useSharedValue(0);
  const optionScales = [useSharedValue(1), useSharedValue(1), useSharedValue(1), useSharedValue(1)];

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

  const handleAnswer = useCallback((answer: number, optionIndex: number) => {
    if (!session || showFeedback) return;

    const currentProblem = session.problems[session.currentProblemIndex];
    const correct = answer === currentProblem.answer;
    const timeMs = Date.now() - problemStartTime;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    // Animate the selected option
    optionScales[optionIndex].value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withSpring(1, { damping: 15 })
    );

    // Show feedback animation
    feedbackScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withSpring(1, { damping: 12 })
    );

    // Haptic feedback
    if (Platform.OS !== "web" && settings.hapticEnabled) {
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    // Update session and move to next problem
    const newAnswers = [...session.answers, { correct, timeMs }];
    
    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer(null);
      feedbackScale.value = 0;

      if (session.currentProblemIndex + 1 >= session.problems.length) {
        // Session complete
        finishSession(newAnswers);
      } else {
        setSession({
          ...session,
          currentProblemIndex: session.currentProblemIndex + 1,
          answers: newAnswers,
        });
        setProblemStartTime(Date.now());
      }
    }, correct ? 800 : 1200);
  }, [session, showFeedback, problemStartTime, settings.hapticEnabled]);

  const finishSession = async (answers: { correct: boolean; timeMs: number }[]) => {
    const correctAnswers = answers.filter(a => a.correct).length;
    const totalProblems = answers.length;
    const accuracy = Math.round((correctAnswers / totalProblems) * 100);
    const averageTime = Math.round(answers.reduce((sum, a) => sum + a.timeMs, 0) / totalProblems);

    const additionCount = session?.problems.filter(p => p.operator === "+").length || 0;
    const subtractionCount = session?.problems.filter(p => p.operator === "-").length || 0;

    const result = await completeSession({
      totalProblems,
      correctAnswers,
      accuracy,
      averageTime,
      problemTypes: { addition: additionCount, subtraction: subtractionCount },
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

  if (!session) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  const currentProblem = session.problems[session.currentProblemIndex];
  const progressPercent = ((session.currentProblemIndex) / session.problems.length) * 100;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4">
      {/* Header with progress */}
      <View className="flex-row items-center justify-between py-4">
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
        >
          <Text className="text-lg text-foreground">✕</Text>
        </TouchableOpacity>
        
        <View className="flex-1 mx-4">
          <View 
            className="h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: colors.surface }}
          >
            <View
              className="h-full rounded-full"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: colors.primary,
              }}
            />
          </View>
        </View>
        
        <Text className="text-base font-semibold text-foreground">
          {session.currentProblemIndex + 1}/{session.problems.length}
        </Text>
      </View>

      {/* Problem display */}
      <View className="flex-1 justify-center items-center gap-8">
        {/* Visual representation */}
        {currentProblem.visualType !== "none" && (
          <View className="flex-row items-center gap-4">
            <View className="flex-row flex-wrap justify-center" style={styles.visualContainer}>
              {Array.from({ length: currentProblem.num1 }).map((_, i) => (
                <View 
                  key={`a-${i}`}
                  style={[styles.dot, { backgroundColor: colors.primary }]}
                />
              ))}
            </View>
            <Text style={[styles.operatorText, { color: colors.foreground }]}>
              {currentProblem.operator}
            </Text>
            <View className="flex-row flex-wrap justify-center" style={styles.visualContainer}>
              {Array.from({ length: currentProblem.num2 }).map((_, i) => (
                <View 
                  key={`b-${i}`}
                  style={[styles.dot, { backgroundColor: colors.success }]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Problem text */}
        <View className="items-center">
          <Text style={[styles.problemText, { color: colors.foreground }]}>
            {currentProblem.num1} {currentProblem.operator} {currentProblem.num2} = ?
          </Text>
        </View>

        {/* Feedback overlay */}
        {showFeedback && (
          <Animated.View style={[styles.feedbackContainer, feedbackAnimatedStyle]}>
            <Text style={styles.feedbackEmoji}>
              {isCorrect ? "🎉" : "💪"}
            </Text>
            <Text 
              style={[
                styles.feedbackText, 
                { color: isCorrect ? colors.success : colors.warning }
              ]}
            >
              {isCorrect ? "Great job!" : `It's ${currentProblem.answer}. Keep trying!`}
            </Text>
          </Animated.View>
        )}

        {/* Answer options */}
        <View className="flex-row flex-wrap justify-center gap-4 px-4">
          {currentProblem.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === currentProblem.answer;
            
            let bgColor = colors.surface;
            if (showFeedback) {
              if (isCorrectOption) bgColor = colors.success;
              else if (isSelected && !isCorrect) bgColor = colors.error;
            }

            return (
              <Animated.View key={index}>
                <TouchableOpacity
                  onPress={() => handleAnswer(option, index)}
                  disabled={showFeedback}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: bgColor,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 3 : 1,
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text 
                    style={[
                      styles.optionText,
                      { color: showFeedback && (isCorrectOption || isSelected) ? "#FFFFFF" : colors.foreground }
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  visualContainer: {
    width: 80,
    gap: 6,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    margin: 2,
  },
  operatorText: {
    fontSize: 36,
    fontWeight: "700",
  },
  problemText: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: 2,
  },
  feedbackContainer: {
    position: "absolute",
    alignItems: "center",
    gap: 8,
  },
  feedbackEmoji: {
    fontSize: 64,
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: "600",
  },
  optionButton: {
    width: 80,
    height: 80,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 32,
    fontWeight: "700",
  },
});
