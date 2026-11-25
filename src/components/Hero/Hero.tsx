import Link from "next/link";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.content}>
          <span className={styles.tag}>
            LEARN WITHOUT LIMITS
          </span>

          <h1>
            Unlock Your
            <br />
            Potential with
            <br />
            <span>LearnHub.</span>
          </h1>

          <p>
            Discover new skills, learn from expert instructors,
            and take the next step in your learning journey.
          </p>

          <div className={styles.actions}>
            <Link href="/courses" className={styles.primaryButton}>
              Explore Courses →
            </Link>

            <Link href="/register" className={styles.secondaryButton}>
              Get Started
            </Link>
          </div>

          <div className={styles.stats}>
            <div>
              <h3>500+</h3>
              <span>Learning Resources</span>
            </div>

            <div>
              <h3>50+</h3>
              <span>Expert Instructors</span>
            </div>

            <div>
              <h3>1K+</h3>
              <span>Happy Learners</span>
            </div>
          </div>
        </div>

        <div className={styles.visual}>
          <div className={styles.imageCard}>
            <div className={styles.imageContent}>
              <span>YOUR FUTURE STARTS HERE</span>
              <h2>Learn Today.</h2>
              <h2>Lead Tomorrow.</h2>
            </div>
          </div>

          {/* <div className={styles.floatingCard}>
            <span>✦</span>
            <div>
              <strong>Keep Learning</strong>
              <p>Build your future skills</p>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}
