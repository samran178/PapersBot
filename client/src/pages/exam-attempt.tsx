import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAttempt } from "@/hooks/use-attempts";
import { useSubmitPartition } from "@/hooks/use-attempts";
import { Clock, AlertCircle, ArrowRight, BookOpen, Coffee, ChevronRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

const SECTION_LABELS: Record<number, string> = { 1: "Part 1", 2: "Part 2", 3: "Part 3", 4: "Part 4" };

export default function ExamAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const attemptId = parseInt(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attempt, isLoading } = useAttempt(attemptId);
  const submitPartitionMutation = useSubmitPartition();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [nextPartition, setNextPartition] = useState<number | null>(null);
  const [justSubmittedPartition, setJustSubmittedPartition] = useState<number | null>(null);
  const timeoutFired = useRef(false);

  // Initialise timer from attempt start time
  useEffect(() => {
    if (!attempt?.exam || !attempt.startTime || attempt.isCompleted) return;
    const totalSecs = attempt.exam.durationMinutes * 60;
    const elapsed = Math.floor((Date.now() - new Date(attempt.startTime).getTime()) / 1000);
    const remaining = Math.max(0, totalSecs - elapsed);
    setTimeLeft(remaining);
    // Reset answers when partition changes (resume scenario)
    setAnswers({});
  }, [attempt?.currentPartition, attempt?.exam?.durationMinutes]);

  // Countdown tick
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft !== null]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft !== 0 || timeoutFired.current || !attempt || attempt.isCompleted) return;
    timeoutFired.current = true;
    handleSubmitPartition(true);
  }, [timeLeft]);

  const handleSubmitPartition = async (isTimeout = false) => {
    if (!attempt) return;
    const partitionBeingSubmitted = attempt.currentPartition ?? 1;
    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: parseInt(qId),
      answer: ans,
    }));
    try {
      const updated = await submitPartitionMutation.mutateAsync({
        id: attemptId,
        data: { answers: formattedAnswers, isTimeout },
      });
      if (updated.isCompleted) {
        toast({ title: isTimeout ? "Time's up!" : "Exam submitted!", description: "Your paper has been sent to the teacher." });
        setLocation(`/student/result/${attemptId}`);
      } else {
        setJustSubmittedPartition(partitionBeingSubmitted);
        setNextPartition(updated.currentPartition);
        setShowBreakModal(true);
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Could not submit", description: err.message });
    }
  };

  const handleContinue = () => {
    setShowBreakModal(false);
    setAnswers({});
    setNextPartition(null);
    setJustSubmittedPartition(null);
    // Refetch so the page shows the new partition's questions
    queryClient.invalidateQueries({ queryKey: [api.attempts.get.path, attemptId] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!attempt || !attempt.exam) {
    return <div className="p-10 text-center text-muted-foreground">Attempt not found.</div>;
  }

  if (attempt.isCompleted) {
    setLocation(`/student/result/${attemptId}`);
    return null;
  }

  const mins = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
  const secs = timeLeft !== null ? timeLeft % 60 : 0;
  const isLowTime = timeLeft !== null && timeLeft < 300;

  const allQuestions = [...(attempt.exam.questions || [])].sort((a, b) =>
    a.partition !== b.partition ? a.partition - b.partition : a.id - b.id
  );

  const allPartitions = [...new Set(allQuestions.map(q => q.partition))].sort();
  const currentPartition = attempt.currentPartition ?? 1;
  const partitionIndex = allPartitions.indexOf(currentPartition);
  const totalParts = allPartitions.length;
  const currentQuestions = allQuestions.filter(q => q.partition === currentPartition);

  const answeredCount = currentQuestions.filter(q => answers[q.id] !== undefined).length;
  const allAnswered = answeredCount === currentQuestions.length && currentQuestions.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Break / Continue Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                {SECTION_LABELS[justSubmittedPartition ?? currentPartition] || `Part ${justSubmittedPartition ?? currentPartition}`} Submitted!
              </h2>
              <p className="text-muted-foreground">
                Great work. Would you like to take a short break before starting{" "}
                <span className="font-semibold text-foreground">
                  {SECTION_LABELS[nextPartition ?? currentPartition + 1] || `Part ${nextPartition ?? currentPartition + 1}`}
                </span>
                ?
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                data-testid="button-take-break"
                onClick={() => setLocation("/student")}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-border bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors"
              >
                <Coffee className="w-4 h-4" />
                Take a Break
              </button>
              <button
                data-testid="button-continue-next-part"
                onClick={handleContinue}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:shadow-lg transition-all"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              The exam timer is still running during breaks.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {SECTION_LABELS[currentPartition] || `Part ${currentPartition}`} of {totalParts}
            </p>
            <h1 className="font-display font-bold text-base truncate text-foreground leading-tight">
              {attempt.exam.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-base font-bold border transition-colors ${
              isLowTime
                ? "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
                : "bg-secondary border-border text-foreground"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
            </div>

            <button
              data-testid="button-submit-part"
              onClick={() => handleSubmitPartition(false)}
              disabled={submitPartitionMutation.isPending}
              className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                allAnswered
                  ? "bg-primary text-primary-foreground hover:shadow-md"
                  : "bg-secondary text-secondary-foreground border border-border"
              }`}
            >
              {submitPartitionMutation.isPending
                ? "Submitting..."
                : currentPartition === allPartitions[allPartitions.length - 1]
                  ? "Submit Exam"
                  : `Submit ${SECTION_LABELS[currentPartition] || "Part"}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Part progress bar */}
        <div className="h-1 bg-secondary w-full flex">
          {allPartitions.map((p, i) => (
            <div
              key={p}
              className={`flex-1 transition-colors ${
                i < partitionIndex
                  ? "bg-emerald-500"
                  : i === partitionIndex
                    ? "bg-primary"
                    : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Section banner */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
            <BookOpen className="w-4 h-4" />
            <span className="font-display font-bold text-sm">
              {SECTION_LABELS[currentPartition] || `Part ${currentPartition}`}
            </span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">
            {currentQuestions.length} question{currentQuestions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {!allAnswered && currentQuestions.length > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {answeredCount}/{currentQuestions.length} questions answered
          </div>
        )}

        {/* Questions */}
        {currentQuestions.map((q, index) => (
          <div key={q.id} data-testid={`question-card-${q.id}`} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex gap-4 mb-6">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <p className="text-lg font-medium text-foreground leading-relaxed pt-1">{q.text}</p>
            </div>

            <div className="space-y-3 pl-12">
              {q.type === "mcq" ? (
                (q.options || []).map((opt: string, oIndex: number) => (
                  <label
                    key={oIndex}
                    data-testid={`option-${q.id}-${oIndex}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      answers[q.id] === opt
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                      className="w-5 h-5 text-primary"
                    />
                    <span className="text-foreground">{opt}</span>
                  </label>
                ))
              ) : (
                <textarea
                  data-testid={`textarea-answer-${q.id}`}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[140px] resize-y"
                  placeholder="Write your answer here..."
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}
            </div>
          </div>
        ))}

        {/* Mobile submit */}
        <div className="sm:hidden pb-8">
          <button
            data-testid="button-submit-part-mobile"
            onClick={() => handleSubmitPartition(false)}
            disabled={submitPartitionMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all"
          >
            {submitPartitionMutation.isPending
              ? "Submitting..."
              : currentPartition === allPartitions[allPartitions.length - 1]
                ? "Submit Exam"
                : `Submit ${SECTION_LABELS[currentPartition] || "Part"}`}
          </button>
        </div>
      </main>
    </div>
  );
}
