
import { GoogleGenAI, Type } from "@google/genai";
import { DifferenceLocation } from "../types";

export class GeminiService {
  /**
   * Orchestrates the game generation with a verification step to ensure 
   * consistency between visuals and logic.
   */
  async generateGameData(imageBase64: string): Promise<{ modifiedImage: string | null, differences: DifferenceLocation[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Clean base64 string
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    
    // Step 1: Plan 1-3 distinct differences
    const numToPlan = Math.floor(Math.random() * 3) + 1; 

    const planResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        },
        {
          text: `Plan exactly ${numToPlan} OBVIOUS and HIGH-CONTRAST visual differences for a "find the difference" game. 
          
          SPATIAL CONSTRAINTS:
          - Differences MUST be spread out across the image.
          - MINIMUM DISTANCE: Every difference must be at least 30% away from every other difference.
          - PADDING: Stay at least 10% away from all edges of the image.
          - Focus on separate quadrants of the image.

          DIFFERENCE TYPES:
          - Dramatic color swaps (e.g. Red to Cyan).
          - Adding a recognizable object.
          - Removing a significant detail.
          
          Return JSON array of {description, x, y} where x,y are percentages (0-100).`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER }
            },
            required: ['description', 'x', 'y']
          }
        }
      }
    });

    const plannedDiffs = JSON.parse(planResponse.text || "[]");
    const editInstructions = plannedDiffs.map((d: any) => `- ${d.description} at (${d.x}%, ${d.y}%)`).join('\n');
    
    // Step 2: Apply the differences
    const editResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          },
          {
            text: `Modify this image by applying these EXACTLY ${plannedDiffs.length} differences. 
            Do NOT add anything else. Keep the rest of the image identical.
            Ensure the changes are bold and easy to see.
            DIFFERENCES:
            ${editInstructions}`
          }
        ]
      }
    });

    let modifiedImageBase64: string | null = null;
    if (editResponse.candidates?.[0]?.content?.parts) {
      for (const part of editResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          modifiedImageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!modifiedImageBase64) {
      return { modifiedImage: null, differences: [] };
    }

    // Step 3: VERIFICATION
    const verifyResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          text: `I have an original image and a modified version. Identify EVERY distinct visual difference between them. 
          
          RULES:
          - Provide the center coordinates (x, y) in percentages for each difference.
          - If two visual changes are extremely close (within 15% of each other), treat them as ONE single logical difference.
          - Return only the truly distinct differences found.`
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64Data
          }
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: modifiedImageBase64
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER }
            },
            required: ['description', 'x', 'y']
          }
        }
      }
    });

    const verifiedDiffs = JSON.parse(verifyResponse.text || "[]");
    
    // Map verified diffs to our game format
    const finalDifferences: DifferenceLocation[] = verifiedDiffs.map((d: any, idx: number) => ({
      id: `verified-diff-${idx}`,
      x: d.x,
      y: d.y,
      description: d.description,
      found: false
    }));

    return { 
      modifiedImage: `data:image/png;base64,${modifiedImageBase64}`, 
      differences: finalDifferences 
    };
  }
}
