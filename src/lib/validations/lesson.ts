import { z } from "zod";

const lessonIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid lesson ID")
  .optional();

const textLessonSchema = z.object({
  _id: lessonIdSchema,
  title: z.string().min(3).max(255),
  type: z.literal("text"),
  body: z.string().min(1),
});

const videoLessonSchema = z.object({
  _id: lessonIdSchema,
  title: z.string().min(3).max(255),
  type: z.literal("video"),
  body: z.string().min(1),
  videoUrl: z.string().url("Invalid video URL"),
});

export const saveLessonsSchema = z.object({
  lessons: z.array(
    z.discriminatedUnion("type", [
      textLessonSchema,
      videoLessonSchema,
    ])
  ),
});
