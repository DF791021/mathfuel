import { Text, View, ScrollView, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useGame } from "@/lib/game-context";
import { useColors } from "@/hooks/use-colors";
import { getBadgeInfo } from "@/lib/game-store";

const ALL_BADGES = [
  "first_session",
  "star_collector",
  "streak_starter",
  "week_warrior",
  "math_explorer",
  "math_champion",
];

export default function RewardsScreen() {
  const { progress, isLoading } = useGame();
  const colors = useColors();

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-xl text-muted">Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-6">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="items-center py-6 gap-2">
          <Text className="text-3xl font-bold text-foreground">Rewards</Text>
          <Text className="text-base text-muted">Your achievements and progress</Text>
        </View>

        {/* Stars Summary */}
        <View 
          className="bg-surface rounded-2xl p-6 mb-6"
          style={{ borderColor: colors.border, borderWidth: 1 }}
        >
          <View className="flex-row items-center justify-center gap-4">
            <Text style={styles.bigStar}>⭐</Text>
            <View className="items-center">
              <Text style={[styles.starCount, { color: colors.primary }]}>
                {progress.totalStars}
              </Text>
              <Text className="text-sm text-muted">Total Stars Earned</Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4 items-center"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {progress.currentStreak}
            </Text>
            <Text className="text-xs text-muted text-center">Current Streak</Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4 items-center"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {progress.longestStreak}
            </Text>
            <Text className="text-xs text-muted text-center">Best Streak</Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4 items-center"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={styles.statEmoji}>📝</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {progress.totalSessions}
            </Text>
            <Text className="text-xs text-muted text-center">Sessions</Text>
          </View>
          <View 
            className="flex-1 min-w-[140px] bg-surface rounded-xl p-4 items-center"
            style={{ borderColor: colors.border, borderWidth: 1 }}
          >
            <Text style={styles.statEmoji}>✅</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {progress.totalCorrect}
            </Text>
            <Text className="text-xs text-muted text-center">Correct Answers</Text>
          </View>
        </View>

        {/* Badges Section */}
        <View className="mb-4">
          <Text className="text-xl font-bold text-foreground mb-4">Badges</Text>
          <View className="gap-3">
            {ALL_BADGES.map((badgeId) => {
              const badge = getBadgeInfo(badgeId);
              const isEarned = progress.badges.includes(badgeId);
              
              return (
                <View
                  key={badgeId}
                  className="flex-row items-center gap-4 bg-surface rounded-xl p-4"
                  style={{ 
                    borderColor: isEarned ? colors.warning : colors.border, 
                    borderWidth: isEarned ? 2 : 1,
                    opacity: isEarned ? 1 : 0.5,
                  }}
                >
                  <View 
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ 
                      backgroundColor: isEarned ? colors.warning + "30" : colors.surface 
                    }}
                  >
                    <Text style={styles.badgeEmoji}>
                      {isEarned ? badge.emoji : "🔒"}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">{badge.name}</Text>
                    <Text className="text-sm text-muted">{badge.description}</Text>
                  </View>
                  {isEarned && (
                    <View 
                      className="px-3 py-1 rounded-full"
                      style={{ backgroundColor: colors.success + "20" }}
                    >
                      <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600" }}>
                        Earned
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Encouragement */}
        <View 
          className="bg-surface rounded-2xl p-5 items-center"
          style={{ backgroundColor: colors.primary + "15" }}
        >
          <Text style={styles.encourageEmoji}>🌟</Text>
          <Text className="text-base font-semibold text-foreground text-center">
            Keep practicing to earn more badges!
          </Text>
          <Text className="text-sm text-muted text-center mt-1">
            {progress.badges.length}/{ALL_BADGES.length} badges earned
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bigStar: {
    fontSize: 48,
  },
  starCount: {
    fontSize: 48,
    fontWeight: "700",
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  badgeEmoji: {
    fontSize: 28,
  },
  encourageEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
});
