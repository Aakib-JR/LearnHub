"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

type UserRole = "admin" | "instructor" | "user";

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export default function Navbar() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    getUser();
  }, []);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        setUser(null);
        setProfileOpen(false);
        setMenuOpen(false);
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function closeMenus() {
    setMenuOpen(false);
    setProfileOpen(false);
  }

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case "admin":
        return "Admin";
      case "instructor":
        return "Instructor";
      default:
        return "Student";
    }
  }

  function getRoleBadgeClass(role: UserRole) {
    switch (role) {
      case "admin":
        return styles.adminBadge;
      case "instructor":
        return styles.instructorBadge;
      default:
        return styles.userBadge;
    }
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={closeMenus}>
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
          <Link href="/" className={styles.navLink} onClick={closeMenus}>
            Home
          </Link>

          <Link
            href="/courses"
            className={styles.navLink}
            onClick={closeMenus}
          >
            Courses
          </Link>

          <Link
            href="/about"
            className={styles.navLink}
            onClick={closeMenus}
          >
            About
          </Link>

          <div className={styles.authLinks}>
            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className={styles.loginButton}
                  onClick={closeMenus}
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className={styles.registerButton}
                  onClick={closeMenus}
                >
                  Get Started
                </Link>
              </>
            )}

            {!loading && user && (
              <div className={styles.profileWrapper}>
                <button
                  type="button"
                  className={styles.profileButton}
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                >
                  <span className={styles.avatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </span>

                  <span className={styles.profileName}>
                    {getRoleLabel(user.role)}
                  </span>

                  <span className={styles.dropdownArrow}>
                    {profileOpen ? "▲" : "▼"}
                  </span>
                </button>

                {profileOpen && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileInfo}>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>

                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role === "admin"
                          ? "Administrator"
                          : user.role === "instructor"
                            ? "Instructor"
                            : "Student"}
                      </span>
                    </div>

                    <div className={styles.dropdownDivider}></div>

                    <Link
                      href="/dashboard"
                      className={styles.dropdownLink}
                      onClick={closeMenus}
                    >
                      Dashboard
                    </Link>

                    <button
                      type="button"
                      className={styles.logoutButton}
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
