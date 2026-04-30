/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { neuralKeyManager } from "./keyRotation";

class ProxiedModel {
  constructor(private modelName: string) {}
  
  async generateContent(params: any): Promise<any> {
    const body = typeof params === "string" 
      ? { model: this.modelName, prompt: params }
      : { 
          model: params.model || this.modelName, 
          contents: params.contents || params,
          config: params.generationConfig || params.config 
        };

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Neural link offline");
    }
    
    const data = await response.json();
    return { 
      text: data.text,
      response: { 
        text: () => data.text,
        candidates: data.fullResponse?.candidates // For compatibility with standard SDK usage
      },
      candidates: data.fullResponse?.candidates, // Mirroring for simpler access
      audioData: data.audioData
    };
  }
}

class ProxiedGenAI {
  getGenerativeModel(config: { model: string }) {
    return new ProxiedModel(config.model);
  }

  get models() {
    return {
      generateContent: async (params: any) => {
        const model = new ProxiedModel(params.model);
        return model.generateContent(params);
      }
    };
  }
}

export function getGenAI(): any {
  return new ProxiedGenAI();
}

export function getGeminiModel(config?: { model?: string }) {
  const modelName = config?.model || "gemini-3-flash-preview";
  return new ProxiedModel(modelName);
}
