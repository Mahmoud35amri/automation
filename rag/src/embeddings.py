from sentence_transformers import SentenceTransformer


# Model used to transform text into embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")


def generate_embedding(text: str) -> list[float]:
    """Convert text into a vector embedding."""
    embedding = model.encode(text)

    return embedding.tolist()