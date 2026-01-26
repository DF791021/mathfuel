import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Platform, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const AVATARS = ["🦊", "🐻", "🐰", "🦁", "🐼", "🐨", "🐯", "🦄", "🐸", "🐵"];
const GRADES = [1, 2, 3, 4, 5, 6];

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const childId = parseInt(id || "0", 10);
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState(1);
  const [editAvatar, setEditAvatar] = useState("🦊");
  const [editPin, setEditPin] = useState("");

  const { data: child, isLoading, refetch } = trpc.children.get.useQuery(
    { childId },
    { enabled: isAuthenticated && childId > 0 }
  );

  const { data: sessions } = trpc.sessions.list.useQuery(
    { childId, limit: 20 },
    { enabled: isAuthenticated && childId > 0 }
  );

  const updateMutation = trpc.children.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const deleteMutation = trpc.children.delete.useMutation({
    onSuccess: () => {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    },
  });

  const openEditModal = () => {
    if (child) {
      setEditName(child.firstName);
      setEditGrade(child.grade);
      setEditAvatar(child.avatar || "🦊");
      setEditPin(child.pin || "");
      setShowEditModal(true);
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    
    await updateMutation.mutateAsync({
      childId,
      firstName: editName.trim(),
      grade: editGrade,
      avatar: editAvatar,
      pin: editPin.length === 4 ? editPin : null,
    });
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (confirm(`Are you sure you want to delete ${child?.firstName}? This will also delete all their progress data.`)) {
        deleteMutation.mutate({ childId });
      }
    } else {
      Alert.alert(
        "Delete Student",
        `Are you sure you want to delete ${child?.firstName}? This will also delete all their progress data.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ childId }) },
        ]
      );
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 70) return colors.success;
    if (accuracy >= 50) return colors.warning;
    return colors.error;
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  if (!child) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Student not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const accuracy = child.totalProblems > 0 
    ? Math.round((child.totalCorrect / child.totalProblems) * 100) 
    : 0;
  
  const crossingTenAccuracy = child.crossingTenTotal > 0
    ? Math.round((child.crossingTenCorrect / child.crossingTenTotal) * 100)
    : 0;

  const badges: string[] = child.badges ? JSON.parse(child.badges) : [];

  return (
    <ScreenContainer className="px-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mt-4 mb-6">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Text className="text-base text-primary">← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openEditModal} activeOpacity={0.8}>
          <Text className="text-base text-primary">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="items-center mb-6">
          <View 
            className="w-20 h-20 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primary + "20" }}
          >
            <Text style={styles.avatar}>{child.avatar || "👤"}</Text>
          </View>
          <Text className="text-2xl font-bold text-foreground">{child.firstName}</Text>
          <Text className="text-base text-muted">Grade {child.grade}</Text>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-2xl font-bold text-foreground">{child.totalStars}</Text>
            <Text className="text-xs text-muted">⭐ Stars</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-2xl font-bold text-foreground">{child.currentStreak}</Text>
            <Text className="text-xs text-muted">🔥 Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-2xl font-bold" style={{ color: getAccuracyColor(accuracy) }}>{accuracy}%</Text>
            <Text className="text-xs text-muted">Accuracy</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-2xl font-bold text-foreground">{child.totalSessions}</Text>
            <Text className="text-xs text-muted">Sessions</Text>
          </View>
        </View>

        {/* Crossing Ten Progress */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-lg font-semibold text-foreground mb-2">Crossing Ten</Text>
          <Text className="text-sm text-muted mb-3">
            Problems like 7+5=12 that cross the ten boundary
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${crossingTenAccuracy}%`,
                  backgroundColor: getAccuracyColor(crossingTenAccuracy),
                }}
              />
            </View>
            <Text className="text-sm font-semibold" style={{ color: getAccuracyColor(crossingTenAccuracy) }}>
              {crossingTenAccuracy}%
            </Text>
          </View>
          <Text className="text-xs text-muted mt-2">
            {child.crossingTenCorrect} / {child.crossingTenTotal} correct
          </Text>
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-lg font-semibold text-foreground mb-3">Badges</Text>
            <View className="flex-row flex-wrap gap-2">
              {badges.map((badge) => (
                <View 
                  key={badge}
                  className="px-3 py-2 rounded-full"
                  style={{ backgroundColor: colors.primary + "20" }}
                >
                  <Text className="text-sm">{getBadgeDisplay(badge)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Sessions */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text className="text-lg font-semibold text-foreground mb-3">Recent Sessions</Text>
          {!sessions || sessions.length === 0 ? (
            <Text className="text-sm text-muted">No sessions yet</Text>
          ) : (
            sessions.slice(0, 5).map((session) => (
              <View 
                key={session.id}
                className="flex-row items-center justify-between py-3 border-b"
                style={{ borderColor: colors.border }}
              >
                <View>
                  <Text className="text-sm text-foreground">{session.date}</Text>
                  <Text className="text-xs text-muted">
                    {session.correctAnswers}/{session.totalProblems} correct • Level {session.difficultyLevel}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-semibold" style={{ color: getAccuracyColor(session.accuracy) }}>
                    {session.accuracy}%
                  </Text>
                  <Text className="text-xs text-muted">{session.starsEarned} ⭐</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.deleteButton, { borderColor: colors.error }]}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.error }}>Delete Student</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text className="text-xl font-bold text-foreground mb-6">Edit Student</Text>

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">First Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter name"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
            </View>

            {/* Grade Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Grade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {GRADES.map((grade) => (
                    <TouchableOpacity
                      key={grade}
                      onPress={() => setEditGrade(grade)}
                      style={[
                        styles.gradeButton,
                        { 
                          backgroundColor: editGrade === grade ? colors.primary : colors.surface,
                          borderColor: colors.border,
                        }
                      ]}
                    >
                      <Text style={{ 
                        color: editGrade === grade ? "#FFFFFF" : colors.foreground,
                        fontWeight: "600",
                      }}>
                        {grade}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Avatar Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Avatar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {AVATARS.map((avatar) => (
                    <TouchableOpacity
                      key={avatar}
                      onPress={() => setEditAvatar(avatar)}
                      style={[
                        styles.avatarButton,
                        { 
                          backgroundColor: editAvatar === avatar ? colors.primary + "30" : colors.surface,
                          borderColor: editAvatar === avatar ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <Text style={styles.avatarOption}>{avatar}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* PIN Input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">PIN (4 digits, or leave empty to remove)</Text>
              <TextInput
                value={editPin}
                onChangeText={(text) => setEditPin(text.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!editName.trim() || updateMutation.isPending}
                style={[
                  styles.saveButton,
                  { backgroundColor: editName.trim() ? colors.primary : colors.muted }
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function getBadgeDisplay(badge: string): string {
  const badges: Record<string, string> = {
    first_star: "⭐ First Star",
    math_explorer: "🔍 Math Explorer",
    streak_master: "🔥 Streak Master",
    problem_solver: "🧠 Problem Solver",
    accuracy_ace: "🎯 Accuracy Ace",
    star_collector: "🌟 Star Collector",
  };
  return badges[badge] || badge;
}

const styles = StyleSheet.create({
  avatar: {
    fontSize: 40,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  deleteButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  gradeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarOption: {
    fontSize: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
