import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, TextInput, Modal, StyleSheet, Platform, FlatList, Dimensions } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AVATARS = ["🦊", "🐻", "🐰", "🦁", "🐼", "🐨", "🐯", "🦄", "🐸", "🐵", "🦋", "🐙"];
const GRADES = [1, 2, 3, 4, 5, 6];

type Child = {
  id: number;
  firstName: string;
  grade: number;
  avatar: string | null;
  totalStars: number;
  currentStreak: number;
  totalSessions: number;
  totalProblems: number;
  totalCorrect: number;
  lastPlayedDate?: string | null;
  updatedAt?: Date;
};

export default function AdminDashboard() {
  const colors = useColors();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildGrade, setNewChildGrade] = useState(1);
  const [newChildAvatar, setNewChildAvatar] = useState("🦊");
  const [newChildPin, setNewChildPin] = useState("");

  const { data: children, isLoading, refetch } = trpc.children.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const createMutation = trpc.children.create.useMutation({
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
    
    await createMutation.mutateAsync({
      firstName: newChildName.trim(),
      grade: newChildGrade,
      avatar: newChildAvatar,
      pin: newChildPin.length === 4 ? newChildPin : undefined,
    });
  };

  const getProgressColor = (child: Child) => {
    if (child.totalSessions === 0) return colors.muted;
    const accuracy = child.totalProblems > 0 
      ? (child.totalCorrect / child.totalProblems) * 100 
      : 0;
    if (accuracy >= 70) return colors.success;
    if (accuracy >= 50) return colors.warning;
    return colors.error;
  };

  const getProgressLabel = (child: Child) => {
    if (child.totalSessions === 0) return "Not started";
    const accuracy = child.totalProblems > 0 
      ? Math.round((child.totalCorrect / child.totalProblems) * 100) 
      : 0;
    if (accuracy >= 70) return "On track";
    if (accuracy >= 50) return "Needs practice";
    return "Needs help";
  };

  const formatLastActivity = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={['#F0F9FF', '#E0F2FE', '#F0FDFA']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingEmoji}>🚀</Text>
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
      </View>
    );
  }

  const userName = user?.name?.split(" ")[0] || "there";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#FAFBFC']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <ScreenContainer edges={["top", "left", "right"]}>
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.header}
        >
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.foreground }]}>{userName}! 👋</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push("/(tabs)/parent" as any)}
            style={[styles.profileButton, { backgroundColor: colors.surface }]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.profileImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Summary */}
        <Animated.View 
          entering={FadeInDown.delay(200).duration(500)}
          style={styles.statsContainer}
        >
          <LinearGradient
            colors={['#2563EB', '#1D4ED8']}
            style={styles.statsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{children?.length || 0}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {children?.reduce((sum, c) => sum + c.totalSessions, 0) || 0}
                </Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {children?.reduce((sum, c) => sum + c.totalStars, 0) || 0}
                </Text>
                <Text style={styles.statLabel}>Stars ⭐</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Section Header */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.sectionHeader}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Students</Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Children List */}
        {!children || children.length === 0 ? (
          <Animated.View 
            entering={FadeInUp.delay(400).duration(500)}
            style={styles.emptyState}
          >
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Text style={styles.emptyIcon}>👨‍👩‍👧‍👦</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No students yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Add your first student to get started with personalized math learning
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                style={styles.emptyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.emptyButtonText}>+ Add First Student</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <FlatList
            data={children}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: child, index }) => (
              <Animated.View entering={FadeInUp.delay(400 + index * 100).duration(400)}>
                <TouchableOpacity
                  onPress={() => router.push(`/admin/child/${child.id}` as any)}
                  style={[styles.childCard, { backgroundColor: '#FFFFFF' }]}
                  activeOpacity={0.8}
                >
                  {/* Avatar */}
                  <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={styles.avatar}>{child.avatar || "👤"}</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: colors.foreground }]}>
                      {child.firstName}
                    </Text>
                    <Text style={[styles.childMeta, { color: colors.muted }]}>
                      Grade {child.grade} • {formatLastActivity(child.updatedAt ? child.updatedAt.toString() : null)}
                    </Text>
                    <View style={styles.childStats}>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatEmoji}>⭐</Text>
                        <Text style={[styles.miniStatValue, { color: colors.foreground }]}>
                          {child.totalStars}
                        </Text>
                      </View>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatEmoji}>🔥</Text>
                        <Text style={[styles.miniStatValue, { color: colors.foreground }]}>
                          {child.currentStreak}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Progress Indicator */}
                  <View style={styles.progressSection}>
                    <View style={[styles.progressDot, { backgroundColor: getProgressColor(child) }]} />
                    <Text style={[styles.progressLabel, { color: getProgressColor(child) }]}>
                      {getProgressLabel(child)}
                    </Text>
                    <Text style={[styles.chevron, { color: colors.muted }]}>›</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          />
        )}
      </ScreenContainer>

      {/* Add Child Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Student</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalClose, { color: colors.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>First Name</Text>
              <TextInput
                value={newChildName}
                onChangeText={setNewChildName}
                placeholder="Enter student's name"
                placeholderTextColor={colors.muted}
                autoFocus
                returnKeyType="next"
                style={[styles.textInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
              />
            </View>

            {/* Grade Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Grade</Text>
              <View style={styles.gradeRow}>
                {GRADES.map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    onPress={() => setNewChildGrade(grade)}
                    style={[
                      styles.gradeButton,
                      { 
                        backgroundColor: newChildGrade === grade ? colors.primary : colors.surface,
                        borderColor: newChildGrade === grade ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.gradeButtonText,
                      { color: newChildGrade === grade ? '#FFFFFF' : colors.foreground }
                    ]}>
                      {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Avatar Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Avatar</Text>
              <View style={styles.avatarRow}>
                {AVATARS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar}
                    onPress={() => setNewChildAvatar(avatar)}
                    style={[
                      styles.avatarOption,
                      { 
                        backgroundColor: newChildAvatar === avatar ? colors.primary + '20' : colors.surface,
                        borderColor: newChildAvatar === avatar ? colors.primary : colors.border,
                      }
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{avatar}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* PIN Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                PIN (optional) <Text style={{ color: colors.muted, fontWeight: '400' }}>• 4 digits</Text>
              </Text>
              <TextInput
                value={newChildPin}
                onChangeText={(text) => setNewChildPin(text.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                style={[styles.textInput, { 
                  backgroundColor: colors.surface, 
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleAddChild}
              disabled={!newChildName.trim() || createMutation.isPending}
              style={styles.submitButton}
            >
              <LinearGradient
                colors={newChildName.trim() ? ['#2563EB', '#1D4ED8'] : ['#94A3B8', '#94A3B8']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitButtonText}>
                  {createMutation.isPending ? "Adding..." : "Add Student"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 2,
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImage: {
    width: 32,
    height: 32,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    fontSize: 28,
  },
  childInfo: {
    flex: 1,
    marginLeft: 14,
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  childMeta: {
    fontSize: 13,
    marginBottom: 6,
  },
  childStats: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatEmoji: {
    fontSize: 12,
  },
  miniStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gradeButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  gradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
