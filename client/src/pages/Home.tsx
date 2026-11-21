import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { WorkshopEntrance } from "@/components/WorkshopEntrance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Play, Brain, Target, BarChart3, Shield, Sparkles,
  ChevronRight, Flame, Star, Trophy, Zap, Heart, Menu, X,
} from "lucide-react";
// Auth links are now internal routes

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663117001051/BAbKuMSfjHaa9ao8qByqEp/mathfuel-logo-V7jjfN52dexxQobYgXDFCk.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "MathFuel - Adaptive Math Practice for Young Learners";
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.userType === "parent") {
        navigate("/parent");
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, user, navigate]);

  const features = [
    {
      icon: <Brain className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Adaptive Difficulty",
      description: "Problems get harder when your child is ready, and easier when they need support.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Target className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Mastery-Based",
      description: "Skills tracked from 'not started' to 'mastered'. Real understanding, not just speed.",
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      icon: <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Scaffolded Hints",
      description: "Step-by-step hints that teach thinking — powered by an AI tutor.",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Parent Dashboard",
      description: "See what your child practiced, where they struggled, and what to work on next.",
      color: "text-chart-5",
      bg: "bg-chart-5/10",
    },
    {
      icon: <Flame className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Streaks & Rewards",
      description: "Daily streaks, badges, and celebrations keep kids coming back.",
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      icon: <Shield className="w-6 h-6 sm:w-8 sm:h-8" />,
      title: "Safe & Simple",
      description: "No ads, no distractions. Big buttons and clear text for 6-8 year olds.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  const skillAreas = [
    { emoji: "🔢", name: "Counting", desc: "Count, compare, order" },
    { emoji: "➕", name: "Addition", desc: "Add within 100" },
    { emoji: "➖", name: "Subtraction", desc: "Subtract within 100" },
    { emoji: "📏", name: "Place Value", desc: "Tens and ones" },
    { emoji: "📐", name: "Measurement", desc: "Length, time, money" },
    { emoji: "📖", name: "Word Problems", desc: "Real-world math" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-amber-50/30">
      {/* Floating Math Symbols - hidden on small mobile to reduce clutter */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden sm:block">
        {["➕", "➖", "✕", "÷", "=", "🔢"].map((sym, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -15 + i * 5, 0], rotate: [0, 5 - i * 2, 0] }}
            transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.5 }}
            className="absolute text-4xl opacity-10"
            style={{
              top: `${15 + i * 13}%`,
              left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
              right: i % 2 === 1 ? `${5 + i * 3}%` : undefined,
            }}
          >
            {sym}
          </motion.div>
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <img src={LOGO_URL} alt="MathFuel" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-xl sm:text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Chango', sans-serif" }}>
              Math<span className="text-accent">Fuel</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login" className="no-underline">
              <Button variant="outline" size="sm">Log In</Button>
            </Link>
            <Link href="/signup" className="no-underline">
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sm:hidden bg-white border-t border-border/50 px-4 py-4 space-y-3"
          >
            <Link href="/login" className="block no-underline">
              <Button variant="outline" className="w-full justify-center">Log In</Button>
            </Link>
            <Link href="/signup" className="block no-underline">
              <Button className="w-full justify-center bg-accent text-accent-foreground hover:bg-accent/90">
                Get Started Free
              </Button>
            </Link>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-10 sm:pt-16 pb-14 sm:pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 bg-accent/15 text-accent-foreground px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
              Built for Grades 1 & 2
            </div>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="!text-3xl sm:!text-5xl md:!text-6xl font-extrabold text-foreground !leading-tight mb-4 sm:mb-6"
          >
            Math practice that{" "}
            <span className="text-primary">actually works</span>
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
          >
            Adaptive difficulty. Scaffolded hints. Real mastery tracking.
            MathFuel builds confidence — not just correct answers.
          </motion.p>

          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
          >
            <Link href="/signup" className="no-underline">
              <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-2xl shadow-lg shadow-primary/25">
                <Play className="w-5 h-5 mr-2" />
                Start Practicing Free
              </Button>
            </Link>
            <a href="#features" className="no-underline">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-2xl">
                See How It Works
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </a>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="grid grid-cols-3 gap-4 sm:gap-6 max-w-sm sm:max-w-lg mx-auto mt-10 sm:mt-14"
          >
            {[
              { value: "200+", label: "Problems" },
              { value: "7", label: "Skill Areas" },
              { value: "5", label: "Difficulty Levels" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-xl sm:text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-14 sm:py-20 px-4 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <h2 className="!text-2xl sm:!text-4xl font-extrabold text-foreground mb-3 sm:mb-4">
              Why parents love MathFuel
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
              Every feature is designed to build real understanding, not just speed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="h-full border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${feature.bg} flex items-center justify-center mb-3 sm:mb-4 ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Skill Areas */}
      <section className="relative z-10 py-14 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <h2 className="!text-2xl sm:!text-4xl font-extrabold text-foreground mb-3 sm:mb-4">
              What your child will practice
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-2">
              Aligned with Grade 1-2 standards. Every skill builds on the last.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {skillAreas.map((skill, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] bg-white cursor-default">
                  <CardContent className="p-3 sm:p-5 text-center">
                    <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">{skill.emoji}</div>
                    <h3 className="font-bold text-foreground mb-0.5 sm:mb-1 text-xs sm:text-base">{skill.name}</h3>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">{skill.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-14 sm:py-20 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <h2 className="!text-2xl sm:!text-4xl font-extrabold text-foreground mb-3 sm:mb-4">
              How a session works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: "1",
                icon: <Play className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Start a session",
                desc: "Your child taps 'Practice' and gets 10 problems matched to their level.",
              },
              {
                step: "2",
                icon: <Brain className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Solve with support",
                desc: "If stuck, hints appear one at a time — teaching the thinking, not just the answer.",
              },
              {
                step: "3",
                icon: <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "See progress",
                desc: "After each session, see what improved. Parents get a full breakdown.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-primary-foreground">
                  {item.icon}
                </div>
                <div className="text-xs sm:text-sm font-bold text-primary mb-1 sm:mb-2">Step {item.step}</div>
                <h3 className="!text-base sm:!text-lg font-bold text-foreground mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-14 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <Heart className="w-10 h-10 sm:w-12 sm:h-12 text-destructive mx-auto mb-4 sm:mb-6" />
            <h2 className="!text-2xl sm:!text-4xl font-extrabold text-foreground mb-3 sm:mb-4">
              Give your child the confidence to love math
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2">
              Free to start. No credit card required. See real progress in the first week.
            </p>
            <Link href="/signup" className="no-underline">
              <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 rounded-2xl shadow-lg shadow-accent/25">
                <Zap className="w-5 h-5 mr-2" />
                Start Free Today
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-foreground/5 py-6 sm:py-8 px-4 safe-bottom">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="MathFuel" className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="font-bold text-foreground text-sm sm:text-base" style={{ fontFamily: "'Chango', sans-serif" }}>
              Math<span className="text-accent">Fuel</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Adaptive math practice for young learners.
          </p>
          <WorkshopEntrance />
        </div>
      </footer>
    </div>
  );
}
