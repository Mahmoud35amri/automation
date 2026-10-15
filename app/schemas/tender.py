from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.models.tender import TenderStatus

class RoleRequirement(BaseModel):
    title: str
    count: Optional[int] = None  # the NLP pipeline emits null when the RFP gives no headcount
    min_experience_years: Optional[int] = None
    required_certifications: List[str] = []

class RequirementItem(BaseModel):
    id: str
    text: str
    category: str
    mandatory: bool
    min_experience_years: Optional[int] = None

class NLPTenderPayload(BaseModel):
    reference: Optional[str] = None
    title: str
    client_name: Optional[str] = None
    client_sector: Optional[str] = None
    deadline: Optional[date] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    project_type: List[str] = []
    required_technologies: List[str] = []
    required_roles: List[RoleRequirement] = []
    requirements: List[RequirementItem] = []
    language: Optional[str] = None
    missing_fields: List[str] = []
    confidence: Optional[float] = None

class TenderBase(BaseModel):
    title: str
    organization_name: Optional[str] = None
    source_url: Optional[str] = None
    raw_description: str = ""
    deadline: Optional[datetime] = None
    is_partial: bool = False
    nlp_metadata: Optional[Dict[str, Any]] = None

class TenderCreate(TenderBase):
    pass

class TenderUpdate(BaseModel):
    title: Optional[str] = None
    organization_name: Optional[str] = None
    status: Optional[TenderStatus] = None
    is_partial: Optional[bool] = None
    deadline: Optional[datetime] = None
    nlp_metadata: Optional[Dict[str, Any]] = None

class TenderResponse(TenderBase):
    id: int
    status: TenderStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)