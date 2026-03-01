import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("student"),
});

export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes").notNull(),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  type: text("type").notNull().default("mcq"), // 'mcq', 'short', 'long'
  partition: integer("partition").notNull().default(1),
  text: text("text").notNull(),
  options: jsonb("options"), // string[] (only for mcq)
  correctAnswer: text("correct_answer"),
});

export const attempts = pgTable("attempts", {
  id: serial("id").primaryKey(),
  examId: integer("exam_id").notNull(),
  studentId: integer("student_id").notNull(),
  currentPartition: integer("current_partition").notNull().default(1),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  score: integer("score"),
  isCompleted: boolean("is_completed").default(false),
  isTimeout: boolean("is_timeout").default(false),
});

export const attemptAnswers = pgTable("attempt_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull(),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true, teacherId: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, examId: true });
export const updateExamSchema = insertExamSchema.partial();
export const insertAttemptSchema = createInsertSchema(attempts).omit({ id: true, startTime: true, endTime: true, score: true, isCompleted: true, isTimeout: true, studentId: true });

export type User = typeof users.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
