def build_rfp_query(rfp: dict) -> str:
    """
    Convert a structured RFP JSON into a rich semantic-search query.
    """

    parts = []

    # ---------------------------------------------------------
    # 1. Client sector
    # ---------------------------------------------------------
    sector = rfp.get("client_sector")

    if sector:
        parts.append(
            f"Client sector: {sector}"
        )

    # ---------------------------------------------------------
    # 2. Project types
    # ---------------------------------------------------------
    project_types = rfp.get("project_type", [])

    if project_types:
        parts.append(
            "Project types: " + ", ".join(project_types)
        )

    # ---------------------------------------------------------
    # 3. Required technologies
    # ---------------------------------------------------------
    technologies = rfp.get("required_technologies", [])

    if technologies:
        parts.append(
            "Required technologies: " + ", ".join(technologies)
        )

    # ---------------------------------------------------------
    # 4. Required roles
    # ---------------------------------------------------------
    roles = rfp.get("required_roles", [])

    if roles:

        role_text = []

        for role in roles:

            title = role.get("title", "")
            count = role.get("count")
            experience = role.get("min_experience_years")

            role_info = title

            if count:
                role_info += f" ({count} position(s))"

            if experience:
                role_info += f", minimum {experience} years experience"

            role_text.append(role_info)

        parts.append(
            "Required roles: " + "; ".join(role_text)
        )

    # ---------------------------------------------------------
    # 5. Requirements
    # ---------------------------------------------------------
    requirements = rfp.get("requirements", [])

    mandatory_requirements = []
    optional_requirements = []
    reference_requirements = []

    for requirement in requirements:

        text = requirement.get("text", "")
        mandatory = requirement.get("mandatory", False)
        category = requirement.get("category", "")

        if not text:
            continue

        # Reference requirements
        if category == "references":
            reference_requirements.append(text)

        # Mandatory technical requirements
        elif mandatory:
            mandatory_requirements.append(text)

        # Optional requirements
        else:
            optional_requirements.append(text)

    # ---------------------------------------------------------
    # 6. Mandatory requirements
    # ---------------------------------------------------------
    if mandatory_requirements:

        parts.append(
            "Mandatory requirements: "
            + " ".join(mandatory_requirements)
        )

    # ---------------------------------------------------------
    # 7. Optional requirements
    # ---------------------------------------------------------
    if optional_requirements:

        parts.append(
            "Optional requirements: "
            + " ".join(optional_requirements)
        )

    # ---------------------------------------------------------
    # 8. Reference requirements
    # ---------------------------------------------------------
    if reference_requirements:

        parts.append(
            "Reference requirements: "
            + " ".join(reference_requirements)
        )

    # ---------------------------------------------------------
    # 9. Final query
    # ---------------------------------------------------------
    return "\n".join(parts)