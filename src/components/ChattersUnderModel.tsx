"use client";
import { useEffect, useState } from "react";
import {
  BookUser,
  Building,
  ChevronDown,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ChattersUnderModel = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  interface ClientData {
    clientName: string;
    chatters: string;
    chattingManagers: string;
  }

  const [modelData, setModelData] = useState<ClientData[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("/api/google/cmsheets?includeChatters=true");
        if (!res.ok) {
          if (res.status === 401) {
            // Handle authentication error if needed
          } else {
            throw new Error(`Error: ${res.status}`);
          }
          return;
        }

        const data = await res.json();
        // Sort the data by clientName in ascending order
        const sortedData = [...data].sort((a, b) =>
          a.clientName.localeCompare(b.clientName)
        );
        setModelData(sortedData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch client data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const toggleExpand = (clientName: string) => {
    if (expandedClient === clientName) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientName);
    }
  };

  // Process the chatters string into an array
  const processChatters = (chattersString: string) => {
    if (!chattersString) return [];
    return chattersString
      .split(",")
      .map((chatter) => chatter.trim())
      .filter((chatter) => chatter)
      .sort((a, b) => a.localeCompare(b)); // Sort alphabetically in ascending order
  };

  return (
    <div className="rounded-lg border shadow-sm p-1">
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center">
          <Building className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium">Client Chatters</h3>
        </div>
        <div className="text-sm text-slate-500">
          {loading ? "Loading..." : `${modelData.length} clients`}
        </div>
      </div>

      <Table>
        <TableCaption className="italic">
          {loading ? (
            <div className="flex items-center justify-center overflow-y-hidden">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              Loading client data...
            </div>
          ) : (
            "Click on a client to see assigned chatters"
          )}
        </TableCaption>

        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold text-slate-700 w-10"></TableHead>
            <TableHead className="font-semibold text-slate-700">
              Client Name
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Chatting Manager
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Chatters Count
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {modelData.map((client, idx) => {
            const chatters = processChatters(client.chatters);
            return (
              <>
                <TableRow
                  key={`client-${idx}`}
                  className="hover:bg-black/40 cursor-pointer"
                  onClick={() => toggleExpand(client.clientName)}
                >
                  <TableCell className="w-10">
                    {expandedClient === client.clientName ? (
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-500" />
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center">
                      <BookUser className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="font-medium">{client.clientName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-purple-500 mr-2" />
                      <span>
                        {client.chattingManagers
                          ? client.chattingManagers
                          : "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium ">
                      {chatters.length} chatters
                    </span>
                  </TableCell>
                </TableRow>

                {expandedClient === client.clientName && (
                  <TableRow className=" border-b-0">
                    <TableCell colSpan={4} className="p-0">
                      <div className="px-10 py-3 border-l-2 border-blue-500 ml-5 mb-2">
                        <div className="flex items-center text-xs uppercase font-semibold text-slate-500 mb-3 ml-1">
                          <Users className="h-3 w-3 mr-1" />
                          Assigned Chatters
                        </div>

                        {chatters.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                            {chatters.map((chatter, i) => (
                              <div
                                key={`chatter-${i}`}
                                className="flex items-center p-2 border rounded-md "
                              >
                                <User className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-sm">{chatter}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-3 text-slate-500 italic">
                            No chatters assigned
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}

          {modelData.length === 0 && !loading && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center py-8 text-slate-500"
              >
                No client data available
              </TableCell>
            </TableRow>
          )}
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
export default ChattersUnderModel;
