import { getPortfolioHealth, getMaintenanceIssues, getAllRooms } from "@/lib/actions";
import { HEALTH_BAND_META } from "@/lib/constants";
import { PropertyHealthCard } from "./PropertyHealthCard";

export default async function HealthPage() {
  const [portfolio, issues, rooms] = await Promise.all([
    getPortfolioHealth(),
    getMaintenanceIssues(),
    getAllRooms(),
  ]);

  // Group open issues and rooms by property for each card.
  const issuesByProp = new Map<number, typeof issues>();
  for (const issue of issues) {
    const arr = issuesByProp.get(issue.property_id) ?? [];
    arr.push(issue);
    issuesByProp.set(issue.property_id, arr);
  }
  const roomsByProp = new Map<number, { id: number; room_number: string }[]>();
  for (const r of rooms) {
    const arr = roomsByProp.get(r.property_id) ?? [];
    arr.push({ id: r.id, room_number: r.room_number });
    roomsByProp.set(r.property_id, arr);
  }

  // Worst health first — that's what needs attention.
  const sorted = [...portfolio.properties].sort((a, b) => a.score - b.score);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Health</h1>
          <p className="mt-1 text-sm text-gray-500">
            A weighted score for each property. Log upkeep as you do it to keep scores accurate.
          </p>
        </div>
      </div>

      {/* Portfolio summary */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Avg. Health" value={`${portfolio.averageScore}`} sub="/ 100" color="#111827" />
        <SummaryCard label="Healthy" value={portfolio.green} sub={HEALTH_BAND_META.green.dot} color={HEALTH_BAND_META.green.color} />
        <SummaryCard label="Needs Attention" value={portfolio.yellow} sub={HEALTH_BAND_META.yellow.dot} color={HEALTH_BAND_META.yellow.color} />
        <SummaryCard label="Needs Work Now" value={portfolio.red} sub={HEALTH_BAND_META.red.dot} color={HEALTH_BAND_META.red.color} />
      </div>

      {sorted.length === 0 ? (
        <div className="card text-sm text-gray-500">No properties yet. Add a property to see its health.</div>
      ) : (
        <div className="space-y-4">
          {sorted.map((health) => (
            <PropertyHealthCard
              key={health.propertyId}
              health={health}
              issues={issuesByProp.get(health.propertyId) ?? []}
              rooms={roomsByProp.get(health.propertyId) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value} <span className="text-base font-normal text-gray-400">{sub}</span>
      </p>
    </div>
  );
}
