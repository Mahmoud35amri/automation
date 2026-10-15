"""
Generates a synthetic RFP PDF for local testing, since real OliveSoft
RFPs aren't available yet. Run once to produce sample_rfp_en.pdf and
sample_rfp_fr.pdf under fixtures/.
"""

import os

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
os.makedirs(FIXTURES_DIR, exist_ok=True)

EN_TEXT = """REQUEST FOR PROPOSAL RFP-2026-014

Client: Regional Development Bank
Sector: Financial Services
Submission Deadline: November 15, 2026
Estimated Budget: Not disclosed

SCOPE OF WORK

The Bank seeks a partner to migrate its client-file management platform
from an on-premise monolith to a cloud-based microservices architecture.

TECHNICAL REQUIREMENTS

1. Migration from a monolithic application to microservices architecture. (Mandatory)
2. Deployment on AWS or Azure using Docker and Kubernetes. (Mandatory)
3. CI/CD pipeline and monitoring setup. (Mandatory)
4. Compliance with central bank security guidelines. (Mandatory)
5. Experience with GraphQL APIs is a plus. (Preferred)

STAFFING REQUIREMENTS

- 1 Project Manager
- 2 DevOps Engineers, minimum 5 years of experience
- 1 Certified Cloud Architect

REFERENCES

Bidders must provide at least 2 similar projects delivered in the
banking or financial sector within the last 5 years.

EVALUATION CRITERIA

Technical offer: 60%
Financial offer: 30%
References: 10%
"""

FR_TEXT = """APPEL D'OFFRES NATIONAL N 2026/14

Client: Banque Regionale de Developpement
Secteur: Services Financiers
Date limite de soumission: 15 novembre 2026
Budget previsionnel: non communique

CAHIER DES PRESCRIPTIONS TECHNIQUES

1. Migration d'une application monolithique vers une architecture microservices. (Exige)
2. Deploiement sur AWS ou Azure avec Docker et Kubernetes. (Exige)
3. Mise en place d'un pipeline CI/CD et supervision. (Exige)
4. Conformite aux exigences de securite de la banque centrale. (Exige)
5. Experience avec les API GraphQL est un plus. (Souhaite)

EXIGENCES EN PERSONNEL

- 1 Chef de Projet
- 2 Ingenieurs DevOps, minimum 5 ans d'experience
- 1 Architecte Cloud certifie

REFERENCES

Les soumissionnaires doivent fournir au moins 2 projets similaires
livres dans le secteur bancaire ou financier durant les 5 dernieres annees.

CRITERES D'EVALUATION

Offre technique: 60%
Offre financiere: 30%
References: 10%
"""


def make_pdf(text: str, filename: str) -> str:
    path = os.path.join(FIXTURES_DIR, filename)
    c = canvas.Canvas(path, pagesize=A4)
    width, height = A4
    margin = 2 * cm
    y = height - margin
    for line in text.split("\n"):
        if y < margin:
            c.showPage()
            y = height - margin
        c.drawString(margin, y, line)
        y -= 0.5 * cm
    c.save()
    return path


if __name__ == "__main__":
    en_path = make_pdf(EN_TEXT, "sample_rfp_en.pdf")
    fr_path = make_pdf(FR_TEXT, "sample_rfp_fr.pdf")
    print("Created:", en_path)
    print("Created:", fr_path)
