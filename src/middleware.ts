import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/constants";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const lastPipe = token.lastIndexOf("|");
  if (lastPipe === -1) return false;
  const signature = token.slice(lastPipe + 1);
  const payloadPart = token.slice(0, lastPipe);
  const secondLastPipe = payloadPart.lastIndexOf("|");
  if (secondLastPipe === -1) return false;
  const expiryStr = payloadPart.slice(secondLastPipe + 1);
  const expiry = Number(expiryStr);

  if (isNaN(expiry) || Date.now() > expiry) return false;

  const payload = payloadPart;
  const expected = await hmacSign(payload, secret);

  if (signature.length !== expected.length) return false;

  const sigBytes = hexToBytes(signature);
  const expBytes = hexToBytes(expected);
  let match = true;
  for (let i = 0; i < sigBytes.length; i++) {
    match = match && sigBytes[i] === expBytes[i];
  }
  return match;
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  if (!secret || !token || !(await verifyToken(token, secret))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
