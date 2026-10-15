from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


COLLECTION_NAME = "olivesoft_knowledge"


# Local Qdrant database
client = QdrantClient(path="../qdrant_storage")


def create_collection(vector_size: int):
    """Create the OliveSoft knowledge collection."""

    collections = client.get_collections().collections

    collection_names = [collection.name for collection in collections]

    if COLLECTION_NAME not in collection_names:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )

        print(f"Collection '{COLLECTION_NAME}' created.")
    else:
        print(f"Collection '{COLLECTION_NAME}' already exists.")


def insert_project(
    point_id: int,
    embedding: list[float],
    project: dict
):
    """Insert one project into Qdrant."""

    point = PointStruct(
        id=point_id,
        vector=embedding,
        payload=project
    )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[point]
    )