export type ProposalSection = { number: number; title: string; body: string };
export type ProposalItem = { heading: string; text: string };

export function parseProposalSections(content: string): ProposalSection[] {
  const cleaned = content.replace(/^#{1,6}\s*/gm, "");
  const parts = cleaned.split(/^(\d+)\.\s*(.+)$/m).slice(1);
  const sections: ProposalSection[] = [];

  for (let i = 0; i < parts.length; i += 3) {
    sections.push({
      number: parseInt(parts[i], 10),
      title: parts[i + 1].trim(),
      body: parts[i + 2].trim(),
    });
  }

  return sections;
}

export function parseItems(body: string): ProposalItem[] {
  const normalized = body.replace(/\r/g, "").trim();

  // Sépare avant chaque nouvel item, que le format soit :
  // - une ligne vide entre les items ("**Titre**\ntexte\n\n**Titre2**\ntexte2")
  // - OU un simple saut de ligne avec un tiret ("texte\n- **Titre2**...")
  const rawItems = normalized
    .split(/\n{2,}|\n+\s*[-*•]+\s+(?=\*\*)/)
    .map((b) => b.replace(/^[\s]*[-*•]+\s*/, "").trim())
    .filter(Boolean);

  return rawItems.map((block) => {
    const boldMatch = block.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      const heading = boldMatch[1].replace(/\*/g, "").trim();
      let rest = block.slice(boldMatch[0].length).trim();
      rest = rest.replace(/^\([^)]*\)\s*/, "");
      rest = rest.replace(/^:\s*/, "");
      return { heading, text: rest.replace(/\*/g, "").trim() };
    }

    const plainMatch = block.match(/^([^\n:]{3,80}?)\s*:\s*([\s\S]+)$/);
    if (plainMatch) {
      return {
        heading: plainMatch[1].replace(/\*/g, "").trim(),
        text: plainMatch[2].replace(/\*/g, "").trim(),
      };
    }

    return { heading: "", text: block.replace(/\*/g, "").trim() };
  });
}