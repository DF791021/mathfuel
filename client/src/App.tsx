import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "sonner";

// Lazy load pages
const Home = React.lazy(() => import("./pages/Home"));
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const StudentDashboard = React.lazy(() => import("./pages/StudentDashboard"));
const PracticeSession = React.lazy(() => import("./pages/PracticeSession"));
const MissionPractice = React.lazy(() => import("./pages/MissionPractice"));
const ParentDashboard = React.lazy(() => import("./pages/ParentDashboard"));
const SkillMap = React.lazy(() => import("./pages/SkillMap"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

function Router() {
  return (
    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/dashboard" component={StudentDashboard} />
        <Route path="/missions" component={MissionPractice} />
        <Route path="/missions/:missionId" component={MissionPractice} />
        <Route path="/practice" component={PracticeSession} />
        <Route path="/practice/:skillId" component={PracticeSession} />
        <Route path="/skills" component={SkillMap} />
        <Route path="/parent" component={ParentDashboard} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
