from datetime import datetime


def build_matching_projects(results):
    matching_projects = []

    for result in results:
        project = result.payload

        matching_projects.append({
            "project_id": project.get("id"),
            "title": project.get("title"),
            "similarity": round(result.score, 4),
            "sector": project.get("sector"),
            "technologies": project.get("technologies", []),
            "project_type": project.get("project_type", []),
            "year": project.get("year")
        })

    return matching_projects


def build_matching_candidates(candidate_results):
    matching_candidates = []

    for result in candidate_results:

        # On garde uniquement les candidats
        # qui satisfont le rôle + l'expérience
        if not result.get("candidate_match", False):
            continue

        matching_candidates.append({
            "cv_id": result.get("cv_id"),
            "name": result.get("name"),
            "role": result.get("matched_role"),
            "skills": result.get("matched_technologies", []),
            "missing_skills": result.get("missing_technologies", []),
            "experience_years": result.get("experience_years"),
            "required_experience_years": result.get(
                "required_experience_years"
            ),
            "certifications": result.get("certifications", [])
        })

    return matching_candidates


def build_matching_references(results, rfp):
    matching_references = []

    current_year = datetime.now().year

    # Par défaut : 5 dernières années
    reference_years = 5

    for requirement in rfp.get("reference_requirements", []):
        text = str(requirement).lower()

        # On essaie de récupérer une éventuelle
        # information "last N years"
        if "last 3 years" in text:
            reference_years = 3

        elif "last 5 years" in text:
            reference_years = 5

    minimum_year = current_year - reference_years

    for result in results:
        project = result.payload

        sector = str(
            project.get("sector", "")
        ).lower()

        year = project.get("year")

        if year is None:
            continue

        # Référence pertinente si :
        # - secteur Finance ou Banking
        # - projet suffisamment récent
        if sector in ["finance", "banking"] and year >= minimum_year:

            matching_references.append({
                "project_id": project.get("id"),
                "title": project.get("title"),
                "sector": project.get("sector"),
                "year": year
            })

    return matching_references


def build_final_output(results, candidate_results, rfp):

    matching_projects = build_matching_projects(
        results
    )

    matching_candidates = build_matching_candidates(
        candidate_results
    )

    matching_references = build_matching_references(
        results,
        rfp
    )

    return {
        "matching_projects": matching_projects,
        "matching_candidates": matching_candidates,
        "matching_references": matching_references
    }