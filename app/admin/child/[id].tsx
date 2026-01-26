import { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, TextInput, Modal, StyleSheet, Platform, Alert, Dimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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

  const { data: sessions, isLoading: sessionsLoading } = trpc.sessions.list.useQuery(
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

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 70) return '#22C55E';
    if (accuracy >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getAccuracyGradient = (accuracy: number): [string, string] => {
    if (accuracy >= 70) return ['#22C55E', '#16A34A'];
    if (accuracy >= 50) return ['#F59E0B', '#D97706'];
    return ['#EF4444', '#DC2626'];
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#F0F9FF', '#E0F2FE', '#F0FDFA']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingEmoji}>📊</Text>
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
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

  // Calculate trends from sessions
  const recentSessions = sessions?.slice(0, 5) || [];
  const avgRecentAccuracy = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length)
    : 0;
  const totalProblemsThisWeek = recentSessions.reduce((sum, s) => sum + s.totalProblems, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F0F9FF', '#E0F2FE', '#FAFBFC']}
        style={StyleSheet.absoluteFill}
      />

      <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-transparent">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal} style={styles.editButton} activeOpacity={0.8}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.profileCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.profileCardGradient}
            >
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarEmoji}>{child.avatar || "👤"}</Text>
              </View>
              <Text style={styles.childName}>{child.firstName}</Text>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>Grade {child.grade}</Text>
              </View>
              
              {/* Quick Stats Row */}
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{child.totalStars}</Text>
                  <Text style={styles.quickStatLabel}>⭐ Stars</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{child.currentStreak}</Text>
                  <Text style={styles.quickStatLabel}>🔥 Streak</Text>
                </View>
                <View style={styles.quickStatDivider} />
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{child.totalSessions}</Text>
                  <Text style={styles.quickStatLabel}>📝 Sessions</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Accuracy Overview */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <View style={styles.accuracyRow}>
              <View style={styles.accuracyCircle}>
                <LinearGradient
                  colors={getAccuracyGradient(accuracy)}
                  style={styles.accuracyCircleGradient}
                >
                  <Text style={styles.accuracyValue}>{accuracy}%</Text>
                </LinearGradient>
              </View>
              <View style={styles.accuracyDetails}>
                <Text style={styles.accuracyLabel}>Overall Accuracy</Text>
                <Text style={styles.accuracySubtext}>
                  {child.totalCorrect} of {child.totalProblems} problems correct
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Level {child.difficultyLevel}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Crossing Ten Section */}
          <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Crossing Ten</Text>
              <Text style={styles.sectionBadge}>Key Skill</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Problems like 7+5=12 that cross the ten boundary - a critical 1st grade skill
            </Text>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <LinearGradient
                  colors={getAccuracyGradient(crossingTenAccuracy)}
                  style={[styles.progressBarFill, { width: `${Math.max(crossingTenAccuracy, 5)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={[styles.progressPercent, { color: getAccuracyColor(crossingTenAccuracy) }]}>
                {crossingTenAccuracy}%
              </Text>
            </View>
            <Text style={styles.progressSubtext}>
              {child.crossingTenCorrect} of {child.crossingTenTotal} crossing-ten problems correct
            </Text>
          </Animated.View>

          {/* Recent Sessions */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              {recentSessions.length > 0 && (
                <Text style={styles.sessionCount}>{totalProblemsThisWeek} problems</Text>
              )}
            </View>
            
            {sessionsLoading ? (
              <Text style={styles.emptyText}>Loading sessions...</Text>
            ) : !sessions || sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📝</Text>
                <Text style={styles.emptyText}>No practice sessions yet</Text>
                <Text style={styles.emptySubtext}>Sessions will appear here after practice</Text>
              </View>
            ) : (
              <View style={styles.sessionsList}>
                {sessions.slice(0, 7).map((session, index) => (
                  <View 
                    key={session.id}
                    style={[
                      styles.sessionItem,
                      index < sessions.slice(0, 7).length - 1 && styles.sessionItemBorder
                    ]}
                  >
                    <View style={styles.sessionLeft}>
                      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                      <Text style={styles.sessionDetails}>
                        {session.correctAnswers}/{session.totalProblems} correct • Level {session.difficultyLevel}
                      </Text>
                      {session.crossingTenTotal > 0 && (
                        <Text style={styles.sessionCrossingTen}>
                          Crossing ten: {session.crossingTenCorrect}/{session.crossingTenTotal}
                        </Text>
                      )}
                    </View>
                    <View style={styles.sessionRight}>
                      <View style={[styles.sessionAccuracyBadge, { backgroundColor: getAccuracyColor(session.accuracy) + '20' }]}>
                        <Text style={[styles.sessionAccuracy, { color: getAccuracyColor(session.accuracy) }]}>
                          {session.accuracy}%
                        </Text>
                      </View>
                      <Text style={styles.sessionStars}>{session.starsEarned} ⭐</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Badges */}
          {badges.length > 0 && (
            <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Earned Badges</Text>
              <View style={styles.badgesGrid}>
                {badges.map((badge) => (
                  <View key={badge} style={styles.badgeItem}>
                    <Text style={styles.badgeText}>{getBadgeDisplay(badge)}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Delete Button */}
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteText}>Delete Student</Text>
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
              <Text style={styles.modalTitle}>Edit Student</Text>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Grade</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {GRADES.map((grade) => (
                      <TouchableOpacity
                        key={grade}
                        onPress={() => setEditGrade(grade)}
                        style={[
                          styles.optionButton,
                          { 
                            backgroundColor: editGrade === grade ? colors.primary : colors.surface,
                            borderColor: editGrade === grade ? colors.primary : colors.border,
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Avatar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.optionsRow}>
                    {AVATARS.map((avatar) => (
                      <TouchableOpacity
                        key={avatar}
                        onPress={() => setEditAvatar(avatar)}
                        style={[
                          styles.avatarOption,
                          { 
                            backgroundColor: editAvatar === avatar ? colors.primary + "30" : colors.surface,
                            borderColor: editAvatar === avatar ? colors.primary : colors.border,
                          }
                        ]}
                      >
                        <Text style={styles.avatarOptionEmoji}>{avatar}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* PIN Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PIN (4 digits, or leave empty to remove)</Text>
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
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
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
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileCard: {
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  profileCardGradient: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  childName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  gradeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  accuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 8,
  },
  accuracyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  accuracyCircleGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accuracyDetails: {
    flex: 1,
  },
  accuracyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  accuracySubtext: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  levelBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  progressSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  sessionCount: {
    fontSize: 13,
    color: '#64748B',
  },
  sessionsList: {
    marginTop: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  sessionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 13,
    color: '#64748B',
  },
  sessionCrossingTen: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 2,
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessionAccuracyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionAccuracy: {
    fontSize: 14,
    fontWeight: '700',
  },
  sessionStars: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badgeItem: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionEmoji: {
    fontSize: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
