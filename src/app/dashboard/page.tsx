import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import DashboardClient from "./DashboardClient";

import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";

async function DashboardContent() {
  const cookieStore = await cookies();

  await connection();

  const token = cookieStore.get("learnhub_token")?.value;
  const userId = verifyAuthToken(token);

  if (!userId) {
    redirect("/login");
  }

  const result = await db.query(
    "SELECT id FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    redirect("/login");
  }

  return <DashboardClient />;
}

export default function DashboardPage() {
  return (
    <>
      <Navbar />

      <Suspense
        fallback={
          <main className="container py-5">
            Loading dashboard...
          </main>
        }
      >
        <DashboardContent />
      </Suspense>

      <Footer />
    </>
  );
}
