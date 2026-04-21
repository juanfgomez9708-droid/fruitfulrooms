import type { Property, Tenant, Room, CsvTransaction, CategorizedTransaction } from "./types";
import {
  PROPERTY_RULES,
  CATEGORY_RULES,
  SKIP_PAYEE_KEYWORDS,
  SKIP_STATUSES,
  SKIP_TRANSACTION_TYPES,
  RENT_PAYEE_KEYWORDS,
} from "./import-rules";

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

/** Parse a Relay CSV export into typed transaction objects. */
export function parseCsv(text: string): { transactions: CsvTransaction[]; errors: string[] } {
  const errors: string[] = [];
  const lines = splitCsvLines(text);
  if (lines.length < 2) {
    errors.push("CSV file is empty or has no data rows.");
    return { transactions: [], errors };
  }

  const headers = parseCsvRow(lines[0]).map((h) => h.trim());
  const colMap = mapColumns(headers);

  if (colMap.date === undefined || colMap.amount === undefined) {
    errors.push(`Could not find required columns (Date, Amount). Found headers: ${headers.join(", ")}`);
    return { transactions: [], errors };
  }

  const transactions: CsvTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCsvRow(line);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => { raw[h] = fields[idx] ?? ""; });

    const amountStr = (fields[colMap.amount!] ?? "").replace(/[,$+]/g, "");
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${fields[colMap.amount!]}"`);
      continue;
    }

    const dateStr = fields[colMap.date!] ?? "";
    const isoDate = normalizeDate(dateStr);
    if (!isoDate) {
      errors.push(`Row ${i + 1}: invalid date "${dateStr}"`);
      continue;
    }

    transactions.push({
      date: isoDate,
      payee: fields[colMap.payee ?? -1]?.trim() ?? "",
      accountNum: fields[colMap.accountNum ?? -1]?.trim() ?? "",
      transactionType: fields[colMap.transactionType ?? -1]?.trim() ?? "",
      description: fields[colMap.description ?? -1]?.trim() || fields[colMap.reference ?? -1]?.trim() || "",
      status: fields[colMap.status ?? -1]?.trim() ?? "",
      amount,
      balance: parseFloat((fields[colMap.balance ?? -1] ?? "0").replace(/[,$+]/g, "")) || 0,
      rawRow: raw,
    });
  }

  return { transactions, errors };
}

// ─── Auto-Categorization ──────────────────────────────────────────────────────

export function categorizeTransactions(
  transactions: CsvTransaction[],
  properties: Property[],
  tenants: (Tenant & { room_id: number | null })[],
  rooms: (Room & { property_id: number })[],
): CategorizedTransaction[] {
  // Build tenant lookup: name -> tenant info with room price
  const tenantLookup = tenants
    .filter((t) => t.status === "active" && t.room_id)
    .map((t) => {
      const room = rooms.find((r) => r.id === t.room_id);
      return { ...t, roomPrice: room?.price ?? 0, propertyId: room?.property_id ?? 0 };
    });

  return transactions.map((tx) => {
    const searchText = `${tx.payee} ${tx.description}`.toLowerCase();

    // Check skip rules first
    if (SKIP_STATUSES.includes(tx.status)) {
      return makeSkip(tx, `Status: ${tx.status}`);
    }
    if (SKIP_TRANSACTION_TYPES.includes(tx.transactionType)) {
      return makeSkip(tx, `Internal transfer: ${tx.transactionType}`);
    }
    if (SKIP_PAYEE_KEYWORDS.some((kw) => searchText.includes(kw.toLowerCase()))) {
      return makeSkip(tx, `Internal account: ${tx.payee}`);
    }
    // Skip zero-amount rows
    if (tx.amount === 0) {
      return makeSkip(tx, "Zero amount");
    }

    // Negative = expense (outflow)
    if (tx.amount < 0) {
      return categorizeExpense(tx, searchText, properties);
    }

    // Positive = potential rent payment (inflow)
    return categorizePayment(tx, searchText, tenantLookup);
  });
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function makeSkip(tx: CsvTransaction, reason: string): CategorizedTransaction {
  return {
    original: tx,
    type: "skip",
    confidence: "high",
    skipReason: reason,
    amount: Math.abs(tx.amount),
    included: false,
  };
}

function categorizeExpense(
  tx: CsvTransaction,
  searchText: string,
  _properties: Property[],
): CategorizedTransaction {
  const absAmount = Math.abs(tx.amount);
  const month = tx.date.substring(0, 7); // YYYY-MM

  // Match category
  let category = "other";
  let catConfidence: "high" | "medium" | "low" = "low";
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw.toLowerCase()))) {
      category = rule.category;
      catConfidence = "high";
      break;
    }
  }

  // Match property
  let property_id: number | undefined;
  let propConfidence: "high" | "medium" | "low" = "low";
  for (const rule of PROPERTY_RULES) {
    if (rule.keywords.some((kw) => searchText.includes(kw.toLowerCase()))) {
      property_id = rule.property_id;
      propConfidence = "high";
      break;
    }
  }

  // Overall confidence is the lowest of the two
  const confidence: "high" | "medium" | "low" =
    propConfidence === "low" || catConfidence === "low" ? "low" : "high";

  // Auto-generate notes from payee if it's an "other" category
  const notes = category === "other" && catConfidence === "low" ? tx.payee : undefined;

  return {
    original: tx,
    type: "expense",
    confidence,
    property_id,
    category,
    month,
    amount: absAmount,
    notes,
    included: true,
  };
}

function categorizePayment(
  tx: CsvTransaction,
  searchText: string,
  tenantLookup: { id: number; name: string; roomPrice: number; propertyId: number }[],
): CategorizedTransaction {
  const absAmount = tx.amount; // already positive
  const month = tx.date.substring(0, 7);
  const dueDate = `${month}-01`;
  const paidDate = tx.date;

  // Check if this looks like a rent payment
  const isRentPayee = RENT_PAYEE_KEYWORDS.some((kw) => searchText.includes(kw.toLowerCase()));

  if (!isRentPayee) {
    // Positive inflow but not from a known rent source — low confidence
    return {
      original: tx,
      type: "payment",
      confidence: "low",
      amount: absAmount,
      due_date: dueDate,
      paid_date: paidDate,
      notes: tx.payee,
      included: true,
    };
  }

  // Try to match tenant by name in description
  // Relay Apartments.com format: "APTS Forre" = first 5 chars of last name
  let matchedTenant: typeof tenantLookup[0] | undefined;
  let confidence: "high" | "medium" | "low" = "low";

  // Extract the name fragment from Apartments.com descriptions (e.g., "APTS Forre")
  const aptsMatch = tx.description.match(/APTS\s+(\w+)/i) || tx.payee.match(/APTS\s+(\w+)/i);
  const nameFragment = aptsMatch?.[1]?.toLowerCase();

  if (nameFragment && nameFragment.length >= 3) {
    const candidates = tenantLookup.filter((t) =>
      t.name.toLowerCase().includes(nameFragment) ||
      t.name.split(/\s+/).some((part) => part.toLowerCase().startsWith(nameFragment))
    );
    if (candidates.length === 1) {
      matchedTenant = candidates[0];
      confidence = "high";
    } else if (candidates.length > 1) {
      // Multiple matches — try amount match
      const amountMatch = candidates.find((t) => Math.abs(t.roomPrice - absAmount) < 1);
      if (amountMatch) {
        matchedTenant = amountMatch;
        confidence = "medium";
      }
    }
  }

  // Fallback: try exact amount match against room prices
  if (!matchedTenant) {
    const amountMatches = tenantLookup.filter((t) => Math.abs(t.roomPrice - absAmount) < 1);
    if (amountMatches.length === 1) {
      matchedTenant = amountMatches[0];
      confidence = "medium";
    }
  }

  return {
    original: tx,
    type: "payment",
    confidence,
    tenant_id: matchedTenant?.id,
    tenant_name: matchedTenant?.name,
    amount: absAmount,
    due_date: dueDate,
    paid_date: paidDate,
    notes: nameFragment ? `Apartments.com: ${tx.description}` : tx.payee,
    included: true,
  };
}

// ─── CSV Parsing Utilities ────────────────────────────────────────────────────

function splitCsvLines(text: string): string[] {
  // Handle CRLF and LF
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++; // skip \r\n
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

interface ColumnMap {
  date?: number;
  payee?: number;
  accountNum?: number;
  transactionType?: number;
  description?: number;
  reference?: number;
  status?: number;
  amount?: number;
  balance?: number;
}

function mapColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  headers.forEach((h, i) => {
    const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lower === "date") map.date = i;
    else if (lower === "payee") map.payee = i;
    else if (lower === "account" || lower === "accountnumber" || lower === "account#") map.accountNum = i;
    else if (lower === "transactiontype" || lower === "type") map.transactionType = i;
    else if (lower === "description") map.description = i;
    else if (lower === "reference") map.reference = i;
    else if (lower === "status") map.status = i;
    else if (lower === "amount") map.amount = i;
    else if (lower === "balance") map.balance = i;
  });
  return map;
}

function normalizeDate(dateStr: string): string | null {
  // Handle M/D/YYYY format from Relay
  const parts = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (parts) {
    return `${parts[3]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  // Handle YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}
