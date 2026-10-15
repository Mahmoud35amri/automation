import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import pool from "@/lib/db";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function tavilySearch(query: string): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 4,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`Tavily a répondu ${res.status} pour la requête "${query}"`);
  }

  const data: { results: Array<{ title: string; content: string }> } = await res.json();
  return data.results.map((r) => `${r.title}: ${r.content}`).join("\n");
}

export async function POST(req: NextRequest) {
  const { tender_id } = await req.json();

  const { rows } = await pool.query(
    "select title, raw_description, sector from tenders where id = $1",
    [tender_id]
  );
  if (!rows.length) {
    return NextResponse.json({ error: "tender not found" }, { status: 404 });
  }
  const tender = rows[0];

  await pool.query("update tenders set status = 'researching', updated_at = now() where id = $1", [
    tender_id,
  ]);

  let generalCtx: string, marketCtx: string;
  try {
    [generalCtx, marketCtx] = await Promise.all([
      tavilySearch(`${tender.title} organisme secteur Tunisie`),
      tavilySearch(`${tender.sector} budget digitalisation appel d'offres Tunisie estimation`),
    ]);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Échec de la recherche web (Tavily)",
        detail: err instanceof Error ? err.message : String(err),
        tender_id,
      },
      { status: 502 }
    );
  }

  let profile: { sector: string; estimated_revenue: number; key_partners: string[]; estimation_basis: string };
  try {
    const synthesis = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: `Tu es un analyste commercial pour une ESN (entreprise de services numériques) qui répond à des appels d'offres en Tunisie.

Tender: ${tender.title}
Description: ${tender.raw_description}

Recherche générale sur l'organisme:
${generalCtx}

Recherche marché/budget (secteur, PAS ce tender précis):
${marketCtx}

Consignes STRICTES pour key_partners :
- Un "partenaire clé" est une ORGANISATION ou ENTITÉ liée au client (ex: organisme de tutelle, bailleur de fonds, ministère partenaire, filiale, co-contractant).
- Ce ne sont JAMAIS des technologies, langages, frameworks ou outils (AWS, Azure, Docker, Kubernetes, etc. ne sont PAS des partenaires — ce sont des exigences techniques du projet, à ignorer pour ce champ).
- Si aucune vraie organisation partenaire n'est trouvée dans les recherches, renvoie un tableau vide plutôt que d'inventer ou de recycler des technologies.

Consignes STRICTES pour estimated_revenue (en TND) :

1. Cherche d'abord un chiffre EXPLICITE et attribué à CE tender précis (ex: "budget alloué de X TND pour ce projet", "montant de l'appel d'offres : X"). S'il existe dans les recherches ci-dessus, utilise-le tel quel, même s'il sort des fourchettes ci-dessous.

2. Si aucun chiffre explicite n'est attribué à ce tender précis, classe le projet dans UNE de ces trois catégories selon sa description, et choisis un montant au milieu de la fourchette correspondante :
   - Simple (une seule fonctionnalité, un seul type d'utilisateur, pas d'intégration externe) : 50 000 - 150 000 TND
   - Moyen (plusieurs modules, une intégration avec un système existant) : 150 000 - 400 000 TND
   - Complexe (intégration avec plusieurs organismes/systèmes, identité/sécurité, échelle nationale) : 400 000 - 800 000 TND

3. Ne dépasse JAMAIS 800 000 TND sauf si l'étape 1 a trouvé un chiffre explicite pour ce tender précis. Un chiffre en millions ou milliards trouvé dans la recherche marché décrit presque toujours un budget sectoriel/national global, pas ce projet — ignore-le pour l'estimation, tu peux seulement t'en servir pour juger du niveau de complexité.

4. Dans estimation_basis, explique en une phrase courte laquelle des règles 1/2/3 tu as appliquée et pourquoi.

Synthétise le profil prospect structuré.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            sector: { type: "string" },
            estimated_revenue: { type: "number" },
            key_partners: { type: "array", items: { type: "string" } },
            estimation_basis: { type: "string" },
          },
          required: ["sector", "estimated_revenue", "key_partners", "estimation_basis"],
        },
      },
    });

    profile = JSON.parse(synthesis.text!);
    console.log("Justification du budget:", profile.estimation_basis);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: "Échec de la synthèse LLM (Gemini)",
        detail: err instanceof Error ? err.message : String(err),
        tender_id,
      },
      { status: 502 }
    );
  }

  const inserted = await pool.query(
    `insert into prospects (tender_id, sector, estimated_revenue, key_partners)
     values ($1, $2, $3, $4)
     returning *`,
    [tender_id, profile.sector, profile.estimated_revenue, JSON.stringify(profile.key_partners)]
  );

  return NextResponse.json(inserted.rows[0]);
}