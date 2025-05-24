/* eslint-disable @typescript-eslint/no-explicit-any */
// components/FontSelector.tsx
import { useEffect, useState, useRef } from "react";

const GOOGLE_FONTS_API = `https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyB3qd-MPRPLUc2YUD0k0KI7_ITG0KvhXeE&sort=popularity`;

export default function FontSelector({
  selectedFont,
  setSelectedFont,
}: {
  selectedFont: any;
  setSelectedFont: any;
}) {
  const [fonts, setFonts] = useState<{ family: string }[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<{ family: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all fonts on component mount
  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const res = await fetch(GOOGLE_FONTS_API);
        const data = await res.json();
        // Keep fonts in popularity order (API returns them sorted by popularity)
        setFonts(data.items);
        setFilteredFonts(data.items.slice(0, 50)); // Show first 50 most popular initially
      } catch (err) {
        console.error("Failed to load fonts", err);
      }
    };
    fetchFonts();
  }, []);

  // Filter fonts based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFonts(fonts.slice(0, 50));
    } else {
      const filtered = fonts.filter((font) =>
        font.family.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFonts(filtered.slice(0, 20)); // Limit results for performance
    }
    setHighlightedIndex(-1);
  }, [searchTerm, fonts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleFontSelect = (fontFamily: string) => {
    setSelectedFont(fontFamily);
    setSearchTerm(fontFamily);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredFonts.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredFonts.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredFonts[highlightedIndex]) {
          handleFontSelect(filteredFonts[highlightedIndex].family);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!searchTerm) {
      setSearchTerm("");
    }
  };

  return (
    <div className="w-full mx-auto" ref={dropdownRef}>
      <div className="mb-6 rounded-md text-white">
        <label className="block text-sm font-medium mb-2 text-white">
          Search & Select Font: (DISABLED FOR NOW - DEFAULT  BEBAS NEUE)
        </label>

        <div className="relative">
          <input
            disabled
            ref={inputRef}
            type="text"
            value={searchTerm || selectedFont}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search fonts (Google Fonts)"
            className="w-full p-2 pr-8 border border-white/20 text-white bg-black rounded-md focus:ring-2 focus:ring-white focus:border-transparent placeholder-gray-400"
          />

          {/* Dropdown arrow */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {/* Dropdown menu */}
          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-black border border-white/20 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-400">
                  Loading fonts...
                </div>
              ) : filteredFonts.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No fonts found matching "{searchTerm}"
                </div>
              ) : (
                filteredFonts.map((font, index) => (
                  <div
                    key={font.family}
                    onClick={() => handleFontSelect(font.family)}
                    className={`px-3 py-2 cursor-pointer text-white hover:bg-white/10 ${
                      index === highlightedIndex ? "bg-white/10" : ""
                    } ${selectedFont === font.family ? "bg-white/20" : ""}`}
                    style={{ fontFamily: font.family }}
                  >
                    {font.family}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Display current selection */}
        {selectedFont && (
          <div className="mt-2 text-sm text-gray-300">
            Selected:{" "}
            <span style={{ fontFamily: selectedFont }}>{selectedFont}</span>
          </div>
        )}
      </div>
    </div>
  );
}
