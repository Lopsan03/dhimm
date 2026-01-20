
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getSmartSearchSuggestions(query: string, products: Product[]) {
  if (!query) return [];

  try {
    const productListString = products.map(p => `${p.name} (${p.brand})`).join(", ");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Dado el catálogo de autopartes: ${productListString}. 
      El usuario busca: "${query}". 
      Identifica las 3 partes más relevantes o marcas que el usuario podría estar buscando. 
      Responde solo con un arreglo JSON de strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
}
