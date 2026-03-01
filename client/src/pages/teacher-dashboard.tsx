import { useExams, useAttempts } from "@/hooks/use-exams"; // might need to check imports
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { format } from "date-fns";

export default function TeacherDashboard() {
  const { user } = useAuth();
  
  const { data: exams, isLoading: loadingExams } = useQuery({
    queryKey: ["/api/exams"],
  });

  const { data: attempts, isLoading: loadingAttempts } = useQuery({
    queryKey: ["/api/attempts"],
  });

  if (loadingExams || loadingAttempts) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <Link href="/teacher/exam/new">
            <Button>Create New Exam</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {exams?.length === 0 ? (
                <p className="text-muted-foreground">No exams created yet.</p>
              ) : (
                <div className="space-y-4">
                  {exams?.map((exam: any) => (
                    <div key={exam.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{exam.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exam.durationMinutes} mins • {exam.isPublished ? "Published" : "Draft"}
                        </p>
                      </div>
                      <Link href={`/teacher/exam/${exam.id}`}>
                        <Button variant="outline" size="sm">View Details</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Student Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              {attempts?.length === 0 ? (
                <p className="text-muted-foreground">No attempts yet.</p>
              ) : (
                <div className="space-y-4">
                  {attempts?.slice(0, 5).map((attempt: any) => (
                    <div key={attempt.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {attempt.exam?.title}
                        </span>
                        <span className="font-bold">
                          {attempt.score !== null ? `${attempt.score} points` : "In Progress"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex justify-between">
                        <span>Student: {attempt.student?.username}</span>
                        <span>{attempt.endTime ? format(new Date(attempt.endTime), "MMM d, yyyy HH:mm") : "Ongoing"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}