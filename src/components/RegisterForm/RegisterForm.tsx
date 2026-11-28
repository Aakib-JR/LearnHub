"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./RegisterForm.module.css";

type UserRole = "user" | "instructor";

export default function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Registration failed");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Create Account</h1>

        <p className={styles.subtitle}>
          Join LearnHub and start learning
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
          </div>

          <div className={styles.formGroup}>
            <label>I want to join as</label>

            <div className={styles.roleOptions}>
              <label
                className={`${styles.roleOption} ${
                  role === "user" ? styles.selectedRole : ""
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="user"
                  checked={role === "user"}
                  onChange={() => setRole("user")}
                />

                <span className={styles.roleTitle}>Student</span>
                <span className={styles.roleDescription}>
                  Learn courses and track progress
                </span>
              </label>

              <label
                className={`${styles.roleOption} ${
                  role === "instructor" ? styles.selectedRole : ""
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="instructor"
                  checked={role === "instructor"}
                  onChange={() => setRole("instructor")}
                />

                <span className={styles.roleTitle}>Instructor</span>
                <span className={styles.roleDescription}>
                  Create and manage your courses
                </span>
              </label>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{" "}
          <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
