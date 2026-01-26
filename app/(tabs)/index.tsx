import { Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleStudentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/student" as any);
  };

  const handleParentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/login");
  };

  return (
    <ScreenContainer className="px-6">
      <View className="flex-1 justify-center items-center gap-8">
        {/* Logo */}
        <View className="items-center gap-4 mb-8">
          <View 
            className="w-28 h-28 rounded-3xl items-center justify-center"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.logo}>🚀</Text>
          </View>
          <Text className="text-4xl font-bold text-foreground">MathFuel</Text>
          <Text className="text-base text-muted text-center">
            Adaptive Math Learning for 1st Grade
          </Text>
        </View>

        {/* Role Selection */}
        <View className="w-full max-w-sm gap-4">
          {/* Student Button - Primary */}
          <TouchableOpacity
            onPress={handleStudentPress}
            style={[styles.roleButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.roleEmoji}>🎒</Text>
            <View className="flex-1">
              <Text style={styles.roleTitle}>I'm a Student</Text>
              <Text style={styles.roleSubtitle}>Start practicing math</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Parent/Teacher Button - Secondary */}
          <TouchableOpacity
            onPress={handleParentPress}
            style={[styles.roleButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
            <View className="flex-1">
              <Text style={[styles.roleTitle, { color: colors.foreground }]}>Parent / Teacher</Text>
              <Text style={[styles.roleSubtitle, { color: colors.muted }]}>Manage students & view progress</Text>
            </View>
            <Text style={[styles.arrow, { color: colors.muted }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center mt-8">
          <Text className="text-xs text-muted text-center">
            Powered by adaptive AI learning
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 56,
  },
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  roleEmoji: {
    fontSize: 32,
  },
  roleTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  roleSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  arrow: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },
});
