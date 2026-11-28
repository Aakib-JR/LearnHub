import Link from "next/link";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import styles from "./page.module.css";

const offers = [
  {
    title: "Course creation",
    description:
      "Instructors can create courses and share them with students.",
  },
  {
    title: "Structured lessons",
    description:
      "Work through course material one lesson at a time.",
  },
  {
    title: "Student enrollment",
    description:
      "Enroll in a course to access its lessons and learning materials.",
  },
  {
    title: "Learning progress",
    description:
      "Mark lessons as complete and keep track of your progress.",
  },
];

const reasons = [
  {
    title: "A simple learning experience",
    description:
      "Keep course discovery, lessons, and learning progress together in one place.",
  },
  {
    title: "Organized courses",
    description:
      "Follow course material through structured lessons instead of one long list of content.",
  },
  {
    title: "Progress you can follow",
    description:
      "Mark lessons complete and review your progress from your student dashboard.",
  },
];

const steps = [
  {
    title: "Create an account",
    description:
      "Register as a student to access course enrollment and progress tracking.",
  },
  {
    title: "Explore courses",
    description:
      "Browse the available courses and choose a topic to get started.",
  },
  {
    title: "Enroll in a course",
    description:
      "Join a course to access and read its structured lessons.",
  },
  {
    title: "Learn and track progress",
    description:
      "Mark lessons complete and see your learning progress in your dashboard.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>LEARNHUB / ABOUT</p>
              <h1>About LearnHub</h1>
              <p className={styles.heroDescription}>
                LearnHub brings courses, lessons, enrollment, and progress
                tracking together in one place, so you can focus on your next
                step in learning.
              </p>
              <div className={styles.heroActions}>
                <Link href="/courses" className={styles.primaryButton}>
                  Explore Courses
                </Link>
                <Link href="/register" className={styles.secondaryButton}>
                  Create an Account
                </Link>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.visualGlow} />
              <div className={styles.visualCard}>
                <div className={styles.visualHeader}>
                  <span className={styles.visualLogo}>LearnHub.</span>
                  <span className={styles.visualLabel}>YOUR LEARNING SPACE</span>
                </div>
                <div className={styles.visualDivider} />
                <div className={styles.visualRow}>
                  <span className={styles.visualIcon}>C</span>
                  <span>Explore courses</span>
                  <span className={styles.visualArrow}>↗</span>
                </div>
                <div className={styles.visualRow}>
                  <span className={styles.visualIcon}>L</span>
                  <span>Learn through lessons</span>
                  <span className={styles.visualArrow}>↗</span>
                </div>
                <div className={styles.visualRow}>
                  <span className={styles.visualIcon}>P</span>
                  <span>Track your progress</span>
                  <span className={styles.visualArrow}>↗</span>
                </div>
                <div className={styles.visualAccent} />
              </div>
              <span className={styles.visualOrb} />
            </div>
          </div>
        </section>

        <section className={styles.missionSection}>
          <div className={`${styles.container} ${styles.missionGrid}`}>
            <div>
              <p className={styles.eyebrow}>OUR MISSION</p>
              <h2 className={styles.sectionTitle}>
                Make online learning accessible and effective.
              </h2>
            </div>
            <div className={styles.missionCopy}>
              <p>
                LearnHub aims to make it easier for people to find courses,
                learn from organized lessons, and keep track of their progress.
                The goal is a clear learning experience that helps learners
                make effective use of their time.
              </p>
              <p>
                Instructors can create courses and publish lessons, while
                students can explore courses, enroll, and continue learning at
                their own pace.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.offersSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>WHAT WE OFFER</p>
              <h2 className={styles.sectionTitle}>
                The essentials for a focused learning journey.
              </h2>
              <p className={styles.sectionDescription}>
                LearnHub connects course discovery with the tools to study and
                follow your progress.
              </p>
            </div>

            <div className={styles.offerGrid}>
              {offers.map((offer) => (
                <article className={styles.offerCard} key={offer.title}>
                  <span className={styles.offerAccent} aria-hidden="true" />
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.howSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>HOW IT WORKS</p>
              <h2 className={styles.sectionTitle}>
                A clear path from discovery to progress.
              </h2>
            </div>

            <ol className={styles.stepsGrid}>
              {steps.map((step, index) => (
                <li className={styles.stepCard} key={step.title}>
                  <span className={styles.stepNumber}>
                    STEP {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.whySection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>WHY CHOOSE LEARNHUB</p>
              <h2 className={styles.sectionTitle}>
                Learning that feels clear and organized.
              </h2>
              <p className={styles.sectionDescription}>
                LearnHub focuses on the practical tools learners and
                instructors need to make steady progress through a course.
              </p>
            </div>

            <div className={styles.whyGrid}>
              {reasons.map((reason) => (
                <article className={styles.whyCard} key={reason.title}>
                  <span className={styles.whyNumber} aria-hidden="true">
                    ✓
                  </span>
                  <h3>{reason.title}</h3>
                  <p>{reason.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={`${styles.container} ${styles.ctaPanel}`}>
            <p className={styles.eyebrow}>YOUR NEXT STEP</p>
            <h2>Ready to start learning?</h2>
            <p>
              Explore the courses available on LearnHub and choose where you
              would like to begin.
            </p>
            <Link href="/courses" className={styles.ctaButton}>
              Browse Courses
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
