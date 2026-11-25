import Link from "next/link";
import styles from "./Courses.module.css";

const courses = [
  {
    id: 1,
    title: "Full Stack Web Development",
    category: "Development",
    level: "Beginner",
    duration: "12 Weeks",
    description:
      "Learn HTML, CSS, JavaScript, React, Node.js and build real-world projects.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600",
  },
  {
    id: 2,
    title: "UI/UX Design Fundamentals",
    category: "Design",
    level: "Beginner",
    duration: "8 Weeks",
    description:
      "Master modern UI/UX design principles and create beautiful user experiences.",
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600",
  },
  {
    id: 3,
    title: "Python Programming",
    category: "Programming",
    level: "Intermediate",
    duration: "10 Weeks",
    description:
      "Explore Python programming and develop practical coding skills.",
    image:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600",
  },
];

export default function Courses() {
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
          {courses.map((course) => (
            <article className={styles.courseCard} key={course.id}>
              <div className={styles.courseImage}>
                <img src={course.image} alt={course.title} />
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

                <Link href="/courses" className={styles.courseButton}>
                  View Course →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
