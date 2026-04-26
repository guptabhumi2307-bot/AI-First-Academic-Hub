/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function initAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please add it to your environment variables.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
}

export function getGenAI() {
  initAI();
  if (!ai) throw new Error("AI not initialized");
  return ai;
}

// Keeping this for compatibility but updating it to use the new pattern
export function getGeminiModel(config?: { model?: string }) {
  const genAI = getGenAI();
  const modelName = config?.model || "gemini-3-flash-preview";
  
  return {
    generateContent: async (params: { contents: any; generationConfig?: any; config?: any }) => {
      // The skill says ai.models.generateContent takes model name inside params
      return genAI.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.generationConfig || params.config
      });
    }
  };
}
