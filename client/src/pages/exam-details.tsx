import { useParams, Link } from "wouter";
import { useExam, usePublishExam } from "@/hooks/use-exams";
import { useAttempts } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { ArrowLeft, Clock, FileText, Globe, Lock, Trophy, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ExamDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id);
  
  const { data: exam, isLoading: isExamLoading } = useExam(examId);
  const { data: allAttempts, isLoading: isAttemptsLoading } = useAttempts();
  const publishMutation = usePublishExam();

  if (isExamLoading || isAttemptsLoading) {
    return <Layout><div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div></Layout>;
  }

  if (!exam) {
    return <Layout><div className="text-center py-20">Exam not found.</div></Layout>;
  }

  const examAttempts = allAttempts?.filter(a => a.examId === examId) || [];
  const completedAttempts = examAttempts.filter(a => a.isCompleted);
  const avgScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / completedAttempts.length) 
    : 0;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/teacher" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${exam.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {exam.isPublished ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {exam.isPublished ? 'Published' : 'Draft'}
                </div>
                <span className="text-sm text-muted-foreground">
                  Created {format(new Date(exam.createdAt || Date.now()), 'MMM d, yyyy')}
                </span>
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground tracking-tight mb-2">{exam.title}</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">{exam.description || "No description."}</p>
            </div>

            {!exam.isPublished && (
              <button 
                onClick={() => publishMutation.mutate(exam.id)}
                disabled={publishMutation.isPending}
                className="shrink-0 px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50"
              >
                Publish Exam
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <Clock className="w-5 h-5 text-muted-foreground mb-3" />
            <div className="text-2xl font-display font-bold">{exam.durationMinutes}</div>
            <div className="text-sm text-muted-foreground">Minutes</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <FileText className="w-5 h-5 text-muted-foreground mb-3" />
            <div className="text-2xl font-display font-bold">{exam.questions?.length || 0}</div>
            <div className="text-sm text-muted-foreground">Questions</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <Users className="w-5 h-5 text-muted-foreground mb-3" />
            <div className="text-2xl font-display font-bold">{examAttempts.length}</div>
            <div className="text-sm text-muted-foreground">Total Attempts</div>
          </div>
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <Trophy className="w-5 h-5 text-muted-foreground mb-3" />
            <div className="text-2xl font-display font-bold">{avgScore}%</div>
            <div className="text-sm text-muted-foreground">Avg. Score</div>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-12">
          <div className="px-6 py-5 border-b border-border bg-secondary/30">
            <h2 className="font-display text-xl font-bold">Student Attempts</h2>
          </div>
          {examAttempts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No students have attempted this exam yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/10 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Student</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Started At</th>
                    <th className="px-6 py-4 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {examAttempts.map(attempt => (
                    <tr key={attempt.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground capitalize">
                        {attempt.student?.username || `User #${attempt.studentId}`}
                      </td>
                      <td className="px-6 py-4">
                        {attempt.isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-medium">
                            <Clock className="w-3 h-3" /> In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {attempt.startTime ? format(new Date(attempt.startTime), 'MMM d, yyyy h:mm a') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {attempt.score !== null ? `${Math.round(attempt.score)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
