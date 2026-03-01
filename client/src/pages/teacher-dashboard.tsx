import { useExams, usePublishExam } from "@/hooks/use-exams";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { format } from "date-fns";
import { Edit2, Trash2, Globe, Eye, Plus, Loader2 } from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const { data: exams, isLoading: loadingExams } = useQuery({
    queryKey: ["/api/exams"],
  });

  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["/api/attempts"],
  });

  const publishMutation = usePublishExam();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.exams.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete exam");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({ title: "Exam deleted successfully" });
    }
  });

  const handlePublish = async (id: number) => {
    try {
      await publishMutation.mutateAsync(id);
      toast({ title: "Exam published successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed to publish", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this exam? All student attempts will also be deleted.")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Failed to delete", description: err.message });
      }
    }
  };

  if (loadingExams || loadingAttempts) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-lg">Manage your assessments and track student performance.</p>
          </div>
          <Link href="/teacher/exam/new">
            <Button size="lg" className="rounded-xl shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5 mr-2" /> Create New Exam
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                <Globe className="w-4 h-4" />
              </span>
              Exam Management
            </h2>
            
            <div className="grid gap-4">
              {exams?.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/10">
                  <p className="text-muted-foreground">No exams created yet. Click "Create New Exam" to start.</p>
                </div>
              ) : (
                exams?.map((exam: any) => (
                  <div key={exam.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-xl text-foreground">{exam.title}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            exam.isPublished 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {exam.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {exam.durationMinutes} minutes • Created {format(new Date(exam.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!exam.isPublished && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 rounded-xl shadow-sm"
                            onClick={() => handlePublish(exam.id)}
                            disabled={publishMutation.isPending}
                          >
                            <Globe className="w-4 h-4 mr-2" /> Publish
                          </Button>
                        )}
                        <Link href={`/teacher/exam/${exam.id}`}>
                          <Button variant="secondary" size="sm" className="h-10 px-4 rounded-xl border border-border">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </Link>
                        <Link href={`/teacher/exam/${exam.id}/edit`}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5"
                            title="Edit Exam"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDelete(exam.id);
                          }}
                          disabled={deleteMutation.isPending}
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                <Eye className="w-4 h-4" />
              </span>
              Recent Activity
            </h2>
            
            <div className="space-y-4">
              {attempts?.length === 0 ? (
                <div className="p-10 text-center border border-border rounded-2xl bg-secondary/5">
                  <p className="text-sm text-muted-foreground">No student activity yet.</p>
                </div>
              ) : (
                attempts?.slice(0, 6).map((attempt: any) => (
                  <div key={attempt.id} className="p-4 border border-border rounded-2xl bg-card shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-foreground line-clamp-1 flex-1 mr-2">
                        {attempt.exam?.title}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        attempt.score !== null ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {attempt.score !== null ? `${Math.round(attempt.score)}%` : "In Progress"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] text-foreground font-bold">
                          {attempt.student?.username.charAt(0).toUpperCase()}
                        </div>
                        {attempt.student?.username}
                      </div>
                      <span>{attempt.endTime ? format(new Date(attempt.endTime), "MMM d") : "Ongoing"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}