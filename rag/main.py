from data_loader import prepare_projects
from embeddings import generate_embedding
from qdrant_store import create_collection, insert_project


projects = prepare_projects("../data/projects.json")


# Generate one embedding to know the vector dimension
test_embedding = generate_embedding(projects[0]["content"])

vector_size = len(test_embedding)

print(f"Vector size: {vector_size}")


# Create Qdrant collection
create_collection(vector_size)


# Insert all projects
for index, project in enumerate(projects, start=1):

    embedding = generate_embedding(project["content"])

    insert_project(
        point_id=index,
        embedding=embedding,
        project=project
    )

    print(f"Inserted: {project['id']}")


print("\nAll projects inserted successfully.")