"use client";
import React, { useEffect, useState, useTransition } from "react";
import VaultClientList from "./VaultClientList";
import VaultCategoryItems from "./VaultCategoryItems";
import VaultCategoryList from "./VaultCategoryList";
import VaultFullScreenItem from "./VaultFullScreenItem";

const VaultTab = () => {
  const [clients, setClients] = useState<{ id: number; email: string }[]>([]);
  const [clientLoading, startClientLoading] = useTransition();
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{
    id: number;
    email: string;
  }>({
    id: clients[0]?.id ?? 1,
    email: clients[0]?.email ?? "Select a client",
  });
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    tag: string;
  } | null>(null);

  const [fullscreenItem, setFullscreenItem] = useState<{
    id: number;
    name: string;
    src: string;
    poster?: string;
    type: "image" | "video";
  } | null>(null);

  useEffect(() => {
    startClientLoading(() => {
      fetch("/api/be/client-list")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => setClients(data))
        .catch((err) => setError(err.message));
    });
  }, []);

  return (
    <div className="w-full h-screen  flex items-center justify-center overflow-hidden bg-black/60 rounded-lg text-white">
      <VaultClientList
        clientLoading={clientLoading}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        clients={clients}
        setSelectedClient={setSelectedClient}
        selectedClient={selectedClient}
        setSelectedCategory={setSelectedCategory}
      />
      <VaultCategoryList
        clientLoading={clientLoading}
        selectedClient={selectedClient}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />
      <VaultCategoryItems
        selectedCategory={selectedCategory}
        setFullscreenItem={setFullscreenItem}
      />

      {fullscreenItem && (
        <VaultFullScreenItem
          setFullscreenItem={setFullscreenItem}
          fullscreenItem={fullscreenItem}
        />
      )}
    </div>
  );
};

export default VaultTab;
