import { GoogleGenAI } from "@google/genai";

let genaiInstance: GoogleGenAI | null = null;

export const getGeminiClient = (): GoogleGenAI => {
  if (!genaiInstance) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not set");
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
};

export const GEMINI_MODEL = "gemini-2.5-flash";
