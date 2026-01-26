import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, TextInput, StyleSheet, Platform, FlatList } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const STUDENT_KEY = "mathfuel_current_student";

type StudentProfile = {
  id: number;
  firstName: string;
  avatar: string | null;
  hasPin: boolean;
};

export default function StudentLoginScreen() {
  const colors = useColors();
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      // Load saved profiles from AsyncStorage
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (profile.hasPin) {
      setSelectedProfile(profile);
      setPin("");
      setError("");
    } else {
      // No PIN required, go directly to practice
      loginStudent(profile.id);
    }
  };

  const handlePinSubmit = async () => {
    if (!selectedProfile || pin.length !== 4) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // For now, we'll validate PIN client-side from stored data
    // In production, this would call the server
    try {
      const saved = await AsyncStorage.getItem(`mathfuel_student_pin_${selectedProfile.id}`);
      if (saved === pin) {
        loginStudent(selectedProfile.id);
      } else {
        setError("Incorrect PIN. Try again!");
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

  if (loading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  // PIN Entry Screen
  if (selectedProfile) {
    return (
      <ScreenContainer className="px-6">
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
          <Text className="text-muted">← Back</Text>
        </TouchableOpacity>

        <View className="flex-1 justify-center items-center gap-6">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.largeAvatar}>{selectedProfile.avatar || "👤"}</Text>
          </View>
          
          <Text className="text-2xl font-bold text-foreground">
            Hi, {selectedProfile.firstName}!
          </Text>
          
          <Text className="text-base text-muted text-center">
            Enter your 4-digit PIN to start
          </Text>

          {/* PIN Input */}
          <View className="flex-row gap-3 my-4">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  { 
                    backgroundColor: pin.length > i ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  }
                ]}
              />
            ))}
          </View>

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
            <Text className="text-sm" style={{ color: colors.error }}>{error}</Text>
          ) : null}

          <TouchableOpacity
            onPress={handlePinSubmit}
            disabled={pin.length !== 4}
            style={[
              styles.submitButton,
              { backgroundColor: pin.length === 4 ? colors.primary : colors.muted }
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.submitButtonText}>Let's Go!</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Profile Selection Screen
  return (
    <ScreenContainer className="px-6">
      <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.8}>
        <Text className="text-muted">← Back</Text>
      </TouchableOpacity>

      <View className="flex-1 pt-16">
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-foreground">Who's Learning?</Text>
          <Text className="text-base text-muted mt-2">
            Pick your name to start practicing
          </Text>
        </View>

        {profiles.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4">
            <Text style={styles.emptyEmoji}>🎒</Text>
            <Text className="text-lg text-muted text-center">
              No students set up yet.{"\n"}Ask a parent or teacher to add you!
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={[styles.setupButton, { borderColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                Parent/Teacher Setup
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={{ paddingBottom: 32 }}
            columnWrapperStyle={{ gap: 16 }}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelectProfile(item)}
                style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View 
                  className="w-16 h-16 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: colors.primary + "20" }}
                >
                  <Text style={styles.avatar}>{item.avatar || "👤"}</Text>
                </View>
                <Text className="text-base font-semibold text-foreground text-center">
                  {item.firstName}
                </Text>
                {item.hasPin && (
                  <Text className="text-xs text-muted mt-1">🔒 PIN</Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  largeAvatar: {
    fontSize: 48,
  },
  avatar: {
    fontSize: 32,
  },
  emptyEmoji: {
    fontSize: 60,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  submitButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 16,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  profileCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    maxWidth: "48%",
  },
  setupButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
});
