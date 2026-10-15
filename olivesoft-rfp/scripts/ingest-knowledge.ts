import { GoogleGenAI } from "@google/genai";
import qdrant from "../lib/qdrant";
import { randomUUID } from "crypto";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const projects = [
  {
    asset_type: "project",
    title: "Plateforme CRM Fashion unifiée",
    sector: "Mode / Retail",
    tags: ["CRM", "Data Integration", "Data Quality", "Power BI"],
    tech_stack: ["Google Cloud Platform", "Power BI"],
    description:
      "Reconstruction d'une Customer Data Platform fragmentée en un CRM unifié pour une marque de mode : nettoyage et standardisation de données multi-sources, logique de dédoublonnage assignant des identifiants CRM stables, profils client 360° enrichis, harmonisation de plus de 3 millions d'adresses, refonte du reporting Power BI.",
  },
  {
    asset_type: "project",
    title: "CRM centralisé Retail & E-commerce",
    sector: "Retail / E-commerce",
    tags: ["CRM", "Data Integration", "BigQuery", "Segmentation", "BI"],
    tech_stack: ["Google Cloud Platform", "BigQuery", "Cegid ERP", "Power BI"],
    description:
      "Construction d'un CRM centralisé sur GCP/BigQuery unifiant les données ERP (Cegid), e-commerce, marketing et support via des pipelines automatisés quotidiens. Logique de segmentation client (valeur, engagement, fréquence) et dashboards Power BI pour le suivi des ventes et du marketing en temps réel.",
  },
  {
    asset_type: "project",
    title: "Prévisions IA & dashboards de pilotage",
    sector: "Retail / Supply Chain / Manufacturing",
    tags: ["AI Development", "Forecasting", "Data Platform", "BI"],
    tech_stack: ["Sage X3 ERP", "Google Cloud Storage", "Dataform", "BigQuery", "Power BI"],
    description:
      "Centralisation de systèmes fragmentés (ERP Sage X3 vers Google Cloud Storage), pipelines de données Dataform, analytique via BigQuery, et modèles de prévision de séries temporelles pour la demande et les approvisionnements. Objectifs : taux de service supply chain de 20% à 60%, -20% de coûts d'approvisionnement, -15% de coûts de stockage. Livré via des dashboards Power BI.",
  },
  {
    asset_type: "project",
    title: "Solution RH internationale unifiée",
    sector: "RH / Multi-pays",
    tags: ["Salesforce Ecosystem", "MuleSoft", "Intégration", "HRIS"],
    tech_stack: ["SAP SuccessFactors", "Talent Connect", "MuleSoft", "CI/CD"],
    description:
      "Système d'information RH centralisé à l'international intégrant SAP SuccessFactors, Talent Connect et des systèmes de paie locaux via plus de 15 applications MuleSoft pour une synchronisation bidirectionnelle en temps réel. Cycle complet Build+Run : pipeline CI/CD, processus de release structuré, et gestion opérationnelle continue assurée par OliveSoft après le lancement.",
  },
  {
    asset_type: "project",
    title: "PoC détection de contrefaçons et marché gris",
    sector: "Luxe / Retail / R&D IA",
    tags: ["AI Development", "Computer Vision", "Vector Search", "Human-in-the-loop"],
    tech_stack: ["CoAtNet", "FAISS", "similarité cosinus"],
    description:
      "Preuve de concept pour la détection automatisée d'annonces contrefaites sur des plateformes de revente et réseaux sociaux via des embeddings visuels (CoAtNet) indexés dans FAISS. Combine signaux visuels et textuels, inclut une étape de validation humaine, avec une trajectoire vers des agents de crawling temps réel et la conformité réglementaire (DSA, AI Act).",
  },
];

const team = [
  {
    asset_type: "cv",
    title: "Lead Data Engineer",
    sector: "Data Integration",
    tags: ["ETL", "Migration de données", "GCP", "BigQuery"],
    tech_stack: ["Google Cloud Platform", "BigQuery", "Dataform", "SQL"],
    description:
      "8 ans d'expérience en ingénierie de données. Spécialisé dans la conception de pipelines ETL et la migration de systèmes legacy (Cobol, mainframes) vers des bases de données relationnelles modernes. A piloté la centralisation de données pour plusieurs clients retail et énergie.",
  },
  {
    asset_type: "cv",
    title: "Consultante BI",
    sector: "Business Intelligence",
    tags: ["Power BI", "Modélisation de données", "Dashboards", "KPI"],
    tech_stack: ["Power BI", "SQL", "DAX"],
    description:
      "6 ans d'expérience en conception de tableaux de bord et modélisation de données décisionnelles. Spécialisée dans la traduction de besoins métier (indicateurs de performance, suivi opérationnel) en dashboards Power BI exploitables par des équipes non techniques.",
  },
  {
    asset_type: "cv",
    title: "Ingénieur IA / Machine Learning",
    sector: "AI Development",
    tags: ["Prévision", "Séries temporelles", "Computer Vision"],
    tech_stack: ["Python", "TensorFlow", "FAISS", "modèles de vision (CoAtNet)"],
    description:
      "5 ans d'expérience en développement de modèles IA appliqués : prévision de séries temporelles pour la supply chain, systèmes de recherche vectorielle et vision par ordinateur pour la détection d'anomalies visuelles.",
  },
  {
    asset_type: "cv",
    title: "Intégrateur Salesforce / MuleSoft",
    sector: "Salesforce Ecosystem",
    tags: ["MuleSoft", "APIs", "Intégration système", "CI/CD"],
    tech_stack: ["Salesforce", "MuleSoft", "REST/SOAP APIs"],
    description:
      "7 ans d'expérience en intégration de systèmes d'entreprise via MuleSoft et l'écosystème Salesforce. A conçu des architectures d'intégration multi-applications avec synchronisation bidirectionnelle en temps réel pour des clients internationaux.",
  },
  {
    asset_type: "cv",
    title: "Chef de projet / Product Owner",
    sector: "Gestion de projet",
    tags: ["Pilotage Build+Run", "Agile", "Secteur public"],
    tech_stack: ["Jira", "Confluence", "méthodologie Agile/Scrum"],
    description:
      "10 ans d'expérience en pilotage de projets data/IT, dont plusieurs missions pour des clients du secteur public et parapublic. Expérience de la gestion de projets financés par des bailleurs internationaux (Banque Mondiale, BAD), incluant reporting et conformité aux procédures de passation de marché.",
  },
];

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map((v) => v / magnitude);
}

async function embedAndUpsert(items: typeof projects) {
  for (const item of items) {
    const text = `${item.title}\nSecteur: ${item.sector}\nTags: ${item.tags.join(", ")}\nStack: ${item.tech_stack.join(", ")}\n${item.description}`;

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 },
    });

    const vector = normalize(response.embeddings![0].values!);

    await qdrant.upsert("knowledge_assets", {
      points: [{ id: randomUUID(), vector, payload: item }],
    });

    console.log(`Indexé [${item.asset_type}] : ${item.title}`);
  }
}

async function main() {
  await qdrant.deleteCollection("knowledge_assets").catch(() => {});
  await qdrant.createCollection("knowledge_assets", {
    vectors: { size: 768, distance: "Cosine" },
  });

  await embedAndUpsert(projects);
  await embedAndUpsert(team);

  console.log("Ingestion terminée : 5 projets + 5 profils.");
}

main();