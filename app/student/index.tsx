import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, TextInput, StyleSheet, Platform, FlatList, Dimensions } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
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
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STUDENT_KEY = "mathfuel_current_student";

type StudentProfile = {
  id: number;
  firstName: string;
  avatar: string | null;
  hasPin: boolean;
};

const AVATAR_COLORS: readonly [string, string][] = [
  ['#3B82F6', '#2563EB'],
  ['#22C55E', '#16A34A'],
  ['#F97316', '#EA580C'],
  ['#8B5CF6', '#7C3AED'],
  ['#EC4899', '#DB2777'],
  ['#06B6D4', '#0891B2'],
] as const;

export default function StudentLoginScreen() {
  const colors = useColors();
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Animation values
  const rocketY = useSharedValue(0);
  const cloudX1 = useSharedValue(-100);
  const cloudX2 = useSharedValue(-150);

  useEffect(() => {
    loadProfiles();
    startAnimations();
  }, []);

  const startAnimations = () => {
    rocketY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    cloudX1.value = withRepeat(
      withTiming(SCREEN_WIDTH + 100, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
    cloudX2.value = withDelay(8000, withRepeat(
      withTiming(SCREEN_WIDTH + 150, { duration: 30000, easing: Easing.linear }),
      -1,
      false
    ));
  };

  const loadProfiles = async () => {
    try {
      const saved = await AsyncStorage.getItem("mathfuel_student_profiles");
      if (saved) {
        setProfiles(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = (profile: StudentProfile) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (profile.hasPin) {
      setSelectedProfile(profile);
      setPin("");
      setError("");
    } else {
      loginStudent(profile.id);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedProfile || pin.length !== 4) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const saved = await AsyncStorage.getItem(`mathfuel_student_pin_${selectedProfile.id}`);
      if (saved === pin) {
        loginStudent(selectedProfile.id);
      } else {
        setError("Oops! Wrong PIN. Try again!");
        setPin("");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (err) {
      setError("Something went wrong. Try again!");
      setPin("");
    }
  };

  const loginStudent = async (studentId: number) => {
    try {
      await AsyncStorage.setItem(STUDENT_KEY, studentId.toString());
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace("/student/home" as any);
    } catch (err) {
      console.error("Failed to save student:", err);
    }
  };

  const handleBack = () => {
    if (selectedProfile) {
      setSelectedProfile(null);
      setPin("");
      setError("");
    } else {
      router.back();
    }
  };

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketY.value }],
  }));

  const cloud1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX1.value }],
  }));

  const cloud2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: cloudX2.value }],
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#87CEEB', '#B0E0E6', '#E0F7FA']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingEmoji}>🚀</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // PIN Entry Screen
  if (selectedProfile) {
    const colorIndex = selectedProfile.id % AVATAR_COLORS.length;
    
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#87CEEB', '#B0E0E6', '#E0F7FA']}
          style={StyleSheet.absoluteFill}
        />

        <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-transparent">
          <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
            <View style={styles.backButtonInner}>
              <Text style={styles.backButtonText}>← Back</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.pinContent}>
            <Animated.View entering={FadeInUp.duration(400)} style={styles.avatarLarge}>
              <LinearGradient
                colors={AVATAR_COLORS[colorIndex]}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarEmojiLarge}>{selectedProfile.avatar || "👤"}</Text>
              </LinearGradient>
            </Animated.View>
            
            <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.welcomeText}>
              Hi, {selectedProfile.firstName}!
            </Animated.Text>
            
            <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.pinInstructions}>
              Enter your secret PIN 🔐
            </Animated.Text>

            {/* PIN Dots */}
            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.pinDotsContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pin.length > i && styles.pinDotFilled,
                  ]}
                />
              ))}
            </Animated.View>

            {/* Hidden Input */}
            <TextInput
              value={pin}
              onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              style={styles.hiddenInput}
              onSubmitEditing={handlePinSubmit}
              returnKeyType="done"
            />

            {error ? (
              <Animated.View entering={FadeInUp.duration(200)} style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(400).duration(400)}>
              <TouchableOpacity
                onPress={handlePinSubmit}
                disabled={pin.length !== 4}
                activeOpacity={0.9}
                style={styles.goButtonOuter}
              >
                <LinearGradient
                  colors={pin.length === 4 ? ['#22C55E', '#16A34A'] : ['#94A3B8', '#64748B']}
                  style={styles.goButton}
                >
                  <Text style={styles.goButtonEmoji}>🚀</Text>
                  <Text style={styles.goButtonText}>Let's Go!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScreenContainer>
      </View>
    );
  }

  // Profile Selection Screen
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#87CEEB', '#B0E0E6', '#E0F7FA']}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating clouds */}
      <Animated.View style={[styles.cloud, styles.cloud1, cloud1Style]}>
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>
      <Animated.View style={[styles.cloud, styles.cloud2, cloud2Style]}>
        <Text style={styles.cloudEmoji}>☁️</Text>
      </Animated.View>

      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-transparent">
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
          <View style={styles.backButtonInner}>
            <Text style={styles.backButtonText}>← Back</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.selectContent}>
          {/* Header with rocket */}
          <Animated.View style={[styles.rocketContainer, rocketStyle]}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.rocketImage}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(100).duration(400)} style={styles.titleText}>
            Who's Learning Today?
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={styles.subtitleText}>
            Tap your name to start! 🎯
          </Animated.Text>

          {profiles.length === 0 ? (
            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎒</Text>
              <Text style={styles.emptyText}>
                No students set up yet.{"\n"}Ask a parent or teacher to add you!
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/login")}
                style={styles.setupButtonOuter}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  style={styles.setupButton}
                >
                  <Text style={styles.setupButtonText}>Parent/Teacher Setup</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <FlatList
              data={profiles}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              contentContainerStyle={styles.profilesGrid}
              columnWrapperStyle={styles.profilesRow}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              renderItem={({ item, index }) => {
                const colorIndex = item.id % AVATAR_COLORS.length;
                return (
                  <Animated.View entering={FadeInUp.delay(300 + index * 100).duration(400)}>
                    <TouchableOpacity
                      onPress={() => handleSelectProfile(item)}
                      style={styles.profileCard}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={['#FFFFFF', '#F8FAFC']}
                        style={styles.profileCardGradient}
                      >
                        <View style={styles.profileAvatarContainer}>
                          <LinearGradient
                            colors={AVATAR_COLORS[colorIndex]}
                            style={styles.profileAvatar}
                          >
                            <Text style={styles.profileAvatarEmoji}>{item.avatar || "👤"}</Text>
                          </LinearGradient>
                        </View>
                        <Text style={styles.profileName}>{item.firstName}</Text>
                        {item.hasPin && (
                          <View style={styles.pinBadge}>
                            <Text style={styles.pinBadgeText}>🔒</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }}
            />
          )}
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
    color: '#1E3A5F',
    fontWeight: '600',
  },
  cloud: {
    position: 'absolute',
  },
  cloud1: {
    top: 100,
  },
  cloud2: {
    top: 200,
  },
  cloudEmoji: {
    fontSize: 50,
    opacity: 0.6,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  selectContent: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  rocketContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rocketImage: {
    width: 100,
    height: 100,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A5F',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  profilesGrid: {
    paddingBottom: 32,
  },
  profilesRow: {
    gap: 16,
  },
  profileCard: {
    flex: 1,
    maxWidth: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileCardGradient: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginBottom: 12,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarEmoji: {
    fontSize: 36,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  pinBadge: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pinBadgeText: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyEmoji: {
    fontSize: 72,
  },
  emptyText: {
    fontSize: 17,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 26,
  },
  setupButtonOuter: {
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  setupButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pinContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  avatarLarge: {
    marginBottom: 20,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarEmojiLarge: {
    fontSize: 56,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  pinInstructions: {
    fontSize: 17,
    color: '#64748B',
    marginBottom: 32,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 3,
    borderColor: '#CBD5E1',
  },
  pinDotFilled: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '600',
  },
  goButtonOuter: {
    borderRadius: 28,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  goButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 28,
    gap: 10,
  },
  goButtonEmoji: {
    fontSize: 22,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
