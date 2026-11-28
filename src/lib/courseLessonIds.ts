import { connectMongoDB } from "@/lib/mongodb";
import CourseContent from "@/models/CourseContent";

interface CourseLessonIdsProjection {
  courseId: number;
  lessons: Array<{ _id: { toString(): string } }>;
}

export async function getCourseLessonIds(
  courseIds: number[]
): Promise<Map<number, Set<string>>> {
  const uniqueCourseIds = Array.from(new Set(courseIds));

  if (uniqueCourseIds.length === 0) {
    return new Map();
  }

  await connectMongoDB();

  const contents = await CourseContent.find({
    courseId: { $in: uniqueCourseIds },
  })
    .select("courseId lessons._id")
    .lean<CourseLessonIdsProjection[]>();

  return new Map(
    contents.map((content) => [
      Number(content.courseId),
      new Set(content.lessons.map((lesson) => String(lesson._id))),
    ])
  );
}
