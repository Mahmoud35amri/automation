def match_list(required_items: list, available_items: list) -> dict:
    """
    Compare required items with available project items.
    """

    required = {item.lower() for item in required_items}
    available = {item.lower() for item in available_items}

    matched = sorted(required & available)
    missing = sorted(required - available)

    return {
        "matched": matched,
        "missing": missing,
        "matched_count": len(matched),
        "required_count": len(required),
    }
def match_sector(rfp_sector: str, project_sector: str) -> bool:
    """
    Check whether the project sector matches the RFP sector.
    """

    if not rfp_sector or not project_sector:
        return False

    return rfp_sector.lower() == project_sector.lower()
def match_project(rfp: dict, project: dict) -> dict:
    """
    Analyze how well a retrieved project matches the RFP.
    """

    sector_match = match_sector(
        rfp.get("client_sector", ""),
        project.get("sector", "")
    )

    technology_match = match_list(
        rfp.get("required_technologies", []),
        project.get("technologies", [])
    )

    project_type_match = match_list(
        rfp.get("project_type", []),
        project.get("project_type", [])
    )

    return {
        "project_id": project.get("id"),
        "title": project.get("title"),
        "sector_match": sector_match,
        "technology_match": technology_match,
        "project_type_match": project_type_match,
        "year": project.get("year"),
    }