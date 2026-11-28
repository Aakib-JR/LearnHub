import { Suspense } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import LoginForm from "@/components/LoginForm/LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ registered?: string | string[] }>;
}

async function LoginPageContent({
  searchParams,
}: LoginPageProps) {
  const { registered } = await searchParams;
  const registrationSuccess =
    registered === "1" ||
    (Array.isArray(registered) && registered.includes("1"));

  return <LoginForm registrationSuccess={registrationSuccess} />;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="container py-5">
            <p className="text-secondary text-center mb-0">
              Loading login...
            </p>
          </div>
        }
      >
        <LoginPageContent searchParams={searchParams} />
      </Suspense>
      <Footer />
    </>
  );
}
