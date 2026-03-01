import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import { generateExamQuestions } from "./openai";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });
const MemoryStore = createMemoryStore(session);

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 
    }),
    resave: false,
    saveUninitialized: false,
    secret: 'exam-system-secret'
  }));

  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const data = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByUsername(data.username);
      if (existing) {
        return res.status(400).json({ message: "Username exists" });
      }
      const user = await storage.createUser(data);
      req.session.userId = user.id;
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const data = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(data.username);
      if (!user || user.password !== data.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.userId = user.id;
      res.status(200).json({ id: user.id, username: user.username, role: user.role });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.status(200).json({ id: user.id, username: user.username, role: user.role });
  });

  // Exams
  app.get(api.exams.list.path, requireAuth, async (req, res) => {
    const exams = await storage.getExams();
    res.json(exams);
  });

  app.post(api.exams.create.path, requireAuth, async (req, res) => {
    try {
      const data = api.exams.create.input.parse(req.body);
      const examData = {
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        isPublished: data.isPublished || false,
        teacherId: req.session.userId!
      };
      const exam = await storage.createExam(examData, data.questions);
      res.status(201).json(exam);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.exams.get.path, requireAuth, async (req, res) => {
    const exam = await storage.getExamWithQuestions(parseInt(req.params.id));
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    
    // If student, remove correct answers to prevent cheating
    const user = await storage.getUser(req.session.userId!);
    if (user?.role === 'student') {
      exam.questions = exam.questions.map((q: any) => ({
        id: q.id,
        examId: q.examId,
        text: q.text,
        options: q.options
      }));
    }
    
    res.json(exam);
  });

  app.post(api.exams.publish.path, requireAuth, async (req, res) => {
    try {
      const exam = await storage.publishExam(parseInt(req.params.id));
      res.json(exam);
    } catch (e) {
      res.status(404).json({ message: "Exam not found" });
    }
  });

  app.post(api.exams.generate.path, requireAuth, upload.single('file'), async (req, res) => {
    try {
      let text = req.body.text || "";
      
      if (req.file) {
        const data = await pdf(req.file.buffer);
        text = data.text;
      }

      const input = api.exams.generate.input.parse({
        text: text,
        difficulty: req.body.difficulty,
        shortQuestions: parseInt(req.body.shortQuestions) || 5,
        longQuestions: parseInt(req.body.longQuestions) || 0,
      });

      const generated = await generateExamQuestions(text, {
        difficulty: input.difficulty,
        shortQuestions: input.shortQuestions,
        longQuestions: input.longQuestions
      });
      
      res.json(generated);
    } catch (e: any) {
      console.error("Generation error:", e);
      res.status(400).json({ message: e.message });
    }
  });

  // Attempts
  app.get(api.attempts.list.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (user?.role === 'teacher') {
      const attempts = await storage.getAttemptsForTeacher(user.id);
      res.json(attempts);
    } else {
      const attempts = await storage.getAttemptsForStudent(user!.id);
      res.json(attempts);
    }
  });

  app.post(api.attempts.start.path, requireAuth, async (req, res) => {
    try {
      const data = api.attempts.start.input.parse(req.body);
      const attempt = await storage.startAttempt(data.examId, req.session.userId!);
      res.status(201).json(attempt);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post(api.attempts.submit.path, requireAuth, async (req, res) => {
    try {
      const data = api.attempts.submit.input.parse(req.body);
      const attempt = await storage.submitAttempt(parseInt(req.params.id), data.answers);
      res.json(attempt);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get(api.attempts.get.path, requireAuth, async (req, res) => {
    const attempt = await storage.getAttempt(parseInt(req.params.id));
    if (!attempt) return res.status(404).json({ message: "Not found" });
    res.json(attempt);
  });

  return httpServer;
}