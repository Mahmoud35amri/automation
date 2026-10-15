import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

async function callInternal(path: string, body: object) {
  const res = await fetch(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw { step: path, status: res.status, ...data };
  }
  return data;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: tender_id } = await params;

  const tenderCheck = await pool.query("select id from tenders where id = $1", [tender_id]);
  if (!tenderCheck.rows.length) {
    return NextResponse.json({ error: "tender not found" }, { status: 404 });
  }

  const steps: {
    prospect?: { id: string };
    proposal?: { id: string; status: string };
  } = {};

  try {
    steps.prospect = await callInternal("/api/prospects/research", { tender_id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Pipeline arrêté à l'étape recherche prospect", detail: err, steps },
      { status: 502 }
    );
  }

  try {
    steps.proposal = await callInternal("/api/proposals/generate", { tender_id });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Pipeline arrêté à l'étape génération", detail: err, steps },
      { status: 502 }
    );
  }

  return NextResponse.json({
    tender_id,
    prospect_id: steps.prospect!.id,
    proposal_id: steps.proposal!.id,
    proposal_status: steps.proposal!.status,
    export_url: `/api/proposals/${steps.proposal!.id}/export`,
  });
}