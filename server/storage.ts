import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users, exams, questions, attempts, attemptAnswers } from "@shared/schema";
import type { User, InsertUser, Exam, Question, Attempt } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createExam(exam: Omit<Exam, "id" | "createdAt">, examQuestions: Omit<Question, "id" | "examId">[]): Promise<Exam>;
  getExams(): Promise<any[]>;
  getExam(id: number): Promise<Exam | undefined>;
  getExamWithQuestions(id: number): Promise<any>;
  publishExam(id: number): Promise<Exam>;
  updateExam(id: number, exam: any, questions: any[]): Promise<Exam>;
  deleteExam(id: number): Promise<void>;
  
  startAttempt(examId: number, studentId: number): Promise<Attempt>;
  getAttempt(id: number): Promise<any>;
  getAttemptsForStudent(studentId: number): Promise<any[]>;
  getAttemptsForTeacher(teacherId: number): Promise<any[]>;
  submitAttempt(attemptId: number, answers: { questionId: number, answer: string }[]): Promise<Attempt>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createExam(examData: any, examQuestions: any[]): Promise<Exam> {
    return await db.transaction(async (tx) => {
      const [exam] = await tx.insert(exams).values(examData).returning();
      if (examQuestions.length > 0) {
        await tx.insert(questions).values(
          examQuestions.map(q => ({ ...q, examId: exam.id }))
        );
      }
      return exam;
    });
  }

  async getExams(): Promise<any[]> {
    const allExams = await db.select().from(exams);
    return Promise.all(allExams.map(async (exam) => {
      const examQuestions = await db.select().from(questions).where(eq(questions.examId, exam.id));
      return { ...exam, questions: examQuestions };
    }));
  }

  async getExam(id: number): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async getExamWithQuestions(id: number): Promise<any> {
    const exam = await this.getExam(id);
    if (!exam) return undefined;
    const examQuestions = await db.select().from(questions).where(eq(questions.examId, id));
    return { ...exam, questions: examQuestions };
  }

  async publishExam(id: number): Promise<Exam> {
    const [exam] = await db.update(exams).set({ isPublished: true }).where(eq(exams.id, id)).returning();
    return exam;
  }

  async updateExam(id: number, examData: any, examQuestions: any[]): Promise<Exam> {
    return await db.transaction(async (tx) => {
      const [exam] = await tx.update(exams).set(examData).where(eq(exams.id, id)).returning();
      if (examQuestions) {
        // Simple strategy: delete and recreate questions for the exam
        await tx.delete(questions).where(eq(questions.examId, id));
        if (examQuestions.length > 0) {
          await tx.insert(questions).values(
            examQuestions.map(q => ({ ...q, examId: id, id: undefined }))
          );
        }
      }
      return exam;
    });
  }

  async deleteExam(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, db.select({ id: attempts.id }).from(attempts).where(eq(attempts.examId, id))));
      await tx.delete(attempts).where(eq(attempts.examId, id));
      await tx.delete(questions).where(eq(questions.examId, id));
      await tx.delete(exams).where(eq(exams.id, id));
    });
  }

  async startAttempt(examId: number, studentId: number): Promise<Attempt> {
    const [existing] = await db.select()
      .from(attempts)
      .where(and(
        eq(attempts.examId, examId),
        eq(attempts.studentId, studentId),
        eq(attempts.isCompleted, false)
      ));

    if (existing) {
      return existing;
    }

    const [attempt] = await db.insert(attempts).values({
      examId,
      studentId,
    }).returning();
    return attempt;
  }

  async getAttempt(id: number): Promise<any> {
    const [attempt] = await db.select().from(attempts).where(eq(attempts.id, id));
    if (!attempt) return undefined;
    
    const exam = await this.getExam(attempt.examId);
    return { ...attempt, exam };
  }

  async getAttemptsForStudent(studentId: number): Promise<any[]> {
    const studentAttempts = await db.select().from(attempts).where(eq(attempts.studentId, studentId));
    return Promise.all(studentAttempts.map(async (a) => {
      const exam = await this.getExam(a.examId);
      return { ...a, exam };
    }));
  }

  async getAttemptsForTeacher(teacherId: number): Promise<any[]> {
    const teacherExams = await db.select().from(exams).where(eq(exams.teacherId, teacherId));
    const examIds = teacherExams.map(e => e.id);
    if (examIds.length === 0) return [];
    
    const allAttempts = await db.select().from(attempts);
    const relevantAttempts = allAttempts.filter(a => examIds.includes(a.examId));
    
    return Promise.all(relevantAttempts.map(async (a) => {
      const exam = teacherExams.find(e => e.id === a.examId);
      const student = await this.getUser(a.studentId);
      return { ...a, exam, student: student ? { id: student.id, username: student.username } : undefined };
    }));
  }

  async submitAttempt(attemptId: number, answers: { questionId: number, answer: string }[]): Promise<Attempt> {
    const attempt = await this.getAttempt(attemptId);
    if (!attempt) throw new Error("Attempt not found");
    
    const examQuestions = await db.select().from(questions).where(eq(questions.examId, attempt.examId));
    const mcqQuestions = examQuestions.filter(q => q.type === 'mcq');

    let correctCount = 0;

    await db.transaction(async (tx) => {
      for (const ans of answers) {
        const q = examQuestions.find(q => q.id === ans.questionId);
        if (q) {
          await tx.insert(attemptAnswers).values({
            attemptId,
            questionId: ans.questionId,
            answer: ans.answer
          });
          if (q.type === 'mcq' && q.correctAnswer === ans.answer) {
            correctCount += 1;
          }
        }
      }

      const score = mcqQuestions.length > 0
        ? Math.round((correctCount / mcqQuestions.length) * 100)
        : 0;

      await tx.update(attempts).set({
        endTime: new Date(),
        isCompleted: true,
        score
      }).where(eq(attempts.id, attemptId));
    });
    
    const [finalAttempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    return finalAttempt;
  }
}

export const storage = new DatabaseStorage();