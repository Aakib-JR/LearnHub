"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Courses.module.css";

interface ApiCourse {
  id: number;
  title: string;
}

const courses = [
  {
    title: "Full Stack Web Development",
    category: "Development",
    level: "Beginner",
    duration: "12 Weeks",
    description:
      "Learn HTML, CSS, JavaScript, React, Node.js and build real-world projects.",
    image:
      "https://technosoftacademy.in/wp-content/uploads/2026/08/full-stack-web-development-course.png",
  },
  {
    title: "UI/UX Design Fundamentals",
    category: "Design",
    level: "Beginner",
    duration: "8 Weeks",
    description:
      "Master modern UI/UX design principles and create beautiful user experiences.",
    image:
      "https://coursecentral.in/wp-content/uploads/2025/04/UI_UX-Designing.jpg",
  },
  {
    title: "Python Programming",
    category: "Programming",
    level: "Intermediate",
    duration: "10 Weeks",
    description:
      "Explore Python programming and develop practical coding skills.",
    image:
      "https://i.pinimg.com/736x/6a/fb/f4/6afbf45910b9b4c344737f76043d2cbc.jpg",
  },
];

export default function Courses() {
  const [courseIds, setCourseIds] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchCourseIds() {
      try {
        const response = await fetch("/api/courses");
        const data = await response.json();

        if (response.ok && data.success) {
          const ids: Record<string, number> = {};

          (data.courses as ApiCourse[]).forEach((course) => {
            ids[course.title] = course.id;
          });

          setCourseIds(ids);
        }
      } catch (error) {
        console.error("Failed to load course IDs:", error);
      }
    }

    fetchCourseIds();
  }, []);

  return (
    <section className={styles.coursesSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.tag}>START LEARNING TODAY</span>
            <h2>Explore Popular Courses</h2>
            <p>
              Discover courses designed to help you learn new skills
              and achieve your goals.
            </p>
          </div>

          <Link href="/courses" className={styles.viewAll}>
            View All Courses →
          </Link>
        </div>

        <div className={styles.courseGrid}>
          {courses.map((course) => {
            const courseId = courseIds[course.title];

            return (
              <article className={styles.courseCard} key={course.title}>
                <div className={styles.courseImage}>
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    sizes="(max-width: 650px) 100vw, (max-width: 992px) 50vw, 33vw"
                  />
                  <span className={styles.category}>
                    {course.category}
                  </span>
                </div>

                <div className={styles.courseContent}>
                  <div className={styles.courseInfo}>
                    <span>{course.level}</span>
                    <span>{course.duration}</span>
                  </div>

                  <h3>{course.title}</h3>

                  <p>{course.description}</p>

                  <Link
                    href={courseId ? `/courses/${courseId}` : "/courses"}
                    className={styles.courseButton}
                  >
                    View Course →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
