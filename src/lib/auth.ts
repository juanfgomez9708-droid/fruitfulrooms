"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "crypto";
import { AUTH_COOKIE_NAME, SESSION_DURATION_MS } from "./constants";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is required");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createToken(email: string): string {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = `${email}|${expiry}`;
  const signature = sign(payload);
  return `${payload}|${signature}`;
}

function verifyToken(token: string): { email: string } | null {
  const lastPipe = token.lastIndexOf("|");
  if (lastPipe === -1) return null;
  const signature = token.slice(lastPipe + 1);
  const payloadPart = token.slice(0, lastPipe);
  const secondLastPipe = payloadPart.lastIndexOf("|");
  if (secondLastPipe === -1) return null;
  const email = payloadPart.slice(0, secondLastPipe);
  const expiryStr = payloadPart.slice(secondLastPipe + 1);
  const expiry = Number(expiryStr);

  if (isNaN(expiry) || Date.now() > expiry) return null;

  const payload = `${email}|${expiryStr}`;
  const expected = sign(payload);

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  return { email };
}

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return { error: "Admin credentials not configured on server" };
  }

  if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
    return { error: "Invalid email or password" };
  }

  const token = createToken(email);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  redirect("/admin");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

export async function getSession(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<{ email: string }> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}