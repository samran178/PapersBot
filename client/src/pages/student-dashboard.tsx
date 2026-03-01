import { useExams } from "@/hooks/use-exams";
import { useAttempts, useStartAttempt } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { Clock, FileText, Trophy, PlayCircle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function StudentDashboard() {
  const { data: exams, isLoading: isExamsLoading } = useExams();
  const { data: attempts, isLoading: isAttemptsLoading } = useAttempts();
  const startMutation = useStartAttempt();
  const [, setLocation] = useLocation();

  const publishedExams = exams?.filter(e => e.isPublished) || [];
  
  const handleStart = async (examId: number) => {
    try {
      const attempt = await startMutation.mutateAsync({ examId });
      setLocation(`/student/attempt/${attempt.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const isLoading = isExamsLoading || isAttemptsLoading;

  return (
    <Layout>
      <div className="mb-12">
        <h1 className="font-display text-4xl font-bold text-foreground mb-2">My Assessments</h1>
        <p className="text-xl text-muted-foreground">Available exams and your past results.</p>
      </div>

      <div className="space-y-12">
        {/* Available Exams */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </span>
            Available to Take
          </h2>
          
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2].map(i => <div key={i} className="h-48 rounded-2xl bg-secondary/50 animate-pulse border border-border/50" />)}
            </div>
          ) : publishedExams.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/10 text-muted-foreground">
              No exams available at the moment.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedExams.map(exam => {
                // Check if user already completed it
                const userAttempt = attempts?.find(a => a.examId === exam.id);
                if (userAttempt?.isCompleted) return null;

                return (
                  <div key={exam.id} className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-xl transition-all duration-300 flex flex-col">
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">{exam.title}</h3>
                    <p className="text-muted-foreground text-sm mb-6 flex-1">{exam.description || "No description."}</p>
                    
                    <div className="flex items-center gap-4 text-sm font-medium text-foreground mb-6 bg-secondary/50 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-muted-foreground" /> {exam.durationMinutes}m
                      </div>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-muted-foreground" /> {exam.questions?.length || 0} Qs
                      </div>
                    </div>

                    <button
                      onClick={() => handleStart(exam.id)}
                      disabled={startMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {userAttempt ? "Resume Attempt" : "Start Exam"} 
                      <PlayCircle className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past Attempts */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </span>
            Completed Results
          </h2>
          
          {!isLoading && attempts?.filter(a => a.isCompleted).length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/10 text-muted-foreground">
              You haven't completed any exams yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {attempts?.filter(a => a.isCompleted).map(attempt => (
                <div key={attempt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-card border border-border shadow-sm hover:border-border/80 transition-colors gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">{attempt.exam?.title || 'Unknown Exam'}</h3>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Completed on {attempt.endTime ? format(new Date(attempt.endTime), 'MMM d, yyyy') : 'Unknown'}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-muted-foreground mb-1">Final Score</div>
                      <div className={`text-2xl font-display font-bold ${attempt.score && attempt.score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Math.round(attempt.score || 0)}%
                      </div>
                    </div>
                    <div className="w-px h-12 bg-border hidden sm:block" />
                    <button 
                      onClick={() => setLocation(`/student/result/${attempt.id}`)}
                      className="text-sm font-semibold text-primary hover:underline px-2"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
