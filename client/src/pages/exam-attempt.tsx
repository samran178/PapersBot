import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAttempt, useSubmitAttempt } from "@/hooks/use-attempts";
import { Clock, AlertCircle, ArrowRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExamAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const attemptId = parseInt(id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: attempt, isLoading } = useAttempt(attemptId);
  const submitMutation = useSubmitAttempt();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (attempt && attempt.exam && !attempt.isCompleted && timeLeft === null) {
      setTimeLeft(attempt.exam.durationMinutes * 60);
    }
  }, [attempt, timeLeft]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || attempt?.isCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, attempt]);

  const handleAutoSubmit = async () => {
    toast({ title: "Time's up!", description: "Submitting your exam automatically." });
    await handleSubmit(true);
  };

  const handleSubmit = async (isTimeout = false) => {
    if (!attempt?.exam) return;

    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: parseInt(qId),
      answer: ans
    }));

    try {
      await submitMutation.mutateAsync({
        id: attemptId,
        data: { answers: formattedAnswers }
      });
      setLocation(`/student/result/${attemptId}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to submit", description: err.message });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!attempt || !attempt.exam) {
    return <div className="p-10 text-center">Attempt not found.</div>;
  }

  if (attempt.isCompleted) {
    setLocation(`/student/result/${attemptId}`);
    return null;
  }

  const mins = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
  const secs = timeLeft !== null ? timeLeft % 60 : 0;
  const isLowTime = timeLeft !== null && timeLeft < 300;

  const rawQuestions = attempt.exam.questions || [];

  const sortedQuestions = [...rawQuestions].sort((a, b) => {
    if (a.partition !== b.partition) return a.partition - b.partition;
    return a.id - b.id;
  });

  const partitionGroups = new Map<number, typeof sortedQuestions>();
  sortedQuestions.forEach(q => {
    const part = q.partition ?? 1;
    if (!partitionGroups.has(part)) partitionGroups.set(part, []);
    partitionGroups.get(part)!.push(q);
  });

  const allQuestions = sortedQuestions;
  const answeredCount = Object.keys(answers).filter(qid =>
    allQuestions.some(q => q.id === parseInt(qid))
  ).length;
  const isComplete = answeredCount === allQuestions.length && allQuestions.length > 0;

  const sectionLabels: Record<number, string> = {
    1: 'Section A',
    2: 'Section B',
    3: 'Section C',
    4: 'Section D',
  };

  let globalIndex = 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="font-display font-bold text-lg truncate max-w-[200px] sm:max-w-md">
            {attempt.exam.title}
          </h1>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold border transition-colors ${
              isLowTime
                ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                : 'bg-secondary border-border text-foreground'
            }`}>
              <Clock className="w-4 h-4" />
              {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
            </div>

            <button
              data-testid="button-submit-exam"
              onClick={() => handleSubmit(false)}
              disabled={submitMutation.isPending}
              className={`hidden sm:flex items-center gap-2 px-5 py-2 rounded-full font-semibold transition-all ${
                isComplete
                  ? 'bg-primary text-primary-foreground hover:shadow-md'
                  : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
              }`}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Exam'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-1 bg-secondary w-full">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${allQuestions.length > 0 ? (answeredCount / allQuestions.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {!isComplete && allQuestions.length > 0 && (
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Answer all questions before submitting. ({answeredCount}/{allQuestions.length} completed)
          </div>
        )}

        {allQuestions.length === 0 ? (
          <div className="text-center p-12 bg-secondary/20 rounded-2xl border border-dashed border-border">
            No questions found for this exam. Please contact your teacher.
          </div>
        ) : (
          Array.from(partitionGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([partitionNum, questions]) => (
              <div key={partitionNum} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl border border-primary/20">
                    <BookOpen className="w-4 h-4" />
                    <span className="font-display font-bold text-sm">
                      {sectionLabels[partitionNum] || `Section ${partitionNum}`}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {questions.map((q) => {
                  const currentIndex = ++globalIndex;
                  return (
                    <div key={q.id} data-testid={`question-card-${q.id}`} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
                      <div className="flex gap-4 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">
                          {currentIndex}
                        </div>
                        <h2 className="text-lg font-medium text-foreground leading-relaxed pt-1">{q.text}</h2>
                      </div>

                      <div className="space-y-3 pl-12">
                        {q.type === 'mcq' ? (
                          (q.options || []).map((opt: string, oIndex: number) => (
                            <label
                              key={oIndex}
                              data-testid={`option-${q.id}-${oIndex}`}
                              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                answers[q.id] === opt
                                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                  : 'border-border hover:bg-secondary/50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className="w-5 h-5 text-primary border-border focus:ring-primary"
                              />
                              <span className="text-foreground">{opt}</span>
                            </label>
                          ))
                        ) : (
                          <textarea
                            data-testid={`textarea-answer-${q.id}`}
                            className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[150px] resize-y"
                            placeholder="Write your answer here..."
                            value={answers[q.id] || ""}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
        )}

        <div className="pt-8 pb-20 flex justify-center sm:hidden">
          <button
            data-testid="button-submit-exam-mobile"
            onClick={() => handleSubmit(false)}
            disabled={submitMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </main>
    </div>
  );
}
