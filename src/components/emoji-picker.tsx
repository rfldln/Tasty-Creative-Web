// components/emoji-picker.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Heart,
  Clock,
  Smile,
  Users,
  Leaf,
  Pizza,
  Car,
  Wrench,
  Star,
} from "lucide-react";
import { useEmoji } from "@/hooks/use-emoji";
import { EmojiManager } from "@/lib/emoji-utils";

interface EmojiPickerProps {
  onEmojiSelect?: (emoji: string, name: string) => void;
  className?: string;
}

const categories = [
  { name: "Recent", key: "recent", icon: Clock },
  { name: "Smileys", key: "smileys", icon: Smile },
  { name: "People", key: "people", icon: Users },
  { name: "Nature", key: "nature", icon: Leaf },
  { name: "Food", key: "food", icon: Pizza },
  { name: "Travel", key: "travel", icon: Car },
  { name: "Objects", key: "objects", icon: Wrench },
  { name: "Symbols", key: "symbols", icon: Star },
];

export function EmojiPicker({
  onEmojiSelect,
  className = "",
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("recent");
  const { searchEmojis, recentEmojis, addToRecent, favorites, toggleFavorite } =
    useEmoji();

  const categorizedEmojis = useMemo(() => {
    return EmojiManager.getCategorizedEmojis();
  }, []);

  const displayEmojis = useMemo(() => {
    if (searchQuery.trim()) {
      return searchEmojis(searchQuery);
    }

    if (selectedCategory === "recent") {
      return recentEmojis
        .map((name) => ({
          name,
          emoji: EmojiManager.getEmoji(name) || "",
          key: name,
        }))
        .filter((item) => item.emoji);
    }

    return categorizedEmojis
      .filter((item) => item.category === selectedCategory)
      .map((item) => ({
        name: item.name,
        emoji: item.emoji,
        key: item.name,
      }));
  }, [
    searchQuery,
    selectedCategory,
    searchEmojis,
    recentEmojis,
    categorizedEmojis,
  ]);

  const handleEmojiClick = (emojiData: { name: string; emoji: string }) => {
    addToRecent(emojiData.name);
    onEmojiSelect?.(emojiData.emoji, emojiData.name);
  };

  return (
    <div
      className={` border  border-gray-200 rounded-lg shadow-lg p-4 w-80 ${className}`}
    >
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search emojis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                selectedCategory === category.key
                  ? "bg-blue-100 text-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <IconComponent className="w-3 h-3" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {displayEmojis.length > 0 ? (
          displayEmojis.map((emojiData, index) => (
            <button
              key={`${emojiData.key}-${index}`}
              onClick={() => handleEmojiClick(emojiData)}
              className="relative w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors group"
              title={emojiData.name}
            >
              {emojiData.emoji}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(emojiData.name);
                }}
                className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Heart
                  className={`w-3 h-3 ${
                    favorites.has(emojiData.name)
                      ? "fill-red-500 text-red-500"
                      : "text-gray-400"
                  }`}
                />
              </button>
            </button>
          ))
        ) : (
          <div className="col-span-8 text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-sm">No emojis found</p>
          </div>
        )}
      </div>
    </div>
  );
}
