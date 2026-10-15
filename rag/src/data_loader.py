import json
from pathlib import Path


def load_projects(file_path: str) -> list[dict]:
    """Load projects from a JSON file."""
    path = Path(file_path)

    with path.open("r", encoding="utf-8") as file:
        projects = json.load(file)

    return projects


def project_to_text(project: dict) -> str:
    """Convert a project into a text representation for embedding."""

    project_types = ", ".join(project.get("project_type", []))
    technologies = ", ".join(project.get("technologies", []))
    skills = ", ".join(project.get("skills", []))

    text = f"""
Project: {project.get("title", "")}

Sector: {project.get("sector", "")}

Description:
{project.get("description", "")}

Project Type:
{project_types}

Technologies:
{technologies}

Skills:
{skills}

Year:
{project.get("year", "")}
""".strip()

    return text


def prepare_projects(file_path: str) -> list[dict]:
    """Load projects and prepare their text representation."""

    projects = load_projects(file_path)

    for project in projects:
        project["content"] = project_to_text(project)

    return projects