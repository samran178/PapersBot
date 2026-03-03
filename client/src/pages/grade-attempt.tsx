import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAttempt, useAiGradeAttempt, useGradeAttempt } from "@/hooks/use-attempts";
import { Layout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Bot, Save, CheckCircle, XCircle, Clock, Sparkles, Loader2,
  BookOpen, MessageSquare, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Answer } from "@shared/routes";

export default function GradeAttemptPage() {
  const { id } = useParams<{ id: string }>();
  const attemptId = parseInt(id);
  const { toast } = useToast();

  const { data: attempt, isLoading, refetch } = useAttempt(attemptId);
  const aiGradeMutation = useAiGradeAttempt();
  const gradeMutation = useGradeAttempt();

  const [marks, setMarks] = useState<Record<number, string>>({});

  useEffect(() => {
    if (attempt?.answers) {
      const initial: Record<number, string> = {};
      attempt.answers.forEach((ans: Answer) => {
        if (ans.marks !== null && ans.marks !== undefined) {
          initial[ans.questionId] = String(ans.marks);
        } else if (ans.aiSuggestedMarks !== null && ans.aiSuggestedMarks !== undefined) {
          initial[ans.questionId] = String(ans.aiSuggestedMarks);
        }
      });
      setMarks(initial);
    }
  }, [attempt?.answers]);

  const handleRunAiAnalysis = async () => {
    try {
      const updated = await aiGradeMutation.mutateAsync(attemptId);
      if (updated?.answers) {
        const newMarks: Record<number, string> = { ...marks };
        updated.answers.forEach((ans: Answer) => {
          if (ans.aiSuggestedMarks !== null && ans.aiSuggestedMarks !== undefined) {
            if (!newMarks[ans.questionId]) {
              newMarks[ans.questionId] = String(ans.aiSuggestedMarks);
            }
          }
        });
        setMarks(newMarks);
      }
      toast({ title: "AI analysis complete", description: "Suggestions have been filled in below each answer." });
    } catch (err: any) {
      toast({ title: "AI analysis failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveMarks = async () => {
    if (!attempt?.answers) return;
    const subjectiveAnswers = attempt.answers.filter(
      (ans: Answer) => ans.question?.type === 'short' || ans.question?.type === 'long'
    );
    const grades = subjectiveAnswers
      .filter((ans: Answer) => marks[ans.questionId] !== undefined && marks[ans.questionId] !== '')
      .map((ans: Answer) => ({
        questionId: ans.questionId,
        marks: Math.max(0, Math.min(100, parseInt(marks[ans.questionId]) || 0)),
      }));

    if (grades.length === 0) {
      toast({ title: "No marks to save", description: "Please enter marks for at least one subjective question.", variant: "destructive" });
      return;
    }

    try {
      await gradeMutation.mutateAsync({ id: attemptId, data: { grades } });
      await refetch();
      toast({ title: "Marks saved", description: "The student's score has been updated." });
    } catch (err: any) {
      toast({ title: "Failed to save marks", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!attempt || !attempt.exam) {
    return <Layout><div className="text-center py-20">Attempt not found.</div></Layout>;
  }

  const answers = attempt.answers || [];
  const subjectiveAnswers = answers.filter(
    (ans: Answer) => ans.question?.type === 'short' || ans.question?.type === 'long'
  );
  const hasSubjective = subjectiveAnswers.length > 0;
  const allSubjectiveGraded = subjectiveAnswers.every(
    (ans: Answer) => ans.marks !== null && ans.marks !== undefined
  );
  const hasAiSuggestions = subjectiveAnswers.some(
    (ans: Answer) => ans.aiSuggestedMarks !== null && ans.aiSuggestedMarks !== undefined
  );

  const studentName = attempt.exam?.title ? `Student #${attempt.studentId}` : `Student #${attempt.studentId}`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/teacher/exam/${attempt.examId}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Exam Details
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground tracking-tight mb-1">
                Grade Student Attempt
              </h1>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Student #{attempt.studentId}</span>
                {" · "}{attempt.exam.title}
              </p>
              {attempt.endTime && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Submitted {format(new Date(attempt.endTime), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-0.5">Current Score</div>
                <div className={`font-display text-3xl font-bold ${
                  (attempt.score || 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {attempt.score !== null ? `${attempt.score}%` : '—'}
                </div>
                {hasSubjective && !allSubjectiveGraded && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Subjective pending
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasSubjective && (
          <div className="flex flex-col sm:flex-row gap-3 mb-8 p-5 bg-blue-50/60 border border-blue-200/70 rounded-2xl">
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-blue-900 mb-1">
                <Bot className="w-4 h-4" />
                AI Grading Assistant
              </div>
              <p className="text-sm text-blue-700">
                Run AI analysis to get keyword-based mark suggestions for subjective answers. You can accept or adjust each suggestion before saving.
              </p>
            </div>
            <Button
              onClick={handleRunAiAnalysis}
              disabled={aiGradeMutation.isPending}
              data-testid="button-ai-analyze"
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {aiGradeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Run AI Analysis</>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {answers.map((ans: Answer, idx: number) => {
            const q = ans.question;
            if (!q) return null;
            const isMcq = q.type === 'mcq';
            const isCorrect = isMcq && ans.answer === q.correctAnswer;

            return (
              <div
                key={ans.id}
                data-testid={`card-answer-${ans.id}`}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="px-5 py-4 border-b border-border/60 bg-secondary/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-muted-foreground">Q{idx + 1}</span>
                    <Badge variant="outline" className={
                      isMcq
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : q.type === 'short'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                    }>
                      {isMcq ? 'MCQ' : q.type === 'short' ? 'Short Answer' : 'Long Answer'}
                    </Badge>
                  </div>
                  {isMcq && (
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isCorrect
                        ? <><CheckCircle className="w-4 h-4" /> Correct (100/100)</>
                        : <><XCircle className="w-4 h-4" /> Incorrect (0/100)</>
                      }
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Question
                    </p>
                    <p className="text-foreground font-medium">{q.text}</p>
                  </div>

                  {isMcq && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt: string) => (
                        <div
                          key={opt}
                          className={`px-3 py-2 rounded-lg text-sm border ${
                            opt === q.correctAnswer
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                              : opt === ans.answer && !isCorrect
                                ? 'bg-red-50 border-red-300 text-red-800'
                                : 'bg-secondary/40 border-border text-muted-foreground'
                          }`}
                        >
                          {opt === q.correctAnswer && <span className="mr-1">✓</span>}
                          {opt === ans.answer && !isCorrect && <span className="mr-1">✗</span>}
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isMcq && q.correctAnswer && (
                    <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-4">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                        Key Answer / Marking Guideline
                      </p>
                      <p className="text-sm text-emerald-900">{q.correctAnswer}</p>
                    </div>
                  )}

                  <div className="bg-secondary/30 border border-border rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Student's Answer
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {ans.answer || <span className="italic text-muted-foreground">No answer provided</span>}
                    </p>
                  </div>

                  {!isMcq && (
                    <>
                      {ans.aiSuggestedMarks !== null && ans.aiSuggestedMarks !== undefined && (
                        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5" /> AI Suggestion
                            </p>
                            <span className="text-sm font-bold text-blue-800">
                              {ans.aiSuggestedMarks}/100
                            </span>
                          </div>
                          {ans.aiFeedback && (
                            <p className="text-sm text-blue-800">{ans.aiFeedback}</p>
                          )}
                          <button
                            onClick={() => setMarks(prev => ({ ...prev, [ans.questionId]: String(ans.aiSuggestedMarks) }))}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2"
                            data-testid={`button-accept-ai-${ans.questionId}`}
                          >
                            Accept this suggestion
                          </button>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Assign Marks (0–100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={marks[ans.questionId] ?? ''}
                          onChange={e => setMarks(prev => ({ ...prev, [ans.questionId]: e.target.value }))}
                          placeholder="Enter marks..."
                          data-testid={`input-marks-${ans.questionId}`}
                          className="w-32 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                        />
                        {marks[ans.questionId] !== undefined && marks[ans.questionId] !== '' && (
                          <span className="ml-3 text-sm text-muted-foreground">
                            = {marks[ans.questionId]}/100
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {hasSubjective && (
          <div className="sticky bottom-4 bg-card border border-border rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {Object.values(marks).filter(v => v !== '').length} of {subjectiveAnswers.length} subjective question(s) marked
            </div>
            <Button
              onClick={handleSaveMarks}
              disabled={gradeMutation.isPending}
              data-testid="button-save-marks"
              className="bg-primary text-primary-foreground"
            >
              {gradeMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Marks</>
              )}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
