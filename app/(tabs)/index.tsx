import { useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { Image } from "expo-image";
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
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  
  // Animation values
  const logoScale = useSharedValue(0.8);
  const logoRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const studentButtonScale = useSharedValue(0.9);
  const studentButtonOpacity = useSharedValue(0);
  const parentButtonScale = useSharedValue(0.9);
  const parentButtonOpacity = useSharedValue(0);
  const floatingY = useSharedValue(0);
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);

  useEffect(() => {
    // Entrance animations
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));
    
    studentButtonOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    studentButtonScale.value = withDelay(400, withSpring(1, { damping: 12 }));
    
    parentButtonOpacity.value = withDelay(550, withTiming(1, { duration: 400 }));
    parentButtonScale.value = withDelay(550, withSpring(1, { damping: 12 }));
    
    // Continuous floating animation for logo
    floatingY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Sparkle animations
    sparkle1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
    sparkle2.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    ));
    sparkle3.value = withDelay(1000, withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    ));
  }, []);

  const handleStudentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    studentButtonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 15 })
    );
    router.push("/student" as any);
  };

  const handleParentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    parentButtonScale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 15 })
    );
    router.push("/login");
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: floatingY.value },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const studentButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: studentButtonOpacity.value,
    transform: [{ scale: studentButtonScale.value }],
  }));

  const parentButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: parentButtonOpacity.value,
    transform: [{ scale: parentButtonScale.value }],
  }));

  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1.value,
    transform: [{ scale: interpolate(sparkle1.value, [0, 1], [0.5, 1]) }],
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2.value,
    transform: [{ scale: interpolate(sparkle2.value, [0, 1], [0.5, 1]) }],
  }));

  const sparkle3Style = useAnimatedStyle(() => ({
    opacity: sparkle3.value,
    transform: [{ scale: interpolate(sparkle3.value, [0, 1], [0.5, 1]) }],
  }));

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#F0FDFA']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1, { backgroundColor: colors.primary + '10' }]} />
      <View style={[styles.decorCircle, styles.decorCircle2, { backgroundColor: colors.secondary + '10' }]} />
      <View style={[styles.decorCircle, styles.decorCircle3, { backgroundColor: '#F59E0B10' }]} />
      
      <ScreenContainer className="px-6">
        <View className="flex-1 justify-center items-center">
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            {/* Sparkles around logo */}
            <Animated.Text style={[styles.sparkle, styles.sparkle1, sparkle1Style]}>✨</Animated.Text>
            <Animated.Text style={[styles.sparkle, styles.sparkle2, sparkle2Style]}>⭐</Animated.Text>
            <Animated.Text style={[styles.sparkle, styles.sparkle3, sparkle3Style]}>✨</Animated.Text>
            
            <View style={styles.logoWrapper}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          {/* Title Section */}
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={styles.title}>MathFuel</Text>
            <Text style={styles.subtitle}>
              Adaptive Math Learning{'\n'}for 1st Grade
            </Text>
            <View style={styles.taglineContainer}>
              <View style={[styles.taglineBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.taglineText, { color: colors.primary }]}>
                  🧠 AI-Powered
                </Text>
              </View>
              <View style={[styles.taglineBadge, { backgroundColor: colors.secondary + '15' }]}>
                <Text style={[styles.taglineText, { color: colors.secondary }]}>
                  🎮 Game-Based
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Buttons Section */}
          <View style={styles.buttonsContainer}>
            {/* Student Button - Primary CTA */}
            <Animated.View style={[styles.buttonWrapper, studentButtonAnimatedStyle]}>
              <TouchableOpacity
                onPress={handleStudentPress}
                activeOpacity={0.9}
                style={styles.studentButtonOuter}
              >
                <LinearGradient
                  colors={['#2563EB', '#1D4ED8']}
                  style={styles.studentButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.buttonIconContainer}>
                    <Text style={styles.buttonIcon}>🎒</Text>
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.studentButtonTitle}>I'm a Student</Text>
                    <Text style={styles.studentButtonSubtitle}>Tap to start learning!</Text>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>→</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Parent/Teacher Button - Secondary */}
            <Animated.View style={[styles.buttonWrapper, parentButtonAnimatedStyle]}>
              <TouchableOpacity
                onPress={handleParentPress}
                activeOpacity={0.9}
                style={[styles.parentButton, { 
                  backgroundColor: '#FFFFFF',
                  borderColor: colors.border,
                }]}
              >
                <View style={[styles.buttonIconContainer, { backgroundColor: colors.secondary + '15' }]}>
                  <Text style={styles.buttonIcon}>👨‍👩‍👧</Text>
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text style={[styles.parentButtonTitle, { color: colors.foreground }]}>
                    Parent / Teacher
                  </Text>
                  <Text style={[styles.parentButtonSubtitle, { color: colors.muted }]}>
                    Manage students & track progress
                  </Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={[styles.arrow, { color: colors.muted }]}>→</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.muted }]}>
              Trusted by parents and teachers worldwide
            </Text>
            <View style={styles.trustBadges}>
              <Text style={styles.trustEmoji}>🏫</Text>
              <Text style={styles.trustEmoji}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.trustEmoji}>📚</Text>
            </View>
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
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -80,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    bottom: -50,
    right: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: 120,
    height: 120,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 24,
  },
  sparkle1: {
    top: -10,
    right: -20,
  },
  sparkle2: {
    top: 20,
    left: -25,
  },
  sparkle3: {
    bottom: 10,
    right: -15,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  taglineContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  taglineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
  studentButtonOuter: {
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  studentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  parentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    fontSize: 28,
  },
  buttonTextContainer: {
    flex: 1,
  },
  studentButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  studentButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  parentButtonTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  parentButtonSubtitle: {
    fontSize: 13,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    marginBottom: 8,
  },
  trustBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  trustEmoji: {
    fontSize: 20,
  },
});
