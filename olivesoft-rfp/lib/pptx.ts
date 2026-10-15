import { NextRequest, NextResponse } from "next/server";
import pptxgen from "pptxgenjs";
import pool from "@/lib/db";

const NAVY = "1C1F27";
const AMBER = "D9A548";
const INK = "3D3D3A";
const MUTED = "8D919B";

type Pptx = InstanceType<typeof pptxgen>;
type Slide = ReturnType<Pptx["addSlide"]>;

function addHeaderFooter(slide: Slide, pptx: Pptx, sectionLabel: string, pageNumber: number) {
  slide.background = { color: "FFFFFF" };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: AMBER } });
  slide.addText(sectionLabel, {
    x: 0.5, y: 0.15, w: 9, h: 0.3, fontSize: 10, color: MUTED, charSpacing: 1,
  });
  slide.addText(`OliveSoft  ·  ${pageNumber}`, {
    x: 0.5, y: 5.35, w: 9, h: 0.25, fontSize: 9, color: MUTED, align: "right",
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { rows } = await pool.query(
    `select p.content, t.title as tender_title
     from proposals p join tenders t on t.id = p.tender_id
     where p.id = $1`,
    [id]
  );

  if (!rows.length) {
    return NextResponse.json({ error: "proposal not found" }, { status: 404 });
  }

  const { content, tender_title } = rows[0];
  const { sections } = JSON.parse(content) as {
    sections: { number: number; title: string; body?: string; items?: { heading: string; text: string }[] }[];
  };

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "OLIVESOFT", width: 10, height: 5.63 });
  pptx.layout = "OLIVESOFT";

  const title = pptx.addSlide();
  title.background = { color: NAVY };
  title.addShape(pptx.ShapeType.rect, { x: 0, y: 4.9, w: 10, h: 0.08, fill: { color: AMBER } });
  title.addText("OliveSoft", { x: 0.6, y: 1.9, fontSize: 34, bold: true, color: "FFFFFF" });
  title.addText("Proposition commerciale", { x: 0.6, y: 2.55, fontSize: 14, color: AMBER, charSpacing: 1 });
  title.addText(tender_title, { x: 0.6, y: 3.05, w: 8.8, fontSize: 16, color: "D6D5CE" });

  let page = 2;
  for (const section of sections) {
    if (section.items) {
      section.items.forEach((item, i) => {
        const slide = pptx.addSlide();
        addHeaderFooter(slide, pptx, `Section ${section.number} · ${i + 1}/${section.items!.length}`, page++);

        slide.addText(section.title, { x: 0.5, y: 0.55, w: 9, fontSize: 20, bold: true, color: NAVY });
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.0, w: 0.6, h: 0.035, fill: { color: AMBER } });

        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.15, w: 0.06, h: 3.7, fill: { color: AMBER } });
        slide.addText(item.heading, { x: 0.75, y: 1.2, w: 8.6, fontSize: 16, bold: true, color: NAVY });
        slide.addText(item.text, {
          x: 0.75, y: 1.7, w: 8.6, h: 3.1, fontSize: 13, color: INK,
          valign: "top", fit: "shrink", lineSpacing: 18,
        });
      });
    } else {
      const slide = pptx.addSlide();
      addHeaderFooter(slide, pptx, `Section ${section.number}`, page++);

      slide.addText(section.title, { x: 0.5, y: 0.55, w: 9, fontSize: 22, bold: true, color: NAVY });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.05, w: 0.6, h: 0.035, fill: { color: AMBER } });

      slide.addText(section.body ?? "", {
        x: 0.5, y: 1.35, w: 9, h: 3.6, fontSize: 13, color: INK, valign: "top", lineSpacing: 20,
      });
    }
  }

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="proposition-${id}.pptx"`,
    },
  });
}