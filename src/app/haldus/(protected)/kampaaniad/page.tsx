import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CampaignForm } from "./CampaignForm";

export default function CampaignsAdminPage() {
  return (
    <>
      <AdminPageHeader title="Kampaaniad" description="Kampaaniate ja soodustuste haldamine." />
      <CampaignForm />
      <div className="mt-8">
        <p className="text-muted py-8 text-center">Kampaaniad salvestatakse Supabase andmebaasi. Aktiivseid kampaaniaid pole veel loodud. Kasuta \u00fcleval vormi esimese kampaania lisamiseks.</p>
      </div>
    </>
  );
}
