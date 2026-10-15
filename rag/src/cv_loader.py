import json
from pathlib import Path


def load_cvs(file_path: str) -> list[dict]:
    path = Path(file_path)

    with path.open("r", encoding="utf-8") as file:
        cvs = json.load(file)

    return cvs


def cv_to_text(cv: dict) -> str:
    roles = ", ".join(cv.get("roles", []))
    skills = ", ".join(cv.get("skills", []))
    certifications = ", ".join(cv.get("certifications", []))

    text = f"""
CV ID: {cv.get("cv_id", "")}

Candidate:
{cv.get("name", "")}

Roles:
{roles}

Skills:
{skills}

Experience:
{cv.get("experience_years", "")} years

Certifications:
{certifications}
""".strip()

    return text


def prepare_cvs(file_path: str) -> list[dict]:
    cvs = load_cvs(file_path)

    for cv in cvs:
        cv["content"] = cv_to_text(cv)

    return cvs