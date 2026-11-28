import mongoose, { Schema, Model } from "mongoose";

export interface ILesson {
  title: string;
  type: "text" | "video";
  body: string;
  videoUrl?: string;
  seedKey?: string;
}

export interface ICourseContent {
  courseId: number;
  lessons: ILesson[];
}

const LessonSchema = new Schema<ILesson>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["text", "video"],
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    videoUrl: {
      type: String,
      trim: true,
    },

    seedKey: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const CourseContentSchema = new Schema<ICourseContent>(
  {
    courseId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    lessons: {
      type: [LessonSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const CourseContent: Model<ICourseContent> =
  mongoose.models.CourseContent ||
  mongoose.model<ICourseContent>(
    "CourseContent",
    CourseContentSchema
  );

export default CourseContent;
