"use client";

import { useState } from "react";
import { submitInquiry } from "@/lib/actions";
import { EMPLOYMENT_OPTIONS, INCOME_OPTIONS } from "@/lib/constants";

const inputClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export function InquiryForm({ roomId }: { roomId: number }) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const result = await submitInquiry({
      room_id: roomId,
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      employment_status: form.get("employment_status") as string,
      income_range: form.get("income_range") as string,
      desired_move_in: form.get("desired_move_in") as string,
      occupants: form.get("occupants") as string,
      has_pets: form.get("has_pets") as string,
      background_check_consent: form.get("background_check_consent") as string,
      about: form.get("about") as string,
    });

    setLoading(false);

    if (result.success) {
      setSubmitted(true);
    } else {
      setError(result.error ?? "Something went wrong.");
    }
  }

  if (submitted) {
    return (
      <div className="card sticky top-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="font-semibold text-lg mb-2">Application Submitted!</h2>
        <p className="text-muted text-sm">
          Thank you for your interest. We&apos;ll review your application and reach out
          within 1-2 business days to schedule a call.
        </p>
      </div>
    );
  }

  return (
    <div className="card sticky top-8">
      <h2 className="font-semibold text-lg mb-1">Apply for This Room</h2>
      <p className="text-muted text-sm mb-4">
        Fill out the form below and we&apos;ll reach out to schedule a call.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Contact Info */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input type="text" id="name" name="name" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input type="email" id="email" name="email" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <input type="tel" id="phone" name="phone" required className={inputClass} />
        </div>

        <hr className="border-card-border" />

        {/* Screening Questions */}
        <div>
          <label htmlFor="employment_status" className="block text-sm font-medium mb-1">
            Employment Status <span className="text-red-500">*</span>
          </label>
          <select id="employment_status" name="employment_status" required className={inputClass}>
            <option value="">Select...</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="income_range" className="block text-sm font-medium mb-1">
            Monthly Income Range <span className="text-red-500">*</span>
          </label>
          <select id="income_range" name="income_range" required className={inputClass}>
            <option value="">Select...</option>
            {INCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="desired_move_in" className="block text-sm font-medium mb-1">
            Desired Move-in Date <span className="text-red-500">*</span>
          </label>
          <input type="date" id="desired_move_in" name="desired_move_in" required className={inputClass} />
        </div>

        <div>
          <label htmlFor="occupants" className="block text-sm font-medium mb-1">
            How many people will occupy the room? <span className="text-red-500">*</span>
          </label>
          <select id="occupants" name="occupants" required className={inputClass}>
            <option value="1">Just me</option>
            <option value="2">2 people</option>
          </select>
        </div>

        <div>
          <label htmlFor="has_pets" className="block text-sm font-medium mb-1">
            Do you have pets? <span className="text-red-500">*</span>
          </label>
          <select id="has_pets" name="has_pets" required className={inputClass}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        <div>
          <label htmlFor="background_check_consent" className="block text-sm font-medium mb-1">
            Willing to consent to a background check? <span className="text-red-500">*</span>
          </label>
          <select id="background_check_consent" name="background_check_consent" required className={inputClass}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="about" className="block text-sm font-medium mb-1">
            Tell us a bit about yourself
          </label>
          <textarea
            id="about"
            name="about"
            rows={3}
            maxLength={2000}
            placeholder="Work situation, lifestyle, why you're looking for a room..."
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-gradient-start via-gradient-mid to-gradient-end px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
