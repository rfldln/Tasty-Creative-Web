"use client";
import { useState, useEffect } from "react";
import { Search, User, Users, BookUser } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ChattersList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  interface Chatter {
    name: string;
    managers: string[]; // Changed from single manager to array of managers
    clients: string[];
  }

  const [chattersList, setChattersList] = useState<Chatter[]>([]);
  const [filteredChatters, setFilteredChatters] = useState<Chatter[]>([]);

  // Fetch data from API
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
        // Sort the data by clientName
        const sortedData = [...data].sort((a, b) =>
          a.clientName.localeCompare(b.clientName)
        );

        // Process the data to create a flat list of chatters
        processChattersList(sortedData);
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

  // Process the data to create a flat list of unique chatters with their assigned clients and managers
  interface ClientData {
    clientName: string;
    chattingManagers: string;
    chatters?: string;
  }

  const processChattersList = (data: ClientData[]) => {
    // Use Map to track unique chatters with their assigned clients and managers
    const chattersMap = new Map();
    
    // Debug log to help identify the data structure
    console.log("Processing client data:", data);

    data.forEach((client) => {
      if (!client.chatters) return;

      // Handle chatters field which might contain different formats
      // Some entries might have newlines instead of commas
      const rawChatters = client.chatters || "";
      
      // Handle both comma-separated lists and newline-separated lists
      const chattersArray = rawChatters
        .split(/[,\n]/) // Split by comma or newline
        .map((chatter) => chatter.trim())
        .filter((chatter) => chatter);

      chattersArray.forEach((chatterName) => {
        // Normalize chatter name to handle case inconsistencies and multiple formats
        const normalizedName = chatterName.trim();
        
        // Handle more complex chatter name formats (e.g., "Drey/Leo", "Michael A. ")
        // We're keeping the original format for display but normalizing for map lookup
        const displayName = normalizedName;
        
        // Get the manager for this client and handle empty managers
        const manager = client.chattingManagers.trim();
        
        console.log(`Processing chatter: ${displayName} with manager: ${manager} for client: ${client.clientName}`);
        
        // If chatter already exists, update their data
        if (chattersMap.has(normalizedName)) {
          const chatterData = chattersMap.get(normalizedName);
          
          // Add this client if not already in the list
          if (!chatterData.clients.includes(client.clientName)) {
            chatterData.clients.push(client.clientName);
          }
          
          // Add this manager if not already in the list and it's not empty
          if (manager && !chatterData.managers.includes(manager)) {
            chatterData.managers.push(manager);
            console.log(`Added manager ${manager} to chatter ${displayName}`);
          }
        } else {
          // Add new chatter with initial data
          chattersMap.set(normalizedName, {
            name: displayName,
            managers: manager ? [manager] : [],
            clients: [client.clientName],
          });
          console.log(`Created new chatter: ${displayName} with ${manager ? 'manager ' + manager : 'no manager'}`);
        }
      });
    });

    // Convert Map to array and sort by name
    const uniqueChatters = Array.from(chattersMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    setChattersList(uniqueChatters);
    setFilteredChatters(uniqueChatters);
  };

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.trim() === "") {
      setFilteredChatters(chattersList);
    } else {
      const filtered = chattersList.filter((chatter) =>
        chatter.name.toLowerCase().includes(query)
      );
      setFilteredChatters(filtered);
    }
  };

  return (
    <div className="rounded-lg border shadow-sm p-1">
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium">All Chatters</h3>
        </div>
        <div className="text-sm text-slate-500">
          {loading
            ? "Loading..."
            : `${filteredChatters.length} of ${chattersList.length} chatters`}
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search chatter names..."
            className="w-full p-2 pl-10 pr-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilteredChatters(chattersList);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <Table>
        <TableCaption className="italic">
          {loading ? (
            <div className="flex items-center justify-center overflow-y-hidden">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
              Loading chatters data...
            </div>
          ) : searchQuery ? (
            `Search results for "${searchQuery}"`
          ) : (
            "Complete list of all chatters"
          )}
        </TableCaption>

        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold text-slate-700">
              Chatter Name
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Manager
            </TableHead>
            <TableHead className="font-semibold text-slate-700">
              Assigned Model
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center py-10 overflow-y-hidden"
              >
                <div className="flex justify-center items-center space-x-2 ">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  <span>Loading chatters...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : filteredChatters.length > 0 ? (
            filteredChatters.map((chatter, idx) => (
              <TableRow key={`chatter-${idx}`} className="hover:bg-black/40">
                <TableCell className="py-3">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-slate-400 mr-2" />
                    <span className="font-medium">{chatter.name}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  {chatter.managers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {chatter.managers.map((manager, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium "
                        >
                          <Users className="h-3 w-3 text-purple-500 mr-1" />
                          {manager}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No manager assigned</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  {chatter.clients.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {chatter.clients.map((client, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium"
                        >
                          <BookUser className="h-3 w-3 text-blue-500 mr-1" />
                          {client}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">No clients assigned</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center py-10 text-slate-500"
              >
                {searchQuery ? (
                  <div className="flex flex-col items-center">
                    <Search className="h-5 w-5 mb-2" />
                    <span>
                      No chatters found matching &quot;{searchQuery}&quot;
                    </span>
                  </div>
                ) : (
                  "No chatters available"
                )}
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
export default ChattersList;