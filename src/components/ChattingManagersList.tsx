"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookUser, User, Users } from "lucide-react";

interface Manager {
  name: string;
  rowIndex: number;
}

interface Client {
  clientName: string;
  chattingManagers: string;
  rowIndex: number;
}

const ChattingManagersList = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [Models, setModels] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await fetch("/api/google/cmlist");
        const data: Manager[] = await res.json();
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
        setManagers(sorted);
      } catch (error) {
        console.error("Failed to fetch managers:", error);
      }
    };

    const fetchModels = async () => {
      try {
        const res = await fetch("/api/google/cmsheets");
        if (!res.ok) {
          if (res.status === 401) {
            setError("You need to authenticate first");
          } else {
            throw new Error(`Error: ${res.status}`);
          }
          return;
        }

        const data = await res.json();
        setModels(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch Models");
      } finally {
        setLoading(false);
      }
    };

    fetchManagers();
    fetchModels();
  }, []);

  // Helper function to find Models assigned to a manager
  const getAssignedModels = (managerName: string): string[] => {
    return Models.filter((client) =>
      client.chattingManagers
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .includes(managerName.toLowerCase())
    ).map((client) => client.clientName);
  };

  return (
    <div className="rounded-lg border shadow-sm p-1 ">
      <div className="px-4 py-3 flex items-center border-b">
        <Users className="h-5 w-5 text-blue-500 mr-2" />
        <h3 className="text-lg font-medium">Chatting Managers</h3>
      </div>

      <Table>
        <TableCaption className="italic">
          {loading ? (
            <div className="flex items-center justify-center overflow-y-hidden">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              Loading manager data...
            </div>
          ) : (
            "Complete list of chatting managers and their model assignments"
          )}
        </TableCaption>

        <TableHeader>
          <TableRow className="hover:bg-black/40">
            <TableHead className="font-semibold text-slate-700 w-1/2">
              Manager Name
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Assigned Models
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {managers.map((manager, idx) => {
            const assignedModels = getAssignedModels(manager.name);
            return (
              <TableRow key={idx} className="hover:bg-black/40">
                <TableCell className="py-3">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-slate-400 mr-2" />
                    <span className="font-medium">{manager.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right py-3">
                  {assignedModels.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {assignedModels.map((model, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium"
                        >
                          <BookUser className="h-3 w-3  mr-1 text-blue-500" />
                          {model}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No models assigned</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {error && (
        <div className="border border-red-200 text-red-600 px-4 py-3 rounded-md mt-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default ChattingManagersList;
