import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { buildTitle, buildDescription } from "@/lib/ingestTender";

export async function POST(req: NextRequest) {
  const payload = await req.json();

  const title = buildTitle(payload);
  const raw_description = buildDescription(payload);
  const sector = payload.client_sector ?? null;
  const deadline = payload.deadline ?? null;
  const reference = payload.reference ?? null;
  const source_url = payload.source_url ?? null;

  // Validation propre à NOTRE système — indépendante du "missing_fields"
  // que l'agent de détection a pu remonter de son côté (ex: budget manquant
  // ne nous bloque pas, on n'a pas de colonne budget obligatoire)
  const hasEnoughContent = raw_description.length > 20;
  const lowConfidence = typeof payload.confidence === "number" && payload.confidence < 0.6;
  const status = hasEnoughContent && !lowConfidence ? "detected" : "incomplete";

  const inserted = await pool.query(
    `insert into tenders (reference, title, raw_description, sector, deadline, source_url, status, raw_payload)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [reference, title, raw_description, sector, deadline, source_url, status, JSON.stringify(payload)]
  );

  return NextResponse.json(inserted.rows[0]);
}