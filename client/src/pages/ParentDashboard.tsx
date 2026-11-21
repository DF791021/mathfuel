import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ParentMissionProgress } from "@/components/MissionProgress";
import { WorkshopEntrance } from "@/components/WorkshopEntrance";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, BarChart3, Flame, Target, Trophy,
  BookOpen, Calendar, TrendingUp, Link2, CheckCircle2, AlertCircle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function ParentDashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  useEffect(() => { document.title = "Parent Dashboard - MathFuel"; }, []);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) window.location.href = "/login";
  }, [authLoading, isAuthenticated]);

  const { data: children, isLoading: childrenLoading } = trpc.parent.getChildren.useQuery(undefined, {
    enabled: isAuthenticated, refetchOnWindowFocus: false,
  });

  const { data: childProgress, isLoading: progressLoading } = trpc.parent.getChildProgress.useQuery(
    { childId: selectedChildId! },
    { enabled: !!selectedChildId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (children?.length && !selectedChildId) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-11 sm:h-14">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1 px-2 sm:px-3 h-8 sm:h-10 text-xs sm:text-sm">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
            <h1 className="font-bold text-sm sm:text-lg flex items-center gap-1.5 sm:gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Parent View
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 safe-bottom">
        {childrenLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <Skeleton className="h-24 sm:h-32" />
            <Skeleton className="h-48 sm:h-64" />
          </div>
        ) : !children || children.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Child Selector */}
            {children.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {children.map((child: any) => (
                  <Button key={child.id}
                    variant={selectedChildId === child.id ? "default" : "outline"}
                    onClick={() => setSelectedChildId(child.id)}
                    className="gap-1.5 sm:gap-2 flex-shrink-0 text-xs sm:text-sm h-8 sm:h-10 px-3 sm:px-4"
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    {child.name}
                  </Button>
                ))}
              </div>
            )}

            {selectedChildId && (
              <ChildOverview
                child={children.find((c: any) => c.id === selectedChildId)}
                progress={childProgress} isLoading={progressLoading}
              />
            )}
          </>
        )}

        {(!children || children.length === 0) && <SelfProgressView />}
        <div className="pt-3 text-center"><WorkshopEntrance /></div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 sm:py-16">
      <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-muted-foreground/30" />
      <h2 className="!text-xl sm:!text-2xl font-bold mb-2">No Linked Students</h2>
      <p className="text-xs sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto px-4">
        Enter your child's invite code below to start tracking their progress.
      </p>
      <RedeemInviteCode />
    </div>
  );
}

function RedeemInviteCode() {
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const redeemCode = trpc.parent.redeemInviteCode.useMutation({
    onSuccess: (data) => {
      setSuccess(`Connected to ${data.studentName}!`);
      setCode("");
      utils.parent.getChildren.invalidate();
    },
  });

  return (
    <Card className="max-w-md mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm sm:text-base text-indigo-900">Enter Invite Code</h3>
        </div>
        <p className="text-xs sm:text-sm text-indigo-600/70 mb-3">
          Ask your child to generate an invite code from their dashboard.
        </p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span className="text-sm font-medium text-green-800">{success}</span>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="font-mono text-center text-lg tracking-[0.15em] uppercase h-11"
              />
              <Button
                onClick={() => redeemCode.mutate({ code })}
                disabled={code.length < 4 || redeemCode.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-5 flex-shrink-0"
              >
                {redeemCode.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : "Link"}
              </Button>
            </div>
            {redeemCode.error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {redeemCode.error.message}
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SelfProgressView() {
  const { data: dashboard, isLoading } = trpc.student.getDashboard.useQuery(undefined, { refetchOnWindowFocus: false });

  if (isLoading) return <Skeleton className="h-48 sm:h-64" />;
  if (!dashboard) return null;

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="space-y-4 sm:space-y-6">
      <h2 className="!text-lg sm:!text-xl font-bold flex items-center gap-2">
        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        Your Progress
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />} label="Streak" value={`${dashboard.streak?.currentStreak ?? 0} days`} color="bg-orange-50 border-orange-200" />
        <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />} label="Mastered" value={`${dashboard.mastery?.mastered ?? 0} skills`} color="bg-green-50 border-green-200" />
        <StatCard icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />} label="Accuracy" value={`${dashboard.mastery?.overallAccuracy ?? 0}%`} color="bg-blue-50 border-blue-200" />
        <StatCard icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />} label="Badges" value={`${dashboard.badges?.length ?? 0}`} color="bg-yellow-50 border-yellow-200" />
      </div>

      {/* Recent Sessions */}
      {dashboard.recentSessions?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="!text-base sm:!text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
            {dashboard.recentSessions.map((session: any) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skill Mastery */}
      {dashboard.mastery?.skills?.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="!text-base sm:!text-lg flex items-center gap-2">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Skill Mastery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 sm:space-y-2 p-3 sm:p-6 pt-0 sm:pt-0">
            {dashboard.mastery.skills.map((skill: any) => (
              <div key={skill.skillId} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                  skill.masteryLevel === "mastered" ? "bg-green-500" :
                  skill.masteryLevel === "close" ? "bg-blue-500" :
                  skill.masteryLevel === "practicing" ? "bg-yellow-500" : "bg-muted"
                }`} />
                <span className="text-xs sm:text-sm flex-1 truncate">Skill #{skill.skillId}</span>
                <Progress value={skill.masteryScore} className="w-14 sm:w-20 h-1.5 sm:h-2" />
                <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">{skill.masteryScore}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

function ChildOverview({ child, progress, isLoading }: { child: any; progress: any; isLoading: boolean; }) {
  if (!child) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Child Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="!text-lg sm:!text-2xl font-bold truncate">{child.name}</h2>
                <p className="text-xs sm:text-base text-muted-foreground">Grade {child.gradeLevel || "1"}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground">Accuracy</p>
                <p className="text-xl sm:text-3xl font-bold text-primary">{child.overallAccuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <StatCard icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />} label="Streak" value={`${child.streak} days`} color="bg-orange-50 border-orange-200" />
          <StatCard icon={<Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />} label="Mastered" value={`${child.skillsMastered}/${child.totalSkills}`} color="bg-green-50 border-green-200" />
          <StatCard icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />} label="Active Days" value={`${child.totalActiveDays}`} color="bg-blue-50 border-blue-200" />
          <StatCard icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />} label="Best Streak" value={`${child.longestStreak} days`} color="bg-yellow-50 border-yellow-200" />
        </div>
      </motion.div>

      <ParentMissionProgress key={child.id} childId={child.id} />

      {/* Detailed Progress */}
      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-36 sm:h-48" />
          <Skeleton className="h-36 sm:h-48" />
        </div>
      ) : progress ? (
        <>
          {/* Mastery Details */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="!text-base sm:!text-lg flex items-center gap-2">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Skill Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 sm:space-y-2 max-h-60 sm:max-h-80 overflow-y-auto p-3 sm:p-6 pt-0 sm:pt-0">
                {progress.mastery?.length > 0 ? (
                  progress.mastery.map((m: any) => (
                    <div key={m.skillId} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-muted/50">
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                        m.masteryLevel === "mastered" ? "bg-green-500" :
                        m.masteryLevel === "close" ? "bg-blue-500" :
                        m.masteryLevel === "practicing" ? "bg-yellow-500" : "bg-muted"
                      }`} />
                      <span className="text-xs sm:text-sm flex-1 truncate">Skill #{m.skillId}</span>
                      <Progress value={m.masteryScore} className="w-14 sm:w-20 h-1.5 sm:h-2" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground w-8 sm:w-10 text-right">{m.masteryScore}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground py-3 sm:py-4">No skills practiced yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Sessions */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="!text-base sm:!text-lg flex items-center gap-2">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
                {progress.sessions?.length > 0 ? (
                  progress.sessions.map((session: any) => (
                    <SessionRow key={session.id} session={session} showDate />
                  ))
                ) : (
                  <p className="text-center text-xs sm:text-sm text-muted-foreground py-3 sm:py-4">No sessions yet.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Badges */}
          {progress.badges?.length > 0 && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
              <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                  <CardTitle className="!text-base sm:!text-lg flex items-center gap-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                    Badges Earned
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {progress.badges.map((badge: any, i: number) => (
                      <Badge key={badge.id || i} variant="secondary" className="py-1 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm gap-1 sm:gap-1.5">
                        <span>{badge.icon}</span>
                        <span>{badge.title}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SessionRow({ session, showDate }: { session: any; showDate?: boolean }) {
  const accuracy = session.totalProblems ? Math.round((session.correctAnswers / session.totalProblems) * 100) : 0;
  return (
    <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-[10px] sm:text-sm font-bold flex-shrink-0 ${
          accuracy >= 80 ? "bg-green-500" : accuracy >= 60 ? "bg-yellow-500" : "bg-orange-500"
        }`}>
          {accuracy}%
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate">{session.totalProblems} problems</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {session.correctAnswers}/{session.totalProblems} correct
            {session.hintsUsed > 0 && ` · ${session.hintsUsed} hints`}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <Badge variant={session.status === "completed" ? "default" : "secondary"} className="text-[10px] sm:text-xs py-0 px-1.5 sm:px-2">
          {session.status === "completed" ? "Done" : session.status}
        </Badge>
        {showDate && session.completedAt && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            {new Date(session.completedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string; }) {
  return (
    <Card className={`${color}`}>
      <CardContent className="p-2.5 sm:p-4">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
          {icon}
          <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm sm:text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
