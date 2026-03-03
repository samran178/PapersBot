import { useExams } from "@/hooks/use-exams";
import { useAttempts, useStartAttempt } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { Clock, FileText, Trophy, PlayCircle, Loader2, CalendarX, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function getDeadline(exam: any): Date | null {
  if (!exam.availableDays || !exam.publishedAt) return null;
  return addDays(new Date(exam.publishedAt), exam.availableDays);
}

function isExpired(exam: any): boolean {
  const deadline = getDeadline(exam);
  if (!deadline) return false;
  return new Date() > deadline;
}

function daysUntilDeadline(exam: any): number | null {
  const deadline = getDeadline(exam);
  if (!deadline) return null;
  return differenceInDays(deadline, new Date());
}

export default function StudentDashboard() {
  const { data: exams, isLoading: isExamsLoading } = useExams();
  const { data: attempts, isLoading: isAttemptsLoading } = useAttempts();
  const startMutation = useStartAttempt();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const publishedExams = exams?.filter(e => e.isPublished) || [];

  const handleStart = async (examId: number) => {
    try {
      const attempt = await startMutation.mutateAsync({ examId });
      setLocation(`/student/attempt/${attempt.id}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Cannot start exam", description: err.message });
    }
  };

  const isLoading = isExamsLoading || isAttemptsLoading;

  const availableExams = publishedExams.filter(exam => {
    const userAttempt = attempts?.find(a => a.examId === exam.id);
    if (userAttempt?.isCompleted) return false;
    return true;
  });

  const openExams = availableExams.filter(e => !isExpired(e));
  const expiredExams = availableExams.filter(e => isExpired(e));

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
              {[1, 2].map(i => <div key={i} className="h-48 rounded-2xl bg-secondary/50 animate-pulse border border-border/50" />)}
            </div>
          ) : openExams.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/10 text-muted-foreground">
              No exams available at the moment.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {openExams.map(exam => {
                const userAttempt = attempts?.find(a => a.examId === exam.id && !a.isCompleted);
                const deadline = getDeadline(exam);
                const daysLeft = daysUntilDeadline(exam);

                return (
                  <div key={exam.id} data-testid={`card-exam-${exam.id}`} className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-xl transition-all duration-300 flex flex-col">
                    <h3 className="font-display text-xl font-bold text-foreground mb-2">{exam.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4 flex-1">{exam.description || "No description."}</p>

                    <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-4 bg-secondary/50 p-3 rounded-xl">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Clock className="w-4 h-4 text-muted-foreground" /> {exam.durationMinutes}m
                      </div>
                      <div className="w-1 h-1 rounded-full bg-border" />
                      <div className="flex items-center gap-1.5 text-foreground">
                        <FileText className="w-4 h-4 text-muted-foreground" /> {exam.questions?.length || 0} Qs
                      </div>
                    </div>

                    {deadline && (
                      <div className={`flex items-center gap-1.5 text-xs font-medium mb-4 px-3 py-2 rounded-lg ${
                        daysLeft !== null && daysLeft <= 1
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : daysLeft !== null && daysLeft <= 3
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        Closes {format(deadline, 'MMM d, yyyy')}
                        {daysLeft !== null && daysLeft <= 3 && (
                          <span className="ml-auto font-bold">
                            {daysLeft === 0 ? 'Today!' : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      data-testid={`button-start-${exam.id}`}
                      onClick={() => handleStart(exam.id)}
                      disabled={startMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all disabled:opacity-50"
                    >
                      {startMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      {userAttempt ? "Resume Attempt" : "Start Exam"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Expired Exams */}
        {expiredExams.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
              <span className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <CalendarX className="w-4 h-4" />
              </span>
              Expired Exams
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiredExams.map(exam => {
                const deadline = getDeadline(exam);
                return (
                  <div key={exam.id} className="bg-card rounded-2xl p-5 border border-border/60 opacity-60 flex flex-col gap-2">
                    <h3 className="font-display text-lg font-bold text-foreground">{exam.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                      <CalendarX className="w-3.5 h-3.5" />
                      Closed {deadline ? format(deadline, 'MMM d, yyyy') : 'unknown'}
                    </div>
                    <p className="text-xs text-muted-foreground">This exam is no longer accepting submissions.</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {attempt.score === null ? 'Score' : 'Final Score'}
                      </div>
                      <div className={`text-2xl font-display font-bold ${
                        attempt.score === null
                          ? 'text-blue-500'
                          : attempt.score >= 70
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                      }`}>
                        {attempt.score !== null ? `${Math.round(attempt.score)}%` : 'Pending'}
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
