"""
Target structured output of the NLP/RFP-analysis component.

This is the contract handed to the RAG teammate: every RFP, regardless
of source language or formatting, gets normalized into this shape.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from vocab import (
    LANGUAGES,
    PROJECT_TYPES,
    REQUIREMENT_CATEGORIES,
    SECTORS,
    TECHNOLOGIES,
)

# Build Literal-like validation from the controlled vocab lists without
# hand-writing Literal[...] for every long list (keeps vocab.py the
# single source of truth). Pydantic validates these as plain strings;
# validate_vocab() below enforces membership explicitly and clearly.


class Requirement(BaseModel):
    id: str                                    # r1, r2, ... — stable within one RFP
    text: str                                   # raw requirement sentence, original language
    category: Literal[
        "technical", "staffing", "references", "administrative", "other"
    ]
    mandatory: bool                             # True = required, False = preferred/"a plus"
    min_experience_years: int | None = None     # only meaningful for staffing requirements


class Role(BaseModel):
    title: str                                  # e.g. "DevOps Engineer"
    count: int | None = None
    min_experience_years: int | None = None
    required_certifications: list[str] = Field(default_factory=list)


class RFPExtraction(BaseModel):
    # Identification
    reference: str | None = None
    title: str
    client_name: str | None = None
    client_sector: str | None = None            # must be one of vocab.SECTORS

    # Commercial constraints
    deadline: date | None = None
    budget: float | None = None
    currency: str | None = None                 # "EUR", "TND", "USD", ...

    # Content
    project_type: list[str] = Field(default_factory=list)          # subset of vocab.PROJECT_TYPES
    required_technologies: list[str] = Field(default_factory=list)  # subset of vocab.TECHNOLOGIES
    required_roles: list[Role] = Field(default_factory=list)
    requirements: list[Requirement] = Field(default_factory=list)

    # Metadata
    language: Literal["en", "fr", "ar"] = "en"
    missing_fields: list[str] = Field(default_factory=list)  # fields the pipeline couldn't find
    confidence: float = Field(ge=0, le=1, default=0.0)       # overall extraction confidence


def validate_vocab(extraction: RFPExtraction) -> list[str]:
    """
    Check the extraction's open-vocab fields against the controlled lists.
    Returns a list of human-readable warnings (empty if everything is clean).
    This is a normalization safety net, not a replacement for prompting
    the LLM with the allowed values in the first place.
    """
    warnings: list[str] = []

    if extraction.client_sector and extraction.client_sector not in SECTORS:
        warnings.append(f"client_sector '{extraction.client_sector}' not in controlled vocab")

    for pt in extraction.project_type:
        if pt not in PROJECT_TYPES:
            warnings.append(f"project_type '{pt}' not in controlled vocab")

    for tech in extraction.required_technologies:
        if tech not in TECHNOLOGIES:
            warnings.append(f"required_technologies '{tech}' not in controlled vocab")

    for req in extraction.requirements:
        if req.category not in REQUIREMENT_CATEGORIES:
            warnings.append(f"requirement {req.id} category '{req.category}' invalid")

    if extraction.language not in LANGUAGES:
        warnings.append(f"language '{extraction.language}' not in controlled vocab")

    return warnings
