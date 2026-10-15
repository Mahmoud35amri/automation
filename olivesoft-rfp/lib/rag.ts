import { GoogleGenAI } from "@google/genai";
import qdrant from "./qdrant";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

export type KnowledgeMatch = {
  relevance_score: number;
  asset_type: "project" | "cv";
  title: string;
  sector: string;
  tags: string[];
  tech_stack: string[];
  description: string;
};

async function embedQuery(query: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: query,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 768 },
  });
  return normalize(response.embeddings![0].values!);
}

export async function searchKnowledge(
  query: string,
  top_k = 3,
  assetType?: "project" | "cv"
): Promise<KnowledgeMatch[]> {
  const vector = await embedQuery(query);

  const { points } = await qdrant.query("knowledge_assets", {
    query: vector,
    limit: top_k,
    with_payload: true,
    filter: assetType
      ? { must: [{ key: "asset_type", match: { value: assetType } }] }
      : undefined,
  });

  return points.map((r) => ({
    relevance_score: r.score,
    ...(r.payload as Omit<KnowledgeMatch, "relevance_score">),
  }));
}