import { Text, View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { startOAuthLogin } from "@/constants/oauth";
import * as Haptics from "expo-haptics";

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const colors = useColors();

  const handleLogin = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await startOAuthLogin();
  };

  // If already authenticated, redirect to admin
  if (isAuthenticated && !loading) {
    router.replace("/admin" as any);
    return null;
  }

  return (
    <ScreenContainer className="px-6">
      <View className="flex-1 justify-center items-center gap-8">
        {/* Logo */}
        <View className="items-center gap-4">
          <Text style={styles.logo}>🚀</Text>
          <Text className="text-3xl font-bold text-foreground">MathFuel</Text>
          <Text className="text-base text-muted text-center">
            Adaptive Math Learning for 1st Grade
          </Text>
        </View>

        {/* Login Section */}
        <View className="w-full max-w-sm gap-4">
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Loading..." : "Sign In as Parent/Teacher"}
            </Text>
          </TouchableOpacity>

          <Text className="text-xs text-muted text-center">
            Sign in to manage your children or students
          </Text>
        </View>

        {/* Student Access */}
        <View className="items-center gap-2 mt-8">
          <Text className="text-sm text-muted">Are you a student?</Text>
          <TouchableOpacity
            onPress={() => router.push("/student" as any)}
            style={[styles.studentButton, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Student Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.8}
      >
        <Text className="text-muted">← Back</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontSize: 80,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  studentButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    padding: 8,
  },
});
