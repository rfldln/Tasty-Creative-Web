// components/emoji-text-input.tsx
'use client';

import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { EmojiPicker } from './emoji-picker';
import { useEmoji } from '@/hooks/use-emoji';

interface EmojiTextInputProps {
  placeholder?: string;
  onSubmit?: (message: string) => void;
  className?: string;
}

export function EmojiTextInput({ 
  placeholder = "Type a message...", 
  onSubmit,
  className = '' 
}: EmojiTextInputProps) {
  const [message, setMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const { formatMessage } = useEmoji();

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      const formattedMessage = formatMessage(message);
      onSubmit?.(formattedMessage);
      setMessage('');
      setShowPicker(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none"
        />
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>
        <button
          type="submit"
          className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Send
        </button>
      </div>

      {showPicker && (
        <div className="absolute bottom-full mb-2 right-0 z-10">
          <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        </div>
      )}
    </form>
  );
}