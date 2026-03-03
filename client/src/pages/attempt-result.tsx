import { useParams, Link } from "wouter";
import { useAttempt } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { ArrowLeft, Trophy, Clock, AlertCircle, BookOpen } from "lucide-react";
import { format } from "date-fns";

export default function AttemptResultPage() {
  const { id } = useParams<{ id: string }>();
  const { data: attempt, isLoading } = useAttempt(parseInt(id));

  if (isLoading) {
    return <Layout><div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div></Layout>;
  }

  if (!attempt || !attempt.exam) {
    return <Layout><div className="text-center py-20">Result not found.</div></Layout>;
  }

  const score = attempt.score ?? null;
  const isPassing = score !== null && score >= 70;

  const questions = attempt.exam?.questions || [];
  const hasSubjective = questions.some(q => q.type === 'short' || q.type === 'long');
  const isPendingReview = hasSubjective && score === null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Link href="/student" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-sm relative overflow-hidden mb-8">
          <div className={`absolute top-0 left-0 w-full h-2 ${
            isPendingReview ? 'bg-blue-500' : isPassing ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />

          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${
            isPendingReview
              ? 'bg-blue-100 text-blue-600'
              : isPassing
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>

          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            {isPendingReview ? 'Exam Submitted!' : isPassing ? 'Great Job!' : 'Exam Completed'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            You have successfully submitted <span className="font-medium text-foreground">{attempt.exam.title}</span>.
          </p>

          {isPendingReview ? (
            <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-blue-50 border border-blue-200 min-w-[240px]">
              <BookOpen className="w-8 h-8 text-blue-500 mb-3" />
              <span className="text-sm font-medium text-blue-700 mb-1">Score Pending</span>
              <p className="text-xs text-blue-600 text-center">
                Your subjective answers are being reviewed by your teacher. Your final score will appear here once graded.
              </p>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/50 border border-border min-w-[200px]">
              <span className="text-sm font-medium text-muted-foreground mb-1">Final Score</span>
              <span data-testid="text-score" className={`font-display text-6xl font-bold tracking-tight ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                {score !== null ? `${Math.round(score)}%` : '—'}
              </span>
              {score !== null && (
                <span className={`text-sm mt-2 font-medium ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isPassing ? 'Passed' : 'Needs Improvement'}
                </span>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {attempt.endTime ? format(new Date(attempt.endTime), 'h:mm a, MMM d') : 'Unknown'}
            </div>
            {attempt.isTimeout && (
              <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                <AlertCircle className="w-4 h-4" /> Auto-submitted (Timeout)
              </div>
            )}
          </div>
        </div>

        {hasSubjective && (
          <div className="bg-secondary/30 border border-border rounded-2xl p-6 text-center">
            {isPendingReview ? (
              <>
                <p className="text-foreground font-medium">Your teacher will review your subjective answers and assign marks.</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Check your dashboard later — your final score will be updated once grading is complete.
                </p>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium">This score includes both MCQ auto-grading and teacher-reviewed subjective answers.</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Your score has been recorded and is available on your dashboard.
                </p>
              </>
            )}
          </div>
        )}

        {!hasSubjective && (
          <div className="bg-secondary/30 border border-border rounded-2xl p-6 text-center">
            <p className="text-foreground font-medium">
              Your score has been auto-graded based on your MCQ answers.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              The result is available on your dashboard.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
