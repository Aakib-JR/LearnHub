"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Dashboard.module.css";

interface DashboardUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "instructor" | "user";
  created_at: string;
}

interface DashboardStats {
  totalUsers?: number;
  totalCourses?: number;
  totalEnrollments?: number;
  totalStudents?: number;
  totalEnrolledCourses?: number;
  totalCompletedLessons?: number;
  totalLessons?: number;
  overallProgress?: number;
}

interface DashboardCourse {
  id: number;
  title: string;
  description: string;
  total_seats?: number;
  available_seats?: number;
  total_students?: number;
  completed_lessons?: number;
  total_lessons?: number;
  progress?: number;
}

interface DashboardData {
  success: boolean;
  role: "admin" | "instructor" | "user";
  user: DashboardUser;
  stats: DashboardStats;
  courses?: DashboardCourse[];
  recentUsers?: DashboardUser[];
}

function StatCard({
  icon,
  value,
  label,
  iconClass,
}: {
  icon: string;
  value: number;
  label: string;
  iconClass: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${iconClass}`}>
        {icon}
      </div>
      <h2 className={styles.statValue}>{value}</h2>
      <p className={styles.statLabel}>{label}</p>
    </div>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load dashboard.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className={styles.dashboard}>
        <div className={styles.loading}>
          Loading your dashboard...
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className={styles.dashboard}>
        <div className={styles.dashboardContainer}>
          <div className={styles.error}>
            {error || "Dashboard data not available."}
          </div>
        </div>
      </main>
    );
  }

  const { user, role, stats } = data;

  const roleLabel =
    role === "admin"
      ? "Administrator"
      : role === "instructor"
        ? "Instructor"
        : "Student";

  const roleBadge =
    role === "admin"
      ? styles.adminBadge
      : role === "instructor"
        ? styles.instructorBadge
        : styles.studentBadge;

  return (
    <main className={styles.dashboard}>
      <div className={styles.dashboardContainer}>
        {/* HEADER */}
        <div className={styles.header}>
          <div>
            <p className={styles.welcomeText}>
              LEARNHUB / DASHBOARD
            </p>

            <h1 className={styles.heading}>
              Welcome back, {user.name}!
            </h1>

            <p className={styles.subtitle}>
              Here&apos;s what&apos;s happening with your learning platform.
            </p>

            <span className={`${styles.roleBadge} ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>

          <Link href="/courses" className={styles.primaryButton}>
            Explore Courses →
          </Link>
        </div>

        {/* ADMIN DASHBOARD */}
        {role === "admin" && (
          <>
            <div className={styles.statsGrid}>
              <StatCard
                icon="👥"
                value={stats.totalUsers ?? 0}
                label="Total Users"
                iconClass={styles.blueIcon}
              />

              <StatCard
                icon="📚"
                value={stats.totalCourses ?? 0}
                label="Total Courses"
                iconClass={styles.purpleIcon}
              />

              <StatCard
                icon="🎓"
                value={stats.totalEnrollments ?? 0}
                label="Total Enrollments"
                iconClass={styles.greenIcon}
              />

              <StatCard
                icon="🛡️"
                value={data.recentUsers?.length ?? 0}
                label="Recent Users"
                iconClass={styles.orangeIcon}
              />
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>
                    Recent Users
                  </h2>
                  <p className={styles.sectionDescription}>
                    Latest members registered on LearnHub
                  </p>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentUsers?.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>
                          <span className={styles.roleTag}>
                            {member.role === "admin"
                              ? "Admin"
                              : member.role === "instructor"
                                ? "Instructor"
                                : "Student"}
                          </span>
                        </td>
                        <td>
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* INSTRUCTOR DASHBOARD */}
        {role === "instructor" && (
          <>
            <div className={styles.statsGrid}>
              <StatCard
                icon="📚"
                value={stats.totalCourses ?? 0}
                label="My Courses"
                iconClass={styles.blueIcon}
              />

              <StatCard
                icon="👨‍🎓"
                value={stats.totalStudents ?? 0}
                label="Total Students"
                iconClass={styles.greenIcon}
              />
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>
                    My Courses
                  </h2>
                  <p className={styles.sectionDescription}>
                    Manage your courses and monitor student enrollment.
                  </p>
                </div>

                <Link
                  href="/courses/new"
                  className={styles.primaryButton}
                >
                  + Create Course
                </Link>
              </div>

              {data.courses && data.courses.length > 0 ? (
                <div className={styles.courseGrid}>
                  {data.courses.map((course) => (
                    <article
                      key={course.id}
                      className={styles.courseCard}
                    >
                      <h3 className={styles.courseTitle}>
                        {course.title}
                      </h3>

                      <p className={styles.courseDescription}>
                        {course.description}
                      </p>

                      <div className={styles.courseMeta}>
                        <span>
                          👨‍🎓 {course.total_students ?? 0} Students
                        </span>

                        <span>
                          {course.available_seats} / {course.total_seats} Seats
                        </span>
                      </div>

                      <div style={{ marginTop: 17 }}>
                        <Link
                          href={`/courses/${course.id}`}
                          className={styles.secondaryButton}
                        >
                          View Course →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📚</div>
                  <h3 className={styles.emptyTitle}>
                    No courses yet
                  </h3>
                  <p className={styles.emptyText}>
                    Create your first course and start teaching.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        {/* STUDENT DASHBOARD */}
        {role === "user" && (
          <>
            <div className={styles.statsGrid}>
              <StatCard
                icon="📚"
                value={stats.totalEnrolledCourses ?? 0}
                label="Enrolled Courses"
                iconClass={styles.blueIcon}
              />

              <StatCard
                icon="✅"
                value={stats.totalCompletedLessons ?? 0}
                label="Completed Lessons"
                iconClass={styles.greenIcon}
              />

              <StatCard
                icon="📝"
                value={stats.totalLessons ?? 0}
                label="Total Lessons"
                iconClass={styles.purpleIcon}
              />

              <StatCard
                icon="📈"
                value={stats.overallProgress ?? 0}
                label="Learning Progress (%)"
                iconClass={styles.orangeIcon}
              />
            </div>

            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>
                    My Learning
                  </h2>
                  <p className={styles.sectionDescription}>
                    Continue learning from where you stopped.
                  </p>
                </div>
              </div>

              {data.courses && data.courses.length > 0 ? (
                <div className={styles.courseGrid}>
                  {data.courses.map((course) => (
                    <article
                      key={course.id}
                      className={styles.courseCard}
                    >
                      <h3 className={styles.courseTitle}>
                        {course.title}
                      </h3>

                      <p className={styles.courseDescription}>
                        {course.description}
                      </p>

                      <div className={styles.progressText}>
                        <span>Course Progress</span>
                        <strong>{course.progress ?? 0}%</strong>
                      </div>

                      <div
                        className={styles.progressTrack}
                        role="progressbar"
                        aria-valuenow={course.progress ?? 0}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${course.title} progress`}
                      >
                        <div
                          className={styles.progressBar}
                          style={{
                            width: `${course.progress ?? 0}%`,
                          }}
                        />
                      </div>

                      <div className={styles.courseMeta}>
                        <span>
                          {course.completed_lessons ?? 0} /{" "}
                          {course.total_lessons ?? 0} Lessons completed
                        </span>
                      </div>

                      <div style={{ marginTop: 17 }}>
                        <Link
                          href={`/courses/${course.id}`}
                          className={styles.primaryButton}
                        >
                          Continue Learning →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎓</div>
                  <h3 className={styles.emptyTitle}>
                    Start your learning journey
                  </h3>
                  <p className={styles.emptyText}>
                    You haven&apos;t enrolled in any courses yet.
                    Explore our courses and start learning today.
                  </p>

                  <Link
                    href="/courses"
                    className={styles.primaryButton}
                  >
                    Browse Courses →
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        {/* PROFILE */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>My Profile</h2>
              <p className={styles.sectionDescription}>
                Your LearnHub account information.
              </p>
            </div>
          </div>

          <p>
            <strong>Name:</strong> {user.name}
          </p>

          <p>
            <strong>Email:</strong> {user.email}
          </p>

          <p className="mb-0">
            <strong>Account Type:</strong> {roleLabel}
          </p>
        </section>
      </div>
    </main>
  );
}
