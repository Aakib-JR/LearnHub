import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthPayload extends JwtPayload {
  userId: number;
}

export function verifyAuthToken(
  token: string | undefined
): number | null {
  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;

    if (typeof decoded.userId !== "number") {
      return null;
    }

    return decoded.userId;
  } catch {
    return null;
  }
}
