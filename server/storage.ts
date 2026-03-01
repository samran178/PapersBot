import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, exams, questions, attempts, attemptAnswers } from "@shared/schema";
import type { User, InsertUser, Exam, Question, Attempt } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createExam(exam: Omit<Exam, "id" | "createdAt">, examQuestions: Omit<Question, "id" | "examId">[]): Promise<Exam>;
  getExams(): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  getExamWithQuestions(id: number): Promise<any>;
  publishExam(id: number): Promise<Exam>;
  
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

  async getExams(): Promise<Exam[]> {
    return await db.select().from(exams);
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

  async startAttempt(examId: number, studentId: number): Promise<Attempt> {
    const [existing] = await db.select()
      .from(attempts)
      .where(eq(attempts.examId, examId))
      .where(eq(attempts.studentId, studentId))
      .where(eq(attempts.isCompleted, false));

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
    const currentPartitionQuestions = examQuestions.filter(q => q.partition === attempt.currentPartition);
    const maxPartition = Math.max(...examQuestions.map(q => q.partition));

    let scoreIncrement = 0;
    
    await db.transaction(async (tx) => {
      for (const ans of answers) {
        const q = currentPartitionQuestions.find(q => q.id === ans.questionId);
        if (q) {
          await tx.insert(attemptAnswers).values({
            attemptId,
            questionId: ans.questionId,
            answer: ans.answer
          });
          if (q.type === 'mcq' && q.correctAnswer === ans.answer) {
            scoreIncrement += 1;
          }
        }
      }
      
      const isFinal = attempt.currentPartition >= maxPartition;
      
      const [updated] = await tx.update(attempts).set({
        endTime: isFinal ? new Date() : null,
        isCompleted: isFinal,
        currentPartition: isFinal ? attempt.currentPartition : attempt.currentPartition + 1,
        score: (attempt.score || 0) + scoreIncrement
      }).where(eq(attempts.id, attemptId)).returning();
      
      return updated;
    });
    
    const [finalAttempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    return finalAttempt;
  }
}

export const storage = new DatabaseStorage();