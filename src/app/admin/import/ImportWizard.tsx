"use client";

import { useState, useCallback } from "react";
import { parseCsv, categorizeTransactions } from "@/lib/csv";
import { importTransactions } from "@/lib/import-actions";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import type { Property, Room, Tenant, CategorizedTransaction, ConfirmedTransaction, ImportResult } from "@/lib/types";

type Step = "upload" | "review" | "result";
type FilterTab = "all" | "expense" | "payment" | "skip";

interface Props {
  properties: Property[];
  tenants: (Tenant & { room_id: number | null })[];
  rooms: (Room & { property_id: number })[];
}

export function ImportWizard({ properties, tenants, rooms }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<CategorizedTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  const activeTenants = tenants.filter((t) => t.status === "active");

  // ── File Upload Handler ──
  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { transactions, errors } = parseCsv(text);
        setParseErrors(errors);

        if (transactions.length === 0) {
          setParseErrors((prev) => [...prev, "No valid transactions found in file."]);
          return;
        }

        const categorized = categorizeTransactions(transactions, properties, tenants, rooms);
        setRows(categorized);
        setStep("review");
      };
      reader.readAsText(file);
    },
    [properties, tenants, rooms],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) handleFile(file);
    },
    [handleFile],
  );

  // ── Row Editing ──
  const updateRow = (index: number, updates: Partial<CategorizedTransaction>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)));
  };

  // ── Import Handler ──
  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport: ConfirmedTransaction[] = rows
        .filter((r) => r.included && r.type !== "skip")
        .map((r) => ({
          type: r.type as "expense" | "payment",
          property_id: r.property_id,
          category: r.category,
          amount: r.amount,
          month: r.month,
          notes: r.notes,
          tenant_id: r.tenant_id,
          due_date: r.due_date,
          paid_date: r.paid_date,
        }));

      const importResult = await importTransactions(toImport);
      setResult(importResult);
      setStep("result");
    } catch (err) {
      setResult({
        expensesCreated: 0,
        paymentsCreated: 0,
        duplicatesSkipped: 0,
        errors: [`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`],
      });
      setStep("result");
    } finally {
      setImporting(false);
    }
  };

  // ── Filter Logic ──
  const filteredRows = rows.filter((r) => {
    if (filter === "all") return true;
    return r.type === filter;
  });

  const counts = {
    all: rows.length,
    expense: rows.filter((r) => r.type === "expense").length,
    payment: rows.filter((r) => r.type === "payment").length,
    skip: rows.filter((r) => r.type === "skip").length,
  };

  const includedCount = rows.filter((r) => r.included && r.type !== "skip").length;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === "upload") {
    return (
      <div className="card">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <svg className="mb-4 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mb-2 text-lg font-medium text-gray-700">
            Drop your Relay CSV file here
          </p>
          <p className="mb-4 text-sm text-gray-500">or click to browse</p>
          <label className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Choose File
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          In Relay: Accounts tab &rarr; Statements &rarr; Select month &rarr; Export as CSV
        </p>
        {parseErrors.length > 0 && (
          <div className="mt-4 rounded-lg bg-red-50 p-4">
            {parseErrors.map((err, i) => (
              <p key={i} className="text-sm text-red-700">{err}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === "result") {
    return (
      <div className="card">
        {result && result.errors.length === 0 && (result.expensesCreated > 0 || result.paymentsCreated > 0) ? (
          <div className="rounded-lg bg-green-50 p-6 text-center">
            <div className="mb-2 text-4xl">&#10003;</div>
            <h2 className="text-xl font-bold text-green-800">Import Complete</h2>
            <div className="mt-3 flex justify-center gap-6 text-sm">
              {result.expensesCreated > 0 && (
                <span className="text-gray-700">{result.expensesCreated} expense{result.expensesCreated !== 1 ? "s" : ""} created</span>
              )}
              {result.paymentsCreated > 0 && (
                <span className="text-gray-700">{result.paymentsCreated} payment{result.paymentsCreated !== 1 ? "s" : ""} created</span>
              )}
              {result.duplicatesSkipped > 0 && (
                <span className="text-gray-500">{result.duplicatesSkipped} duplicate{result.duplicatesSkipped !== 1 ? "s" : ""} skipped</span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-yellow-50 p-6">
            <h2 className="text-lg font-bold text-yellow-800">Import finished with issues</h2>
            <div className="mt-2 space-y-1">
              {result?.errors.map((err, i) => (
                <p key={i} className="text-sm text-yellow-700">{err}</p>
              ))}
            </div>
            {result && (result.expensesCreated > 0 || result.paymentsCreated > 0) && (
              <p className="mt-3 text-sm text-gray-600">
                Still created: {result.expensesCreated} expenses, {result.paymentsCreated} payments
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => { setStep("upload"); setRows([]); setResult(null); setFileName(""); }}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Import Another File
          </button>
          <a href="/admin/expenses" className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            View Expenses
          </a>
          <a href="/admin/payments" className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            View Payments
          </a>
        </div>
      </div>
    );
  }

  // ── Review Step ──
  return (
    <div>
      {/* Summary Bar */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">
              {fileName} &mdash; {rows.length} transactions:
            </span>
            <span className="ml-2 text-sm text-red-600">{counts.expense} expenses</span>
            <span className="ml-2 text-sm text-green-600">{counts.payment} payments</span>
            <span className="ml-2 text-sm text-gray-400">{counts.skip} skipped</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setStep("upload"); setRows([]); setFileName(""); }}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing || includedCount === 0}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {importing ? "Importing..." : `Import ${includedCount} Transaction${includedCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-1">
        {(["all", "expense", "payment", "skip"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab === "all" ? "All" : tab === "expense" ? "Expenses" : tab === "payment" ? "Payments" : "Skipped"}
            <span className="ml-1 text-xs opacity-75">({counts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Transaction Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-2 font-medium w-8"></th>
              <th className="pb-2 pr-2 font-medium">Date</th>
              <th className="pb-2 pr-2 font-medium">Payee</th>
              <th className="pb-2 pr-2 font-medium text-right">Amount</th>
              <th className="pb-2 pr-2 font-medium">Type</th>
              <th className="pb-2 pr-2 font-medium">Property / Tenant</th>
              <th className="pb-2 pr-2 font-medium">Category</th>
              <th className="pb-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, filteredIndex) => {
              // Find the actual index in the full rows array
              const actualIndex = rows.indexOf(row);
              const isSkip = row.type === "skip";
              const isLow = row.confidence === "low" && !isSkip;

              return (
                <tr
                  key={actualIndex}
                  className={`border-b border-gray-100 ${
                    isSkip ? "bg-gray-50 text-gray-400" : isLow ? "bg-yellow-50" : filteredIndex % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  {/* Include checkbox */}
                  <td className="py-2 pr-2">
                    <input
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) => updateRow(actualIndex, { included: e.target.checked })}
                      className="rounded"
                    />
                  </td>

                  {/* Date */}
                  <td className="py-2 pr-2 whitespace-nowrap">{row.original.date}</td>

                  {/* Payee */}
                  <td className="py-2 pr-2 max-w-[200px] truncate" title={`${row.original.payee} — ${row.original.description}`}>
                    {row.original.payee}
                  </td>

                  {/* Amount */}
                  <td className={`py-2 pr-2 text-right font-medium whitespace-nowrap ${
                    row.original.amount < 0 ? "text-red-600" : "text-green-600"
                  }`}>
                    {row.original.amount < 0 ? "-" : "+"}${row.amount.toFixed(2)}
                  </td>

                  {/* Type */}
                  <td className="py-2 pr-2">
                    {isSkip ? (
                      <span className="text-xs text-gray-400" title={row.skipReason}>{row.skipReason}</span>
                    ) : (
                      <select
                        value={row.type}
                        onChange={(e) => updateRow(actualIndex, {
                          type: e.target.value as "expense" | "payment" | "skip",
                          included: e.target.value !== "skip",
                        })}
                        className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="expense">Expense</option>
                        <option value="payment">Payment</option>
                        <option value="skip">Skip</option>
                      </select>
                    )}
                  </td>

                  {/* Property / Tenant */}
                  <td className="py-2 pr-2">
                    {row.type === "expense" && !isSkip ? (
                      <select
                        value={row.property_id ?? ""}
                        onChange={(e) => updateRow(actualIndex, { property_id: e.target.value ? Number(e.target.value) : undefined })}
                        className={`rounded border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !row.property_id ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
                        }`}
                      >
                        <option value="">Select property...</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    ) : row.type === "payment" && !isSkip ? (
                      <select
                        value={row.tenant_id ?? ""}
                        onChange={(e) => {
                          const tid = e.target.value ? Number(e.target.value) : undefined;
                          const tenant = activeTenants.find((t) => t.id === tid);
                          updateRow(actualIndex, { tenant_id: tid, tenant_name: tenant?.name });
                        }}
                        className={`rounded border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !row.tenant_id ? "border-yellow-400 bg-yellow-50" : "border-gray-200"
                        }`}
                      >
                        <option value="">Select tenant...</option>
                        {activeTenants.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : null}
                  </td>

                  {/* Category (expenses only) */}
                  <td className="py-2 pr-2">
                    {row.type === "expense" && !isSkip ? (
                      <select
                        value={row.category ?? "other"}
                        onChange={(e) => updateRow(actualIndex, { category: e.target.value })}
                        className="rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    ) : row.type === "payment" && !isSkip ? (
                      <span className="text-xs text-gray-400">
                        {row.confidence === "high" ? "🟢" : row.confidence === "medium" ? "🟡" : "🔴"} {row.tenant_name || "Unmatched"}
                      </span>
                    ) : null}
                  </td>

                  {/* Notes */}
                  <td className="py-2">
                    {!isSkip && (
                      <input
                        type="text"
                        value={row.notes ?? ""}
                        onChange={(e) => updateRow(actualIndex, { notes: e.target.value || undefined })}
                        placeholder="Notes"
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
