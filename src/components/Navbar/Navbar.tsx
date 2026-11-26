"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          Learn<span>Hub.</span>
        </Link>

        <button
          className={styles.menuButton}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div
          className={`${styles.navLinks} ${
            menuOpen ? styles.showMenu : ""
          }`}
        >
          <Link
            href="/"
            className={styles.navLink}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>

          <Link
            href="/courses"
            className={styles.navLink}
            onClick={() => setMenuOpen(false)}
          >
            Courses
          </Link>

          <Link
            href="/about"
            className={styles.navLink}
            onClick={() => setMenuOpen(false)}
          >
            About
          </Link>

          <div className={styles.authLinks}>
            <Link
              href="/login"
              className={styles.loginButton}
              onClick={() => setMenuOpen(false)}
            >
              Login
            </Link>

            <Link
              href="/register"
              className={styles.registerButton}
              onClick={() => setMenuOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
