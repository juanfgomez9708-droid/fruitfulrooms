import { getImportData } from "@/lib/import-actions";
import { ImportWizard } from "./ImportWizard";

export default async function ImportPage() {
  const { properties, tenants, rooms } = await getImportData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Bank Transactions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV export from Relay to auto-categorize expenses and rent payments.
        </p>
      </div>
      <ImportWizard properties={properties} tenants={tenants} rooms={rooms} />
    </div>
  );
}
