// lib/emoji-utils.ts
import * as emoji from 'node-emoji';

export interface EmojiSearchResult {
  name: string;
  emoji: string;
  key: string;
}

export interface EmojiData {
  name: string;
  emoji: string;
  category: string;
  keywords: string[];
}

export class EmojiManager {
  // Get all available emojis
  static getAllEmojis(): Record<string, string> {

    const result: Record<string, string> = {};
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emojiData = (emoji as any).emoji || emoji;
      if (typeof emojiData === 'object') {
        Object.entries(emojiData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            result[key] = value;
          }
        });
      }
    } catch (error) {
      console.warn('Could not load all emojis:', error);
    }
    
    return result;
  }

  // Get emoji by name
  static getEmoji(name: string): string | undefined {
    return emoji.get(name);
  }

  // Get emoji with fallback
  static getEmojiWithFallback(name: string, fallback: string = '❓'): string {
    return emoji.get(name) || fallback;
  }

  // Search emojis by keyword
  static searchEmojis(keyword: string): EmojiSearchResult[] {
    const results = emoji.search(keyword);
    return results.map(result => ({
      name: result.name,
      emoji: result.emoji,
      key: result.name // Use name as key since result.key does not exist
    }));
  }

  // Check if string contains emojis
  static hasEmoji(text: string): boolean {
    return emoji.has(text);
  }

  // Strip emojis from text
  static stripEmojis(text: string): string {
    return emoji.strip(text);
  }

  // Replace emoji codes with actual emojis
  static emojify(text: string): string {
    return emoji.emojify(text);
  }

  // Replace emojis with their codes
  static unemojify(text: string): string {
    return emoji.unemojify(text);
  }

  // Get random emoji
  static getRandomEmoji(): string {
    const allEmojis = this.getAllEmojis();
    const emojis = Object.values(allEmojis);
    if (emojis.length === 0) {
      // Fallback to some common emojis if getAllEmojis fails
      const fallbackEmojis = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊'];
      const randomIndex = Math.floor(Math.random() * fallbackEmojis.length);
      return fallbackEmojis[randomIndex];
    }
    const randomIndex = Math.floor(Math.random() * emojis.length);
    return emojis[randomIndex];
  }

  // Find emoji by unicode
  static findByUnicode(unicode: string): string | undefined {
    return emoji.find(unicode)?.emoji;
  }

  // Get emoji name by emoji character
  static getEmojiName(emojiChar: string): string | undefined {
    const found = emoji.find(emojiChar);
    return found?.key;
  }

  // Get categorized emojis for Next.js components
  static getCategorizedEmojis(): EmojiData[] {
    const categories: Record<string, string[]> = {
      smileys: ['grinning', 'smiley', 'smile', 'grin', 'laughing', 'joy', 'heart_eyes', 'wink'],
      people: ['wave', 'thumbs_up', 'thumbs_down', 'clap', 'raised_hands', 'pray', 'muscle'],
      nature: ['dog', 'cat', 'tree', 'flower', 'sun', 'moon', 'star', 'fire'],
      food: ['pizza', 'burger', 'coffee', 'cake', 'apple', 'banana', 'beer', 'wine_glass'],
      travel: ['car', 'airplane', 'house', 'hotel', 'beach', 'mountain', 'bike'],
      objects: ['phone', 'computer', 'book', 'money', 'gift', 'camera', 'key'],
      symbols: ['heart', 'yellow_heart', 'blue_heart', 'green_heart', 'purple_heart', 'check', 'x'],
    };

    const result: EmojiData[] = [];
    
    Object.entries(categories).forEach(([category, names]) => {
      names.forEach(name => {
        const emojiChar = emoji.get(name);
        if (emojiChar) {
          result.push({
            name,
            emoji: emojiChar,
            category,
            keywords: [name, category]
          });
        }
      });
    });

    return result;
  }
}