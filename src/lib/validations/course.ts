import { z } from "zod";

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title cannot exceed 255 characters"),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters"),

  totalSeats: z
    .number()
    .int("Seats must be a whole number")
    .min(1, "At least 1 seat is required"),
});

export const updateCourseSchema = createCourseSchema.partial();
