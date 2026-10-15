def normalize(text: str) -> str:
    return text.lower().strip()


def match_skills(required_technologies: list, candidate_skills: list) -> dict:

    required = {
        normalize(skill)
        for skill in required_technologies
    }

    available = {
        normalize(skill)
        for skill in candidate_skills
    }

    matched = sorted(required & available)
    missing = sorted(required - available)

    return {
        "matched": matched,
        "missing": missing,
        "matched_count": len(matched),
        "required_count": len(required)
    }


def match_role(required_role: str, candidate_roles: list) -> bool:

    required = normalize(required_role)

    for role in candidate_roles:

        if normalize(role) == required:
            return True

    return False


def match_candidate(
    candidate: dict,
    required_role: dict,
    required_technologies: list
) -> dict:

    role_required = required_role.get("title", "")

    required_experience = required_role.get(
        "min_experience_years"
    )

    candidate_roles = candidate.get("roles", [])

    candidate_experience = candidate.get(
        "experience_years",
        0
    )

    candidate_skills = candidate.get(
        "skills",
        []
    )

    candidate_certifications = candidate.get(
        "certifications",
        []
    )

    # Role matching
    role_match = match_role(
        role_required,
        candidate_roles
    )

    # Experience matching
    experience_match = (
        required_experience is None
        or candidate_experience >= required_experience
    )

    # Technology matching
    skill_match = match_skills(
        required_technologies,
        candidate_skills
    )

    return {
        "cv_id": candidate.get("cv_id"),
        "name": candidate.get("name"),

        "matched_role": role_required,

        "role_match": role_match,

        "experience_years": candidate_experience,

        "required_experience_years": required_experience,

        "experience_match": experience_match,

        "matched_technologies": skill_match["matched"],

        "missing_technologies": skill_match["missing"],

        "certifications": candidate_certifications,

        "candidate_match": (
            role_match
            and experience_match
        )
    }


def match_candidates(
    candidates: list[dict],
    required_roles: list[dict],
    required_technologies: list[str]
) -> list[dict]:

    results = []

    for required_role in required_roles:

        for candidate in candidates:

            result = match_candidate(
                candidate,
                required_role,
                required_technologies
            )

            results.append(result)

    return results