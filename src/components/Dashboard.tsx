import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Domain } from "@/types/domain";
import DomainDetails from "./DomainDetails";

interface DashboardProps {
  domains: Domain[];
}

const Dashboard = ({ domains }: DashboardProps) => {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  if (domains.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p>No domains scanned yet. Use the Domain Input tab to start scanning.</p>
        </div>
      </Card>
    );
  }

  if (selectedDomain) {
    return <DomainDetails domain={selectedDomain} onBack={() => setSelectedDomain(null)} />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {domains.map((domain) => (
        <Card
          key={domain.rootDomain + domain.timestamp}
          className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedDomain(domain)}
        >
          <h3 className="text-lg font-semibold mb-2">{domain.rootDomain}</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <p>{domain.subdomains.length} subdomains discovered</p>
            <p>{domain.jsFiles.length} JS files found</p>
            <p>{domain.endpoints.length} endpoints identified</p>
            <p className="text-xs">
              Scanned: {new Date(domain.timestamp).toLocaleString()}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default Dashboard;