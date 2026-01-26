import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Platform, FlatList } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const AVATARS = ["🦊", "🐻", "🐰", "🦁", "🐼", "🐨", "🐯", "🦄", "🐸", "🐵"];
const GRADES = [1, 2, 3, 4, 5, 6];

export default function AdminDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const colors = useColors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState(1);
  const [newChildAvatar, setNewChildAvatar] = useState("🦊");
  const [newChildPin, setNewChildPin] = useState("");

  const { data: children, isLoading: childrenLoading, refetch } = trpc.children.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createChildMutation = trpc.children.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowAddModal(false);
      resetForm();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const resetForm = () => {
    setNewChildName("");
    setNewChildGrade(1);
    setNewChildAvatar("🦊");
    setNewChildPin("");
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    
    await createChildMutation.mutateAsync({
      firstName: newChildName.trim(),
      grade: newChildGrade,
      avatar: newChildAvatar,
      pin: newChildPin.length === 4 ? newChildPin : undefined,
    });
  };

  const getProgressColor = (child: { totalSessions: number; totalCorrect: number; totalProblems: number }) => {
    if (child.totalSessions === 0) return colors.muted;
    const accuracy = child.totalProblems > 0 ? (child.totalCorrect / child.totalProblems) * 100 : 0;
    if (accuracy >= 70) return colors.success;
    if (accuracy >= 50) return colors.warning;
    return colors.error;
  };

  const getLastActivity = (lastSessionDate: string | null) => {
    if (!lastSessionDate) return "No activity yet";
    const today = new Date().toISOString().split("T")[0];
    if (lastSessionDate === today) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (lastSessionDate === yesterday.toISOString().split("T")[0]) return "Yesterday";
    return lastSessionDate;
  };

  if (authLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="px-6">
        <View className="flex-1 justify-center items-center gap-6">
          <Text style={styles.welcomeEmoji}>👋</Text>
          <View className="items-center gap-2">
            <Text className="text-2xl font-bold text-foreground">Welcome to MathFuel</Text>
            <Text className="text-base text-muted text-center">
              Sign in to manage your children or students
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mt-4 mb-6">
        <View>
          <Text className="text-2xl font-bold text-foreground">My Students</Text>
          <Text className="text-sm text-muted">
            {user?.name || user?.email || "Parent/Teacher"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={logout}
          style={[styles.logoutButton, { backgroundColor: colors.surface }]}
          activeOpacity={0.8}
        >
          <Text className="text-sm text-muted">Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Add Child Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Add Child</Text>
      </TouchableOpacity>

      {/* Children List */}
      {childrenLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Loading students...</Text>
        </View>
      ) : !children || children.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4">
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text className="text-lg text-muted text-center">
            No students yet.{"\n"}Add your first child to get started!
          </Text>
        </View>
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: child }) => (
            <TouchableOpacity
              onPress={() => router.push(`/admin/child/${child.id}` as any)}
              style={[styles.childCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center gap-4">
                <View 
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primary + "20" }}
                >
                  <Text style={styles.avatar}>{child.avatar || "👤"}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">{child.firstName}</Text>
                  <Text className="text-sm text-muted">Grade {child.grade}</Text>
                  <Text className="text-xs text-muted">{getLastActivity(child.lastSessionDate)}</Text>
                </View>
                <View className="items-end gap-1">
                  <View 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProgressColor(child) }}
                  />
                  <Text className="text-xs text-muted">{child.totalStars} ⭐</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Child Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text className="text-xl font-bold text-foreground mb-6">Add Child</Text>

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">First Name</Text>
              <TextInput
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Enter name"
                placeholderTextColor={colors.muted}
                autoFocus
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
                      onPress={() => setNewChildGrade(grade)}
                      style={[
                        styles.gradeButton,
                        { 
                          backgroundColor: newChildGrade === grade ? colors.primary : colors.surface,
                          borderColor: colors.border,
                        }
                      ]}
                    >
                      <Text style={{ 
                        color: newChildGrade === grade ? "#FFFFFF" : colors.foreground,
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
              <Text className="text-sm font-medium text-foreground mb-2">Avatar (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {AVATARS.map((avatar) => (
                    <TouchableOpacity
                      key={avatar}
                      onPress={() => setNewChildAvatar(avatar)}
                      style={[
                        styles.avatarButton,
                        { 
                          backgroundColor: newChildAvatar === avatar ? colors.primary + "30" : colors.surface,
                          borderColor: newChildAvatar === avatar ? colors.primary : colors.border,
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
              <Text className="text-sm font-medium text-foreground mb-2">PIN (optional, 4 digits)</Text>
              <TextInput
                value={newChildPin}
                onChangeText={(text) => setNewChildPin(text.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              />
              <Text className="text-xs text-muted mt-1">
                If set, child must enter PIN to start practicing
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddChild}
                disabled={!newChildName.trim() || createChildMutation.isPending}
                style={[
                  styles.saveButton,
                  { backgroundColor: newChildName.trim() ? colors.primary : colors.muted }
                ]}
              >
                <Text style={styles.saveButtonText}>
                  {createChildMutation.isPending ? "Adding..." : "Add Child"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  welcomeEmoji: {
    fontSize: 60,
  },
  primaryButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 24,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyEmoji: {
    fontSize: 60,
  },
  childCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: {
    fontSize: 28,
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
