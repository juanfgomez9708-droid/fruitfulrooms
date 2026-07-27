"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HEALTH_BAND_META,
  HEALTH_CATEGORY_LABELS,
  UPKEEP_TASK_KEYS,
  ISSUE_PRIORITIES,
} from "@/lib/constants";
import {
  logMaintenanceTask,
  createMaintenanceIssue,
  updateMaintenanceIssueStatus,
  deleteMaintenanceIssue,
} from "@/lib/actions";
import type { PropertyHealth, HealthFactor, HealthCategory, MaintenanceIssue, FactorStatus } from "@/lib/types";

const CATEGORY_ORDER: HealthCategory[] = ["income", "bills", "maintenance", "safety", "cleanliness"];

const STATUS_STYLES: Record<FactorStatus, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-green-100 text-green-800" },
  due_soon: { label: "Due soon", className: "bg-blue-100 text-blue-800" },
  overdue: { label: "Overdue", className: "bg-amber-100 text-amber-800" },
  critical: { label: "Critical", className: "bg-red-100 text-red-800" },
  unknown: { label: "Not logged", className: "bg-gray-100 text-gray-600" },
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-red-100 text-red-800",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PropertyHealthCard({
  health,
  issues,
  rooms,
}: {
  health: PropertyHealth;
  issues: (MaintenanceIssue & { room_number: string | null })[];
  rooms: { id: number; room_number: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const band = HEALTH_BAND_META[health.band];

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    factors: health.factors.filter((f) => f.category === cat),
  })).filter((g) => g.factors.length > 0);

  return (
    <div className="card" style={{ borderLeft: `5px solid ${band.color}` }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
            style={{ background: band.bg, color: band.text }}
            title={`Health score ${health.score}/100`}
          >
            {health.score}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{health.propertyName}</h3>
            <p className="text-sm font-medium" style={{ color: band.text }}>
              {band.dot} {band.label}
            </p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {expanded ? "Hide details" : "View details"}
        </button>
      </div>

      {/* Score bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div className="h-full rounded-full" style={{ width: `${health.score}%`, background: band.color }} />
      </div>

      {health.cappedBy && (
        <p className="mt-2 text-xs font-medium text-red-600">⚠️ Capped: {health.cappedBy}</p>
      )}

      {/* Top concerns (collapsed view) */}
      {!expanded && (
        <TopConcerns factors={health.factors} />
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-5">
          {grouped.map((group) => (
            <div key={group.category}>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                {HEALTH_CATEGORY_LABELS[group.category]}
              </h4>
              <div className="space-y-2">
                {group.factors.map((f) => (
                  <FactorRow
                    key={f.key}
                    factor={f}
                    canLog={UPKEEP_TASK_KEYS.includes(f.key)}
                    disabled={isPending}
                    onLog={() => run(() => logMaintenanceTask({ property_id: health.propertyId, task_type: f.key }))}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Issues */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Open Issues ({issues.length})
              </h4>
              <button
                onClick={() => setShowIssueForm((v) => !v)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showIssueForm ? "Cancel" : "+ Add issue"}
              </button>
            </div>

            {showIssueForm && (
              <IssueForm
                rooms={rooms}
                disabled={isPending}
                onSubmit={(payload) =>
                  run(async () => {
                    await createMaintenanceIssue({ property_id: health.propertyId, ...payload });
                    setShowIssueForm(false);
                  })
                }
              />
            )}

            {issues.length === 0 ? (
              <p className="text-sm text-gray-500">No open issues 🎉</p>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div key={issue.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${PRIORITY_STYLES[issue.priority] ?? ""}`}>{issue.priority}</span>
                        <span className="font-medium text-gray-900">{issue.title}</span>
                      </div>
                      {issue.description && <p className="mt-1 text-sm text-gray-600">{issue.description}</p>}
                      <p className="mt-1 text-xs text-gray-400">
                        {issue.room_number ? `Room ${issue.room_number} · ` : ""}
                        Reported {fmtDate(issue.reported_at)} · {issue.status}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {issue.status !== "resolved" && (
                        <button
                          onClick={() => run(() => updateMaintenanceIssueStatus(issue.id, "resolved"))}
                          disabled={isPending}
                          className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => run(() => deleteMaintenanceIssue(issue.id))}
                        disabled={isPending}
                        className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        aria-label="Delete issue"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TopConcerns({ factors }: { factors: HealthFactor[] }) {
  const concerns = factors
    .filter((f) => f.penalty > 0.5)
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 3);
  if (concerns.length === 0) {
    return <p className="mt-3 text-sm text-gray-500">Everything looks healthy — no active concerns.</p>;
  }
  return (
    <ul className="mt-3 space-y-1">
      {concerns.map((f) => (
        <li key={f.key} className="flex items-center justify-between text-sm">
          <span className="text-gray-700">
            {f.label} <span className="text-gray-400">— {f.detail}</span>
          </span>
          <span className="font-medium text-red-600">−{f.penalty.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}

function FactorRow({
  factor,
  canLog,
  disabled,
  onLog,
}: {
  factor: HealthFactor;
  canLog: boolean;
  disabled: boolean;
  onLog: () => void;
}) {
  const style = STATUS_STYLES[factor.status];
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{factor.label}</span>
          <span className={`badge ${style.className}`}>{style.label}</span>
        </div>
        <p className="text-xs text-gray-500">
          {factor.detail}
          {factor.lastDone ? ` · last done ${fmtDate(factor.lastDone)}` : ""}
          {factor.dueDate ? ` · due ${fmtDate(factor.dueDate)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`text-sm font-medium ${factor.penalty > 0 ? "text-red-600" : "text-gray-400"}`}>
          {factor.penalty > 0 ? `−${factor.penalty.toFixed(1)}` : "0"}
          <span className="text-xs text-gray-400"> / {factor.weight}</span>
        </span>
        {canLog && (
          <button
            onClick={onLog}
            disabled={disabled}
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Mark done
          </button>
        )}
      </div>
    </div>
  );
}

function IssueForm({
  rooms,
  disabled,
  onSubmit,
}: {
  rooms: { id: number; room_number: string }[];
  disabled: boolean;
  onSubmit: (payload: { title: string; description?: string; priority: string; room_id?: number | null }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [roomId, setRoomId] = useState<string>("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          room_id: roomId ? Number(roomId) : null,
        });
        setTitle("");
        setDescription("");
        setPriority("medium");
        setRoomId("");
      }}
      className="mb-3 space-y-2 rounded-lg border border-gray-200 p-3"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's wrong? (e.g. Kitchen faucet leaking)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        required
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details (optional)"
        rows={2}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {ISSUE_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} priority
            </option>
          ))}
        </select>
        {rooms.length > 0 && (
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Whole property</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.room_number}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={disabled}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}
