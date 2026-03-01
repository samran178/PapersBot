import { z } from 'zod';
import { insertUserSchema, insertExamSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string()
});

const questionSchema = z.object({
  id: z.number(),
  examId: z.number(),
  text: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string().optional() // Hidden from students unless completed
});

const examSchema = z.object({
  id: z.number(),
  teacherId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  durationMinutes: z.number(),
  isPublished: z.boolean().nullable(),
  createdAt: z.string().nullable(),
  questions: z.array(questionSchema).optional()
});

const attemptSchema = z.object({
  id: z.number(),
  examId: z.number(),
  studentId: z.number(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  score: z.number().nullable(),
  isCompleted: z.boolean().nullable(),
  isTimeout: z.boolean().nullable(),
  exam: examSchema.optional(),
  student: userSchema.optional()
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      }
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: z.object({ username: z.string(), password: z.string(), role: z.enum(['student', 'teacher']) }),
      responses: {
        201: userSchema,
        400: errorSchemas.validation,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: userSchema,
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    }
  },
  exams: {
    list: {
      method: 'GET' as const,
      path: '/api/exams' as const,
      responses: {
        200: z.array(examSchema),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/exams/:id' as const,
      responses: {
        200: examSchema,
        404: errorSchemas.notFound,
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/exams' as const,
      input: insertExamSchema.extend({
        questions: z.array(z.object({
          text: z.string(),
          options: z.array(z.string()),
          correctAnswer: z.string()
        }))
      }),
      responses: {
        201: examSchema,
        400: errorSchemas.validation,
      }
    },
    publish: {
      method: 'POST' as const,
      path: '/api/exams/:id/publish' as const,
      responses: {
        200: examSchema,
        404: errorSchemas.notFound,
      }
    },
    generate: {
      method: 'POST' as const,
      path: '/api/exams/generate' as const,
      input: z.object({ 
        text: z.string().optional(),
        difficulty: z.enum(['easy', 'medium', 'hard', 'complex']).default('medium'),
        shortQuestions: z.number().default(5),
        longQuestions: z.number().default(0),
      }),
      responses: {
        200: z.object({
          title: z.string(),
          questions: z.array(z.object({
            text: z.string(),
            options: z.array(z.string()),
            correctAnswer: z.string()
          }))
        }),
        400: errorSchemas.validation,
      }
    }
  },
  attempts: {
    list: {
      method: 'GET' as const,
      path: '/api/attempts' as const,
      responses: {
        200: z.array(attemptSchema),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/attempts/:id' as const,
      responses: {
        200: attemptSchema,
        404: errorSchemas.notFound,
      }
    },
    start: {
      method: 'POST' as const,
      path: '/api/attempts/start' as const,
      input: z.object({ examId: z.number() }),
      responses: {
        201: attemptSchema,
        400: errorSchemas.validation,
      }
    },
    submit: {
      method: 'POST' as const,
      path: '/api/attempts/:id/submit' as const,
      input: z.object({
        answers: z.array(z.object({
          questionId: z.number(),
          answer: z.string()
        }))
      }),
      responses: {
        200: attemptSchema,
        400: errorSchemas.validation,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}