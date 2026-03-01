import { useState } from "react";
import { Layout } from "@/components/layout";
import { useCreateExam, useGenerateExam } from "@/hooks/use-exams";
import { useLocation } from "wouter";
import { Plus, Trash2, ArrowLeft, Save, Sparkles, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CreateExamPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [aiInput, setAiInput] = useState("");
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState([
    { text: "", options: ["", "", "", ""], correctAnswer: "" }
  ]);

  const createMutation = useCreateExam();
  const generateMutation = useGenerateExam();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!aiInput && !aiFile) {
      toast({ variant: "destructive", title: "Please provide text or upload a PDF" });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        text: aiInput,
        file: aiFile || undefined,
        difficulty,
        shortQuestions: shortCount,
        longQuestions: longCount
      });
      setTitle(result.title);
      setQuestions(result.questions);
      toast({ title: "Exam generated successfully!" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Generation failed", description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: "" }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQs = [...questions];
    newQs[index] = { ...newQs[index], [field]: value };
    setQuestions(newQs);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQs = [...questions];
    newQs[qIndex].options[optIndex] = value;
    setQuestions(newQs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title) return toast({ variant: "destructive", title: "Missing title" });
    if (questions.length === 0) return toast({ variant: "destructive", title: "Add at least one question" });
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text) return toast({ variant: "destructive", title: `Question ${i+1} is missing text` });
      if (q.options.some(o => !o)) return toast({ variant: "destructive", title: `Question ${i+1} has empty options` });
      if (!q.correctAnswer) return toast({ variant: "destructive", title: `Question ${i+1} has no correct answer selected` });
    }

    try {
      await createMutation.mutateAsync({
        title,
        description,
        durationMinutes,
        questions
      });
      toast({ title: "Exam created successfully" });
      setLocation("/teacher");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/teacher" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground">Create New Exam</h1>
          <p className="text-muted-foreground mt-1 text-lg">Define the exam details and add questions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* AI Generation Section */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold font-display">Generate with AI</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Paste your study material, lecture notes, or any text below and AI will automatically create the title and questions for you.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Reference Text</label>
                  <textarea 
                    value={aiInput} 
                    onChange={e => setAiInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[120px] resize-y"
                    placeholder="Paste material here..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Upload PDF (Reference Material)</label>
                  <div className="border-2 border-dashed border-input rounded-xl p-8 text-center hover:bg-secondary/20 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={e => setAiFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{aiFile ? aiFile.name : "Click or drag PDF here"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Supported: PDF (Max 50MB)</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-xl">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Difficulty</label>
                  <select 
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">MCQs (Short)</label>
                  <input 
                    type="number"
                    min="0"
                    max="20"
                    value={shortCount}
                    onChange={e => setShortCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Detailed (Long)</label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    value={longCount}
                    onChange={e => setLongCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <Button 
                type="button" 
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full shadow-lg shadow-primary/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Exam Questions
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* General Details */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-xl font-bold font-display mb-6">General Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Exam Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="e.g. Midterm Physics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-h-[100px] resize-y"
                  placeholder="Instructions for students..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Duration (minutes)</label>
                <input 
                  type="number" 
                  min="1"
                  value={durationMinutes} 
                  onChange={e => setDurationMinutes(parseInt(e.target.value) || 30)}
                  className="w-full sm:w-48 px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-display">Questions ({questions.length})</h2>
              <button 
                type="button" 
                onClick={addQuestion}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm relative group">
                {questions.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="absolute top-6 right-6 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center font-bold text-foreground shrink-0 mt-1">
                    {qIndex + 1}
                  </div>
                  <div className="w-full">
                    <label className="block text-sm font-medium text-foreground mb-2">Question Text</label>
                    <textarea 
                      value={q.text} 
                      onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-transparent border border-input text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y min-h-[80px]"
                      placeholder="What is the capital of..."
                    />
                  </div>
                </div>

                <div className="pl-12 space-y-3">
                  <label className="block text-sm font-medium text-foreground mb-3">Options & Correct Answer</label>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${q.correctAnswer === opt && opt !== "" ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent hover:bg-secondary/50'}`}>
                      <input 
                        type="radio" 
                        name={`correct-${qIndex}`} 
                        checked={q.correctAnswer === opt && opt !== ""}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', opt)}
                        disabled={!opt}
                        className="w-4 h-4 text-emerald-600 border-border focus:ring-emerald-600 disabled:opacity-50"
                      />
                      <input 
                        type="text" 
                        value={opt} 
                        onChange={e => {
                          updateOption(qIndex, oIndex, e.target.value);
                          if (q.correctAnswer === opt) {
                            updateQuestion(qIndex, 'correctAnswer', e.target.value);
                          }
                        }}
                        className="flex-1 bg-transparent border-b border-border/50 focus:border-primary px-2 py-1.5 outline-none transition-colors"
                        placeholder={`Option ${oIndex + 1}`}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2">Fill in the options, then select the radio button next to the correct one.</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-border flex justify-end gap-4">
            <Link href="/teacher" className="px-6 py-3 rounded-xl font-medium border border-input text-foreground hover:bg-secondary transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {createMutation.isPending ? "Saving..." : "Save Exam"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
