"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <h1 className="mb-2 text-center text-2xl font-bold bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end bg-clip-text text-transparent font-brand lowercase">
            Fruitful Rooms
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500">
            Sign in to admin dashboard
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="admin@fruitfulrooms.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Enter password"
              />
            </div>

            {state?.error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
