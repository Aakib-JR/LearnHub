import { z } from "zod";

const mongoLessonIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid lesson ID");

const lessonIdSchema = mongoLessonIdSchema.optional();
const seedKeySchema = z.string().trim().min(1).max(100).optional();

const textLessonSchema = z.object({
  _id: lessonIdSchema,
  seedKey: seedKeySchema,
  title: z.string().trim().min(3).max(255),
  type: z.literal("text"),
  body: z.string().trim().min(1),
});

const videoLessonSchema = z.object({
  _id: lessonIdSchema,
  seedKey: seedKeySchema,
  title: z.string().trim().min(3).max(255),
  type: z.literal("video"),
  body: z.string().trim().min(1),
  videoUrl: z.string().trim().url("Invalid video URL"),
});

export const saveLessonsSchema = z.object({
  lessons: z.array(
    z.discriminatedUnion("type", [
      textLessonSchema,
      videoLessonSchema,
    ])
  ),
});

export const completeLessonSchema = z.object({
  lessonId: mongoLessonIdSchema,
});
