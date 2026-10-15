def normalize(text: str) -> str:
    """
    Normalize text for simple keyword matching.
    """
    return text.lower().strip()


def project_text(project: dict) -> str:
    """
    Build a searchable text from the project fields.
    """
    parts = [
        project.get("title", ""),
        project.get("description", ""),
        project.get("sector", ""),
        " ".join(project.get("technologies", [])),
        " ".join(project.get("skills", [])),
        " ".join(project.get("project_type", [])),
    ]

    return normalize(" ".join(parts))


def match_requirement(requirement: dict, project: dict) -> dict:
    """
    Determine whether a project covers an RFP requirement.

    Status:
    - matched
    - partial
    - not_found
    """

    requirement_id = requirement.get("id")
    text = normalize(requirement.get("text", ""))
    content = project_text(project)

    # ---------------------------------------------------------
    # R1 - Monolith -> Microservices
    # ---------------------------------------------------------
    if requirement_id == "R1":

        has_microservices = "microservices" in content
        has_monolith = (
            "monolith" in content
            or "monolithic" in content
        )

        if has_microservices and has_monolith:
            return {
                "status": "matched",
                "evidence": (
                    "Project mentions migration/transformation "
                    "from a monolithic application to microservices."
                )
            }

        if has_microservices:
            return {
                "status": "partial",
                "evidence": "Project mentions microservices."
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # R2 - AWS/Azure + Docker + Kubernetes
    # ---------------------------------------------------------
    if requirement_id == "R2":

        has_cloud = (
            "aws" in content
            or "azure" in content
        )

        has_docker = "docker" in content
        has_kubernetes = "kubernetes" in content

        matched = sum([
            has_cloud,
            has_docker,
            has_kubernetes
        ])

        if matched == 3:
            return {
                "status": "matched",
                "evidence": (
                    "Project contains a cloud provider "
                    "(AWS/Azure), Docker and Kubernetes."
                )
            }

        if matched > 0:
            return {
                "status": "partial",
                "evidence": (
                    f"Project covers {matched}/3 required "
                    "technology elements."
                )
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # R3 - CI/CD + Monitoring
    # ---------------------------------------------------------
    if requirement_id == "R3":

        has_cicd = (
            "ci/cd" in content
            or "cicd" in content
            or "continuous integration" in content
            or "continuous deployment" in content
        )

        has_monitoring = "monitoring" in content

        if has_cicd and has_monitoring:
            return {
                "status": "matched",
                "evidence": (
                    "Project mentions CI/CD and monitoring."
                )
            }

        if has_cicd or has_monitoring:
            return {
                "status": "partial",
                "evidence": (
                    "Project covers only one of CI/CD "
                    "or monitoring."
                )
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # R4 - Central bank security compliance
    # ---------------------------------------------------------
    if requirement_id == "R4":

        has_security = (
            "security" in content
            or "cybersecurity" in content
        )

        has_compliance = "compliance" in content

        has_bank = (
            "bank" in content
            or "banking" in content
            or "financial" in content
        )

        if has_security and has_compliance and has_bank:
            return {
                "status": "matched",
                "evidence": (
                    "Project contains evidence related to "
                    "security, compliance and banking/financial context."
                )
            }

        if has_security or has_compliance:
            return {
                "status": "partial",
                "evidence": (
                    "Project contains some security/compliance "
                    "evidence, but not enough to prove central-bank compliance."
                )
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # R5 - GraphQL
    # ---------------------------------------------------------
    if requirement_id == "R5":

        if "graphql" in content:
            return {
                "status": "matched",
                "evidence": "Project uses GraphQL."
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # R6 - Similar banking/financial projects
    # ---------------------------------------------------------
    if requirement_id == "R6":

        sector = normalize(project.get("sector", ""))

        if sector in ["finance", "banking"]:
            return {
                "status": "partial",
                "evidence": (
                    "Project is in the banking/financial sector, "
                    "but one project alone cannot prove the requirement "
                    "of at least two similar projects."
                )
            }

        return {
            "status": "not_found",
            "evidence": None
        }

    # ---------------------------------------------------------
    # Unknown requirement
    # ---------------------------------------------------------
    return {
        "status": "not_found",
        "evidence": None
    }


def match_project_requirements(
    project: dict,
    requirements: list[dict]
) -> dict:
    """
    Match all RFP requirements against one project.
    """

    results = {}

    for requirement in requirements:
        requirement_id = requirement.get("id")

        results[requirement_id] = match_requirement(
            requirement,
            project
        )

    return {
        "project_id": project.get("id"),
        "title": project.get("title"),
        "requirements": results
    }