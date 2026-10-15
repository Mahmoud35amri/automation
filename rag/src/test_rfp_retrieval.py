from rfp_query import build_rfp_query
from retriever import retrieve_projects



rfp = {
    "reference": "RFP-2026-014",
    "title": "REQUEST FOR PROPOSAL",
    "client_name": "Regional Development Bank",
    "client_sector": "Finance",
    "deadline": "2026-11-15",
    "project_type": [
        "cloud_migration",
        "cloud_infrastructure",
        "devops_automation",
        "digital_transformation"
    ],
    "required_technologies": [
        "AWS",
        "Azure",
        "Docker",
        "Kubernetes",
        "GraphQL"
    ],
    "required_roles": [
        {
            "title": "Project Manager",
            "count": 1
        },
        {
            "title": "DevOps Engineer",
            "count": 2,
            "min_experience_years": 5
        },
        {
            "title": "Certified Cloud Architect",
            "count": 1
        }
    ],
    "requirements": [
        {
            "id": "R1",
            "text": "Migration from a monolithic application to microservices architecture.",
            "category": "technical",
            "mandatory": True
        },
        {
            "id": "R2",
            "text": "Deployment on AWS or Azure using Docker and Kubernetes.",
            "category": "technical",
            "mandatory": True
        },
        {
            "id": "R3",
            "text": "CI/CD pipeline and monitoring setup.",
            "category": "technical",
            "mandatory": True
        },
        {
            "id": "R4",
            "text": "Compliance with central bank security guidelines.",
            "category": "technical",
            "mandatory": True
        },
        {
            "id": "R5",
            "text": "Experience with GraphQL APIs is a plus.",
            "category": "technical",
            "mandatory": False
        },
        {
            "id": "R6",
            "text": "Bidders must provide at least 2 similar projects delivered in the banking or financial sector within the last 5 years.",
            "category": "references",
            "mandatory": True
        }
    ],
    "language": "en",
    "confidence": 0.96
}


# 1. Convert RFP JSON into semantic query
query = build_rfp_query(rfp)

print("\nGenerated RFP Query:")
print("=" * 70)
print(query)
print("=" * 70)


# 2. Search Qdrant
results = retrieve_projects(query, top_k=5)


# 3. Display results
print("\nTop matching OliveSoft projects:")
print("=" * 70)

for result in results:
    print(f"\nScore: {result.score}")
    
    payload = result.payload
    print("FULL PAYLOAD:")
    print(payload)
    
    print(f"Project ID: {payload.get('id')}")
    print(f"Title: {payload.get('title')}")
    print(f"Sector: {payload.get('sector')}")
    print(f"Technologies: {payload.get('technologies')}")