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
    <div>
      <Table>
        <TableCaption>
          {loading ? "Loading..." : "List of Chatting Managers"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Manager Name</TableHead>
            <TableHead className="text-right">Assigned Models</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {managers.map((manager, idx) => {
            const assignedModels = getAssignedModels(manager.name);
            return (
              <TableRow key={idx}>
                <TableCell className="font-medium">{manager.name}</TableCell>
                <TableCell className="text-right">
                  {assignedModels.length > 0 ? assignedModels.join(", ") : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default ChattingManagersList;
