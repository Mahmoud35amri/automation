# OliveSoft RFP — Agent de recherche prospect & génération de proposition

Ce module fait partie du système **Automated RFP Intelligence & Commercial Proposal Generation** développé pour le challenge CSTAM 3.0 (partenaire OliveSoft). Il couvre trois briques du pipeline global : la **recherche de prospect**, la **génération de proposition commerciale** (RAG), et son **export en `.pptx`**.

## Sommaire

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Structure du projet](#structure-du-projet)
- [Endpoints API](#endpoints-api)
- [Comment ça marche](#comment-ça-marche)
- [Contrat d'intégration pour l'équipe détection](#contrat-dintégration-pour-léquipe-détection)
- [Tests manuels](#tests-manuels)
- [Limitations connues](#limitations-connues)

## Vue d'ensemble

Étant donné un appel d'offres (tender) déjà présent en base, ce module :

1. **Recherche qui est le client** (secteur, budget estimé, partenaires) via recherche web + LLM
2. **Trouve les projets et profils OliveSoft les plus pertinents** via une base vectorielle (RAG)
3. **Génère une proposition commerciale structurée**, honnête sur ses propres limites (signale les compétences/rôles non couverts plutôt que de les maquiller)
4. **Exporte cette proposition en `.pptx`** avec une identité visuelle propre

Un seul appel suffit pour enchaîner les étapes 1 à 3 : `POST /api/tenders/{id}/process`.

## Architecture

```
                         ┌─────────────────────────┐
                         │   Tender (PostgreSQL)   │
                         └────────────┬────────────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                                            │
                ▼                                            ▼
   ┌────────────────────────┐                  ┌──────────────────────────┐
   │  Tavily (recherche web) │                  │  Qdrant (RAG)            │
   │  - organisme            │                  │  - projets OliveSoft     │
   │  - marché / budget      │                  │  - profils d'équipe      │
   └────────────┬────────────┘                  └────────────┬─────────────┘
                │                                             │
                ▼                                             ▼
   ┌────────────────────────┐                  ┌──────────────────────────┐
   │  Gemini (synthèse)      │                  │  Gemini (génération JSON) │
   └────────────┬────────────┘                  └────────────┬─────────────┘
                │                                             │
                ▼                                             ▼
   ┌────────────────────────┐                  ┌──────────────────────────┐
   │  Prospect (PostgreSQL)  │─────────────────▶│  Proposal (PostgreSQL)    │
   └────────────────────────┘                  └────────────┬─────────────┘
                                                              │
                                                              ▼
                                                 ┌──────────────────────────┐
                                                 │  Export .pptx             │
                                                 └──────────────────────────┘
```

**Séparation des responsabilités, par choix délibéré :**
- **Le backend FastAPI** (racine du dépôt) stocke tout le relationnel : `tenders`, `prospect_research`, `proposals` — ce module n'a plus de base à lui, il lit et écrit via l'API du backend (`lib/backend.ts`). Le backend appelle ce module via ses webhooks `trigger-research` / `trigger-proposal`
- **Qdrant** stocke uniquement les vecteurs d'embedding du portfolio OliveSoft (projets réels + profils-types), isolé du relationnel car Qdrant ne gère ni jointures ni contraintes
- La **recherche prospect** est un pipeline fixe (Tavily × 2 en parallèle → Gemini), pas une boucle agentique autonome — choix assumé pour la fiabilité et le debug en 48h
- La **génération de proposition** reçoit les scores RAG et compare elle-même les rôles requis à l'équipe proposée, avant de produire un JSON structuré (jamais du texte libre à re-parser)

## Stack technique

| Composant | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js (App Router, API routes) | Cohérent avec le reste de la stack de l'équipe |
| Base relationnelle | Backend FastAPI + PostgreSQL (racine du dépôt) | Source unique de vérité pour tous les modules |
| Base vectorielle | Qdrant (Docker) | Isolation propre entre relationnel et vectoriel |
| Recherche web | Tavily API | Retourne du texte déjà nettoyé, pensé pour être consommé par un LLM |
| LLM | Gemini 3.5 Flash Lite (`@google/genai`) | Gratuit (tier gratuit Google AI Studio), sortie JSON contrainte via `responseSchema` |
| Embeddings | `gemini-embedding-001`, 768 dimensions | Recommandé par Google pour la plupart des cas d'usage RAG |
| Export | `pptxgenjs` | Génère un vrai `.pptx` sans dépendance à PowerPoint installé côté serveur |

## Installation

Le backend FastAPI (racine du dépôt) doit tourner sur `BACKEND_URL` — voir le README racine.

```bash
npm install
docker compose up -d qdrant
```

Indexez le portfolio OliveSoft dans Qdrant (5 projets réels + 5 profils-types, extraits de olivesoft.fr) :

```bash
npx tsx --env-file=.env.local scripts/ingest-knowledge.ts
```

Lancez le serveur :

```bash
npm run dev
```

## Variables d'environnement

Créez un fichier `.env.local` à la racine du projet (jamais commité — voir `.env.example` pour le modèle sans valeurs) :

```
BACKEND_URL=http://localhost:8000/api/v1
PROPOSALS_DIR=proposals
GEMINI_API_KEY=
TAVILY_API_KEY=
```

| Variable | Description | Où l'obtenir |
|---|---|---|
| `BACKEND_URL` | URL de l'API du backend FastAPI (défaut : `http://localhost:8000/api/v1`) | URL où tourne le backend |
| `PROPOSALS_DIR` | Dossier où les `.pptx` générés sont écrits (défaut : `proposals/`). Le backend doit pouvoir le lire : il sert le fichier via `GET /proposals/{id}/download` | Aucune action requise en local |
| `GEMINI_API_KEY` | Clé pour les appels de synthèse et d'embedding | Gratuit sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey), aucune carte bancaire requise |
| `TAVILY_API_KEY` | Clé pour la recherche web | Gratuit sur [tavily.com](https://tavily.com), 1000 requêtes/mois, aucune carte bancaire requise |

## Structure du projet

```
app/
└── api/
    ├── tenders/
    │   └── [id]/
    │       └── process/
    │           └── route.ts        # orchestration : prospect + génération en un appel
    ├── prospects/
    │   └── research/
    │       └── route.ts            # Tavily + Gemini → profil prospect
    ├── proposals/
    │   └── generate/
    │       └── route.ts            # RAG + Gemini → proposition structurée (JSON) + .pptx
    └── rag/
        └── search/
            └── route.ts            # recherche vectorielle exposée en API

lib/
├── backend.ts                      # client de l'API du backend FastAPI (tenders, recherches, propositions)
├── pptx.ts                         # proposition → fichier .pptx
├── qdrant.ts                       # client Qdrant
├── rag.ts                          # logique d'embedding + recherche, partagée entre routes
└── ingestTender.ts                 # titre/description reconstruits depuis l'extraction NLP du tender

scripts/
└── ingest-knowledge.ts             # indexe le portfolio OliveSoft (projets + CV) dans Qdrant

docker-compose.yml                  # services PostgreSQL + Qdrant
.env.example                        # modèle des variables d'environnement (sans valeurs)
```


## Endpoints API

### `POST /api/prospects/research`
```json
{ "tender_id": 1 }
```
Cible du webhook `N8N_RESEARCH_WEBHOOK_URL` du backend (`POST /api/v1/tenders/{id}/trigger-research`). Recherche le client (secteur, budget estimé, partenaires) via Tavily + Gemini et l'enregistre via `POST /api/v1/tenders/{id}/research` (le tender passe à `RESEARCHED`). **Trace son input (tender) et son output (profil prospect) dans les logs serveur** à chaque exécution.

**Réponse** : la recherche enregistrée par le backend (`sector`, `estimated_revenue`, `key_partners`).

### `POST /api/proposals/generate`
```json
{ "tender_id": 1 }
```
Cible du webhook `N8N_PROPOSAL_WEBHOOK_URL` du backend (`POST /api/v1/tenders/{id}/trigger-proposal`). Récupère le prospect depuis le backend, interroge le RAG (3 projets + 3 profils les plus pertinents), génère une proposition structurée et l'enregistre via `POST /api/v1/tenders/{id}/generate-proposal` (le tender passe à `PROPOSAL_READY`). Le `.pptx` est écrit dans `PROPOSALS_DIR` et son chemin enregistré dans `file_path_pptx`.

**Réponse** : la proposition enregistrée par le backend, `content_json` étant un JSON structuré (sections + items avec scores de pertinence).

### `GET /api/v1/proposals/{id}/download` (backend)
Retourne le fichier `.pptx` de la proposition.

### `POST /api/tenders/{id}/process`
Enchaîne `prospects/research` puis `proposals/generate` en un seul appel. Renvoie `prospect_id`, `proposal_id`, `proposal_version`, `export_url`.

### `POST /api/rag/search`
```json
{ "query": "texte libre", "top_k": 3, "asset_type": "project" | "cv" }
```
Expose directement la recherche vectorielle, utile pour déboguer les scores de pertinence indépendamment de la génération.

## Comment ça marche

### 1. Recherche prospect (pipeline fixe, pas d'agent autonome)
Volontairement **déterministe** plutôt qu'une boucle agentique libre : deux recherches Tavily en parallèle (organisme + marché) → une synthèse Gemini avec `responseSchema` forcé. Ce choix privilégie la fiabilité et la facilité de debug sur l'autonomie complète.

Le prompt contient des règles strictes apprises par itération sur de vrais échecs observés :
- `estimated_revenue` : distingue explicitement le budget du projet précis du budget sectoriel/national (sinon confusion fréquente, ex: 5 milliards TND au lieu de 600 000)
- `key_partners` : défini comme des organisations, jamais des technologies (sinon confusion avec `required_technologies`)

Chaque exécution affiche dans les logs serveur un bloc `📥 INPUT` (tender lu) et `📤 OUTPUT` (profil prospect généré) — utile pour la relecture/notation, pas seulement pour le debug.

### 2. RAG (Qdrant)
Le portfolio OliveSoft (5 vrais projets extraits de olivesoft.fr + 5 profils-types génériques, sans noms réels) est indexé en deux catégories (`asset_type: "project" | "cv"`), recherchées séparément pour garantir un mélange équilibré de références et de profils dans chaque proposition.

Les embeddings utilisent `taskType: "RETRIEVAL_DOCUMENT"` à l'indexation et `"RETRIEVAL_QUERY"` à la recherche (modèle asymétrique), avec normalisation manuelle des vecteurs (requise pour toute dimension ≠ 3072).

### 3. Génération de proposition
Gemini reçoit les scores de pertinence RAG et la liste des rôles explicitement requis par le tender, avec instruction de :
- Nuancer son langage si un score est faible (`< 0.55`) plutôt que de survendre
- Comparer les rôles requis à l'équipe proposée et signaler tout rôle non couvert dans une section "Écarts identifiés"

La sortie est un **JSON structuré**, pas du texte libre à re-parser — les titres et scores des références/profils sont injectés directement depuis les résultats Qdrant, jamais reconstruits depuis le texte généré (leçon apprise après plusieurs bugs de parsing dus aux variations de formatage du LLM).

### 4. Export PPTX
Chaque référence/profil d'équipe obtient sa propre slide (plutôt que d'essayer de faire tenir un nombre variable d'items dans une hauteur fixe). Lecture directe du JSON structuré, aucun regex.

## Fiabilité et validation

Deux mécanismes protègent le pipeline contre les pannes transitoires et les sorties LLM malformées :

- **`lib/withRetry.ts`** : chaque appel Tavily, Gemini ou Qdrant est tenté jusqu'à 3 fois avec un délai croissant entre les tentatives. Utile en particulier pour les erreurs `503` (modèle temporairement surchargé), déjà rencontrées en conditions réelles.
- **`lib/schemas.ts`** : chaque sortie JSON de Gemini est validée avec `zod` (`ProspectProfileSchema`, `ProposalLLMOutputSchema`) avant d'être utilisée. Le `responseSchema` de l'API Gemini force déjà la forme générale, mais la validation zod attrape les cas limites (nombre négatif, chaîne vide) et échoue avec un message précis plutôt que de laisser une donnée invalide se propager jusqu'en base ou dans le PPTX.

## Contrat d'intégration pour l'équipe détection

Les tenders sont créés dans le backend : `POST /api/v1/tenders/from-nlp` (sortie de `nlp/main.py --backend`) ou `POST /api/v1/tenders/` (scraper `--backend`). L'extraction NLP est conservée dans `nlp_metadata`, qui contient au minimum :

```json
{
  "title": "string",
  "client_name": "string",
  "client_sector": "string",
  "deadline": "YYYY-MM-DD",
  "project_type": ["string"],
  "required_technologies": ["string"],
  "required_roles": [{ "title": "string", "count": 0 }],
  "requirements": [{ "text": "string", "mandatory": true }]
}
```

Le titre, la description, le secteur et les rôles utilisés par ce module en sont reconstruits (`lib/backend.ts`, `lib/ingestTender.ts`).

## Tests manuels

```bash
# 1. Créer un tender dans le backend (JSON de test dans result.json, result2.json, etc.)
curl -X POST http://localhost:8000/api/v1/tenders/from-nlp \
  -H "Content-Type: application/json" -d @result.json

# 2. Lancer le pipeline complet (ou via le backend : POST /api/v1/tenders/{id}/trigger-research puis trigger-proposal)
curl -X POST http://localhost:3000/api/tenders/{tender_id}/process

# 3. Télécharger la proposition
curl http://localhost:8000/api/v1/proposals/{proposal_id}/download -o proposition.pptx
```

## Tenders réels testés

| Client | Source | Alignement avec OliveSoft |
|---|---|---|
| Ministère des Technologies de la Communication (Tunisie) — identité numérique citoyen | TUNEPS | Faible (dev mobile pur) |
| SOMELEC (Mauritanie) — Business Intelligence | Appel d'offres public réel | Fort |
| INSERM — plateforme de collecte de données pour cohortes | TED (avis n°521069-2026) | Modéré (data platform, sans CRM/BI explicite) |
| IEDOM — expertise DATAVIZ (Power BI / Superset) | TED (avis n°602600-2026) | Très fort (technologies identiques au portfolio) |

Le système a été testé aussi bien sur des cas bien alignés que volontairement mal alignés (banque/cloud-DevOps, fictif) pour valider le comportement d'honnêteté (section "Écarts identifiés").

## Limitations connues

- Le pipeline de recherche est un enchaînement fixe, pas un agent qui décide dynamiquement de ses recherches — choix assumé pour la fiabilité en 48h
- `estimated_revenue` reste une estimation par fourchette de complexité en l'absence de chiffre explicite trouvé sur le web — jamais garanti exact
- Le portfolio OliveSoft indexé dans Qdrant est un jeu de données fixe (5+5) — pas encore de route d'ajout dynamique de nouveaux projets/CV
- Aucune authentification sur les routes API à ce stade (hors scope hackathon)
- Le retry automatique (`withRetry`) ne distingue pas les erreurs transitoires (503, timeout) des erreurs permanentes (404, clé API invalide) — il retente dans les deux cas, ce qui ralentit inutilement l'échec pour une erreur permanente
