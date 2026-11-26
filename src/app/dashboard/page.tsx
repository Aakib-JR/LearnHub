import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import LogoutButton from "@/components/LogoutButton/LogoutButton";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";

async function DashboardContent() {
  const cookieStore = await cookies();

  // Run dynamic authentication after request data is available.
  await connection();

  const token = cookieStore.get("learnhub_token")?.value;
  const userId = verifyAuthToken(token);

  if (!userId) {
    redirect("/login");
  }

  const result = await db.query(
    "SELECT id, name, email FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    redirect("/login");
  }

  const user = result.rows[0];

  return (
    <main className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-2">
            Welcome, {user.name}! 👋
          </h1>
          <p className="text-secondary mb-0">
            Welcome to your LearnHub dashboard.
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="card p-4 shadow-sm">
        <h4 className="fw-bold mb-3">My Profile</h4>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />

      <Suspense fallback={<p className="container py-5">Loading dashboard...</p>}>
        <DashboardContent />
      </Suspense>

      <Footer />
    </>
  );
}
