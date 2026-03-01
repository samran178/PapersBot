import { useParams, Link } from "wouter";
import { useAttempt } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { ArrowLeft, Trophy, CheckCircle, XCircle, Clock } from "lucide-react";
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

  const score = attempt.score || 0;
  const isPassing = score >= 70;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <Link href="/student" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        {/* Hero Result Card */}
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-sm relative overflow-hidden mb-12">
          <div className={`absolute top-0 left-0 w-full h-2 ${isPassing ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ${
            isPassing ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            <Trophy className="w-10 h-10" />
          </div>
          
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            {isPassing ? 'Great Job!' : 'Exam Completed'}
          </h1>
          <p className="text-lg text-muted-foreground mb-8">You have successfully submitted {attempt.exam.title}.</p>
          
          <div className="inline-flex flex-col items-center justify-center p-6 rounded-2xl bg-secondary/50 border border-border min-w-[200px]">
            <span className="text-sm font-medium text-muted-foreground mb-1">Final Score</span>
            <span className={`font-display text-6xl font-bold tracking-tight ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
              {Math.round(score)}%
            </span>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
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

        {/* Note about detailed review */}
        <div className="bg-secondary/30 border border-border rounded-2xl p-6 text-center">
          <p className="text-foreground font-medium">
            Detailed question review is currently disabled by your instructor.
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Your score has been recorded and is available on your dashboard.
          </p>
        </div>
      </div>
    </Layout>
  );
}
