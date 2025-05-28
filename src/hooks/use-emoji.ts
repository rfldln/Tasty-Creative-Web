// hooks/use-emoji.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import Cookies from "js-cookie";
import { EmojiManager, EmojiSearchResult } from "@/lib/emoji-utils";

export interface UseEmojiReturn {
  searchEmojis: (query: string) => EmojiSearchResult[];
  recentEmojis: string[];
  addToRecent: (emojiName: string) => void;
  favorites: Set<string>;
  toggleFavorite: (emojiName: string) => void;
  formatMessage: (message: string) => string;
  getRandomEmoji: () => string;
}

const RECENT_COOKIE_KEY = "recent_emojis";

export function useEmoji(maxRecent: number = 20): UseEmojiReturn {
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load recent emojis from cookies on mount
  useEffect(() => {
    const stored = Cookies.get(RECENT_COOKIE_KEY);
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch {
        // silently fail on invalid cookie
      }
    }
  }, []);

  const searchEmojis = useCallback((query: string): EmojiSearchResult[] => {
    if (!query.trim()) return [];
    return EmojiManager.searchEmojis(query);
  }, []);

  const addToRecent = useCallback(
    (emojiName: string) => {
      setRecentEmojis((prev) => {
        const updated = [
          emojiName,
          ...prev.filter((name) => name !== emojiName),
        ].slice(0, maxRecent);
        Cookies.set(RECENT_COOKIE_KEY, JSON.stringify(updated), {
          expires: 365,
        });
        return updated;
      });
    },
    [maxRecent]
  );

  const toggleFavorite = useCallback((emojiName: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(emojiName)) {
        newFavorites.delete(emojiName);
      } else {
        newFavorites.add(emojiName);
      }
      return newFavorites;
    });
  }, []);

  const formatMessage = useCallback((message: string): string => {
    const replacements: Record<string, string> = {
      love: "❤️",
      happy: "😊",
      sad: "😢",
      fire: "🔥",
      star: "⭐",
      pizza: "🍕",
      coffee: "☕",
    };

    let formatted = message;
    for (const [word, emoji] of Object.entries(replacements)) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      formatted = formatted.replace(regex, `${word} ${emoji}`);
    }

    return EmojiManager.emojify(formatted);
  }, []);

  const getRandomEmoji = useCallback(() => {
    return EmojiManager.getRandomEmoji();
  }, []);

  return {
    searchEmojis,
    recentEmojis,
    addToRecent,
    favorites,
    toggleFavorite,
    formatMessage,
    getRandomEmoji,
  };
}
