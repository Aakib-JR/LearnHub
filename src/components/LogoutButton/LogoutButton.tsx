"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to logout. Please try again.");
    }
  }

  return (
    <button
      type="button"
      className="btn btn-danger"
      onClick={handleLogout}
    >
      Logout
    </button>
  );
}
