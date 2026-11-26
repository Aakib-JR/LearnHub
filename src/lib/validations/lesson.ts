import { z } from "zod";

const textLessonSchema = z.object({
  title: z.string().min(3).max(255),
  type: z.literal("text"),
  body: z.string().min(1),
});

const videoLessonSchema = z.object({
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
