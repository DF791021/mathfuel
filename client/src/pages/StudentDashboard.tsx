import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MissionLaunchCards } from "@/components/MissionProgress";

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Flame, Trophy, Play, Target, BarChart3,
  BookOpen, LogOut, User, Map, Brain, Copy, Check, UserPlus,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663117001051/BAbKuMSfjHaa9ao8qByqEp/mathfuel-logo-V7jjfN52dexxQobYgXDFCk.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: "easeOut" as const },
  }),
};

/* ─── Sub-components ─── */

function StreakDisplay({ streak, longest }: { streak: number; longest: number }) {
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
              <Flame className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            {streak >= 3 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow"
              >
                🔥
              </motion.div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-2xl sm:text-3xl font-bold text-orange-700 leading-tight">
              {streak} day{streak !== 1 ? "s" : ""}
            </p>
            <p className="text-xs sm:text-sm text-orange-600/80">Current Streak</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Best: {longest} days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MasteryOverview({ mastery }: { mastery: any }) {
  const total = mastery.totalSkills || 1;
  const masteredPct = Math.round((mastery.mastered / total) * 100);
  const practicingPct = Math.round((mastery.practicing / total) * 100);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Skill Mastery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="p-2 sm:p-3 rounded-xl bg-green-50 border border-green-200">
            <p className="text-lg sm:text-2xl font-bold text-green-700">{mastery.mastered}</p>
            <p className="text-[10px] sm:text-xs text-green-600">Mastered</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-lg sm:text-2xl font-bold text-blue-700">{mastery.practicing}</p>
            <p className="text-[10px] sm:text-xs text-blue-600">Practicing</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-lg sm:text-2xl font-bold text-purple-700">{mastery.overallAccuracy}%</p>
            <p className="text-[10px] sm:text-xs text-purple-600">Accuracy</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{masteredPct}%</span>
          </div>
          <div className="w-full h-2.5 sm:h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full flex">
              <div className="bg-green-500 transition-all duration-500" style={{ width: `${masteredPct}%` }} />
              <div className="bg-blue-400 transition-all duration-500" style={{ width: `${practicingPct}%` }} />
            </div>
          </div>
          <div className="flex gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Mastered</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Practicing</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted" /> Not Started</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgeShowcase({ badges }: { badges: any[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
          Badges {badges.length > 0 && `(${badges.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">Complete sessions to earn badges!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id || i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring" }}
              >
                <Badge variant="secondary" className="py-1.5 px-2.5 sm:py-2 sm:px-3 text-xs sm:text-sm gap-1 sm:gap-1.5">
                  <span>{badge.icon}</span>
                  <span>{badge.title}</span>
                </Badge>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentSessions({ sessions }: { sessions: any[] }) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Recent Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-4 sm:py-6 text-muted-foreground">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-30" />
            <p className="text-xs sm:text-sm">No sessions yet. Start practicing!</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {sessions.map((session: any) => {
              const accuracy = session.totalProblems
                ? Math.round((session.correctAnswers / session.totalProblems) * 100)
                : 0;
              return (
                <div key={session.id} className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 ${
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
                  <Badge variant={session.status === "completed" ? "default" : "secondary"} className="text-[10px] sm:text-xs flex-shrink-0 ml-2">
                    {session.status === "completed" ? "Done" : session.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Invite Code Card ─── */

function InviteCodeCard() {
  const [copied, setCopied] = useState(false);
  const generateCode = trpc.parent.generateInviteCode.useMutation();

  const handleGenerate = () => {
    generateCode.mutate(undefined, {
      onSuccess: () => setCopied(false),
    });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-indigo-900">Connect a Parent</h3>
            <p className="text-xs sm:text-sm text-indigo-600/70 mt-0.5">
              Share this code with your parent so they can track your progress.
            </p>

            {generateCode.data ? (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <div className="bg-white rounded-lg px-4 py-2.5 font-mono text-lg sm:text-2xl font-bold tracking-[0.2em] text-indigo-700 border border-indigo-200 shadow-sm">
                    {generateCode.data.code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generateCode.data!.code)}
                    className="h-10 w-10 p-0 flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] sm:text-xs text-indigo-500 mt-1.5">
                  {generateCode.data.isExisting ? "Your existing code" : "New code generated"} — valid for 7 days
                </p>
              </div>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={generateCode.isPending}
                size="sm"
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {generateCode.isPending ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                Generate Invite Code
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */

export default function StudentDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "Dashboard - MathFuel";
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: dashboard, isLoading } = trpc.student.getDashboard.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  if (authLoading || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 sm:space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Skeleton className="h-28 sm:h-32" />
            <Skeleton className="h-28 sm:h-32" />
          </div>
          <Skeleton className="h-48 sm:h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav — compact on mobile */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-12 sm:h-14">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 font-bold text-base sm:text-lg no-underline">
            <img src={LOGO_URL} alt="MathFuel" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="text-primary">Math</span>
            <span className="text-accent">Fuel</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <Link href="/skills">
              <Button variant="ghost" size="sm" className="gap-1 px-2 sm:px-3 h-9 sm:h-10 text-xs sm:text-sm">
                <Map className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Skills</span>
              </Button>
            </Link>
            <Link href="/parent">
              <Button variant="ghost" size="sm" className="gap-1 px-2 sm:px-3 h-9 sm:h-10 text-xs sm:text-sm">
                <User className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">Parent</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout()} className="px-2 sm:px-3 h-9 sm:h-10 text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 safe-bottom">
        {/* Welcome + Quick Start */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="!text-xl sm:!text-3xl font-bold truncate">
                Hey {user?.name?.split(" ")[0] || "Learner"}! 👋
              </h1>
              <p className="text-xs sm:text-base text-muted-foreground mt-0.5">
                Ready to practice some math today?
              </p>
            </div>
            <Link href="/practice">
              <Button size="lg" className="gap-1.5 sm:gap-2 shadow-lg text-sm sm:text-lg px-4 sm:px-8 h-11 sm:h-12 flex-shrink-0 rounded-xl">
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Start Practice</span>
                <span className="sm:hidden">Practice</span>
              </Button>
            </Link>
          </div>
        </motion.div>

        {user?.userType === "student" && <MissionLaunchCards />}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <StreakDisplay
              streak={dashboard?.streak?.currentStreak ?? 0}
              longest={dashboard?.streak?.longestStreak ?? 0}
            />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <MasteryOverview mastery={dashboard?.mastery ?? { totalSkills: 0, mastered: 0, practicing: 0, overallAccuracy: 0 }} />
          </motion.div>
        </div>

        {/* Badges + Sessions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <BadgeShowcase badges={dashboard?.badges ?? []} />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
            <RecentSessions sessions={dashboard?.recentSessions ?? []} />
          </motion.div>
        </div>

        {/* Invite Code for Parents */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <InviteCodeCard />
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[
              { href: "/practice", icon: Brain, label: "Practice", color: "bg-primary/10 text-primary" },
              { href: "/skills", icon: Map, label: "Skill Map", color: "bg-green-100 text-green-700" },
              { href: "/practice?type=review", icon: BookOpen, label: "Review", color: "bg-purple-100 text-purple-700" },
              { href: "/parent", icon: BarChart3, label: "Progress", color: "bg-orange-100 text-orange-700" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-2.5 sm:p-4 flex flex-col items-center gap-1.5 sm:gap-2 text-center">
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <span className="text-[10px] sm:text-sm font-medium leading-tight">{item.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
