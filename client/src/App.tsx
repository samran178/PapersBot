import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

// Pages
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import TeacherDashboard from "@/pages/teacher-dashboard";
import CreateExamPage from "@/pages/create-exam";
import ExamDetailsPage from "@/pages/exam-details";
import StudentDashboard from "@/pages/student-dashboard";
import ExamAttemptPage from "@/pages/exam-attempt";
import AttemptResultPage from "@/pages/attempt-result";

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: 'teacher' | 'student' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>;
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Redirect to={user.role === 'teacher' ? '/teacher' : '/student'} />;
  }

  return <Component />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/auth" />;
  return <Redirect to={user.role === 'teacher' ? '/teacher' : '/student'} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Teacher Routes */}
      <Route path="/teacher">
        {() => <ProtectedRoute component={TeacherDashboard} allowedRole="teacher" />}
      </Route>
      <Route path="/teacher/exam/new">
        {() => <ProtectedRoute component={CreateExamPage} allowedRole="teacher" />}
      </Route>
      <Route path="/teacher/exam/:id">
        {() => <ProtectedRoute component={ExamDetailsPage} allowedRole="teacher" />}
      </Route>

      {/* Student Routes */}
      <Route path="/student">
        {() => <ProtectedRoute component={StudentDashboard} allowedRole="student" />}
      </Route>
      <Route path="/student/attempt/:id">
        {() => <ProtectedRoute component={ExamAttemptPage} allowedRole="student" />}
      </Route>
      <Route path="/student/result/:id">
        {() => <ProtectedRoute component={AttemptResultPage} allowedRole="student" />}
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
