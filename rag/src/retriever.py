from embeddings import generate_embedding
from qdrant_store import client, COLLECTION_NAME


def retrieve_projects(query: str, top_k: int = 3):
    """
    Search for the most relevant projects in Qdrant.
    """

    # 1. Convert the query into an embedding
    query_embedding = generate_embedding(query)

    # 2. Search in Qdrant
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        limit=top_k,
        with_payload=True
    )

    return results.points