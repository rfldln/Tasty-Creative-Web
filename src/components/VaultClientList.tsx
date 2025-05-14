import { getInitials } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import React from "react";

type VaultClientListProps = {
  clientLoading: boolean;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  clients: {
    id: number;
    email: string;
  }[];
  setSelectedClient: (client: { id: number; email: string }) => void;
  selectedClient: { id: number; email: string } | null;
  setSelectedCategory: (category: { id: number; tag: string } | null) => void;
};

const VaultClientList = ({
  clientLoading,
  sidebarCollapsed,
  setSidebarCollapsed,
  clients,
  setSelectedClient,
  selectedClient,
  setSelectedCategory,
}: VaultClientListProps) => {
  return (
    <div
      className={`h-full ${
        sidebarCollapsed ? "w-16" : "w-64"
      } bg-black/40 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-800">
        <h2 className={`font-bold ${sidebarCollapsed ? "hidden" : "block"}`}>
          Clients
        </h2>
        <button
          className="text-gray-400 hover:text-white"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>
      <div className="overflow-y-auto flex-grow">
        {clients.map((client) => (
          <div
            key={client.id}
            className={`flex items-center p-3 cursor-pointer hover:bg-gray-800/40 ${
              selectedClient?.id === client.id ? "bg-gray-800/40" : ""
            }`}
            onClick={() => {
              setSelectedClient(client);
              setSelectedCategory(null);
            }}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {getInitials(client.email)}
            </div>

            {!sidebarCollapsed && (
              <span className="ml-3 truncate">{client.email}</span>
            )}
          </div>
        ))}
        {clientLoading && (
          <div className="flex items-center justify-center p-4">
            <span className="text-gray-400">Loading...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VaultClientList;
