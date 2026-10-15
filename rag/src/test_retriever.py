from retriever import retrieve_projects


query = """
Financial institution looking for AWS, Docker,
Kubernetes and microservices architecture.
"""


results = retrieve_projects(query, top_k=3)


print("\nTop results:\n")

for result in results:
    print("=" * 60)

    print(f"Score: {result.score}")

    print(f"Project ID: {result.payload['id']}")

    print("Payload:", result.payload)

    print(f"Title: {result.payload['title']}")

    print(f"Sector: {result.payload['sector']}")

    print(f"Technologies: {result.payload['technologies']}")

    print()