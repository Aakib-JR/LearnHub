import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.brandSection}>
            <Link href="/" className={styles.logo}>
              Learn<span>Hub.</span>
            </Link>

            <p>
              Empowering learners with the knowledge and skills
              they need to build a better future.
            </p>

            <div className={styles.socialLinks}>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            </div>
          </div>

          <div className={styles.linkSection}>
            <h3>Quick Links</h3>
            <Link href="/">Home</Link>
            <Link href="/courses">Courses</Link>
            <Link href="/about">About Us</Link>
          </div>

          <div className={styles.linkSection}>
            <h3>Account</h3>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>

          <div className={styles.linkSection}>
            <h3>Contact</h3>
            <a href="mailto:support@learnhub.com">learnhub@gmail.com</a>
            <p>LearnHub Online Learning Platform</p>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p>© 2026 LearnHub. All rights reserved.</p>
          <p>Learn Today. Lead Tomorrow.</p>
        </div>
      </div>
    </footer>
  );
}
