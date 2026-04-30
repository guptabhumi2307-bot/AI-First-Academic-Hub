/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility for rotating through multiple Gemini API keys to handle rate limits.
 */
class KeyRotator {
  private keys: string[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.initializeKeys();
  }

  private isValidKey(key: string | undefined): boolean {
    if (!key) return false;
    // Basic filter for placeholders often used in .env.example
    const placeholders = [
      "MY_GEMINI_API_KEY",
      "SECOND_API_KEY",
      "THIRD_API_KEY",
      "FOURTH_API_KEY",
      "FIFTH_API_KEY",
      "SIXTH_API_KEY",
      "SEVENTH_API_KEY",
      "EIGHTH_API_KEY",
      "NINTH_API_KEY",
      "TENTH_API_KEY",
      "ELEVENTH_API_KEY",
      "YOUR_API_KEY",
      "INSERT_KEY_HERE"
    ];
    return !placeholders.includes(key.trim()) && key.trim().length > 10;
  }

  private initializeKeys() {
    const keysFromEnv: string[] = [];
    
    // Explicitly check keys so Vite's 'define' can replace them
    const potentialKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
      process.env.GEMINI_API_KEY_4,
      process.env.GEMINI_API_KEY_5,
      process.env.GEMINI_API_KEY_6,
      process.env.GEMINI_API_KEY_7,
      process.env.GEMINI_API_KEY_8,
      process.env.GEMINI_API_KEY_9,
      process.env.GEMINI_API_KEY_10,
    ];

    potentialKeys.forEach((k) => {
      if (this.isValidKey(k) && !keysFromEnv.includes(k!)) {
        keysFromEnv.push(k!);
      }
    });

    this.keys = keysFromEnv;
    console.log(`[Neural Key Management] Initialized with ${this.keys.length} valid neural nodes.`);
  }

  /**
   * Returns the next API key in the rotation, optionally skipping known exhausted ones.
   */
  public getNextKey(): string {
    if (this.keys.length === 0) {
      console.warn("[Neural Warning] No API keys detected in environment.");
      return "";
    }

    // Simple round robin for now, but server.ts will handle retries
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  /**
   * Returns the number of available keys.
   */
  public getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Returns all available keys.
   */
  public getAllKeys(): string[] {
    return [...this.keys];
  }

  /**
   * Check if any keys are available.
   */
  public hasKeys(): boolean {
    return this.keys.length > 0;
  }
}

export const neuralKeyManager = new KeyRotator();
