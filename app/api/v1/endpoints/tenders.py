from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, desc
from app.core.config import settings
from app.core.database import get_db
from app.models.asset import TenderAssetMatch
from app.models.tender import Tender, TenderStatus
from app.schemas.tender import TenderCreate, TenderUpdate, TenderResponse, NLPTenderPayload
from app.schemas.composite import TenderDetailResponse

router = APIRouter()


@router.post("/", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
def create_tender(
    tender_in: TenderCreate,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Ingest a new tender scraped from public procurement portals or entered manually.
    Prevents duplicate entries if source_url already exists by returning the existing 
    record with a 200 OK instead of throwing an error, keeping scraper pipelines happy.
    """
    if tender_in.source_url:
        existing = db.scalar(
            select(Tender).where(Tender.source_url == tender_in.source_url)
        )
        if existing:
            # Return HTTP 200 (OK) instead of HTTP 400 (Bad Request) or 201 (Created)
            response.status_code = status.HTTP_200_OK
            return existing

    db_tender = Tender(
        title=tender_in.title,
        organization_name=tender_in.organization_name,
        source_url=tender_in.source_url,
        raw_description=tender_in.raw_description,
        deadline=tender_in.deadline,
        is_partial=tender_in.is_partial,
        nlp_metadata=tender_in.nlp_metadata,
        status=TenderStatus.DETECTED
    )
    db.add(db_tender)
    db.commit()
    db.refresh(db_tender)
    return db_tender


@router.get("/", response_model=List[TenderResponse])
def list_tenders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[TenderStatus] = Query(None, alias="status"),
    search: Optional[str] = Query(None, description="Search in title or organization name"),
    db: Session = Depends(get_db)
):
    """
    List all tenders for the frontend dashboard with pagination, status filtering, and keyword search.
    """
    stmt = select(Tender).order_by(desc(Tender.created_at))

    if status_filter:
        stmt = stmt.where(Tender.status == status_filter)

    if search:
        stmt = stmt.where(
            (Tender.title.ilike(f"%{search}%")) |
            (Tender.organization_name.ilike(f"%{search}%"))
        )

    stmt = stmt.offset(skip).limit(limit)
    tenders = db.scalars(stmt).all()
    return tenders


@router.get("/{tender_id}", response_model=TenderDetailResponse)
def get_tender_detail(
    tender_id: int,
    db: Session = Depends(get_db)
):
    """
    Get full RFP details with nested asset information for the frontend dashboard.
    """
    stmt = (
        select(Tender)
        .options(
            joinedload(Tender.research),
            # Chain joinedload to fetch the actual InternalAsset object inside TenderAssetMatch
            joinedload(Tender.asset_matches).joinedload(TenderAssetMatch.asset),
            joinedload(Tender.proposals)
        )
        .where(Tender.id == tender_id)
    )
    tender = db.scalar(stmt)
    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender with ID {tender_id} not found."
        )
    return tender


@router.patch("/{tender_id}", response_model=TenderResponse)
def update_tender(
    tender_id: int,
    tender_in: TenderUpdate,
    db: Session = Depends(get_db)
):
    """
    Update tender details or update status (e.g., from DETECTED to RESEARCHING).
    """
    db_tender = db.get(Tender, tender_id)
    if not db_tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender with ID {tender_id} not found."
        )

    update_data = tender_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_tender, field, value)

    db.add(db_tender)
    db.commit()
    db.refresh(db_tender)
    return db_tender


@router.delete("/{tender_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tender(
    tender_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a tender by ID.
    """
    db_tender = db.get(Tender, tender_id)
    if not db_tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tender with ID {tender_id} not found."
        )

    db.delete(db_tender)
    db.commit()
    return None


def _call_n8n_webhook(url: str, payload: dict):
    try:
        httpx.post(url, json=payload, timeout=5.0)
    except Exception as e:
        # Don't crash if n8n is offline in dev mode
        print(f"Warning: Could not contact n8n webhook: {e}")


@router.post("/{tender_id}/trigger-research", status_code=status.HTTP_202_ACCEPTED)
def trigger_n8n_research(
    tender_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger the n8n agent workflow to start autonomous prospect research.
    """
    tender = db.get(Tender, tender_id)
    if not tender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tender not found")

    tender.status = TenderStatus.RESEARCHING
    db.commit()

    # Async background HTTP call to n8n Webhook
    payload = {
        "tender_id": tender.id,
        "title": tender.title,
        "organization_name": tender.organization_name,
        "raw_description": tender.raw_description
    }
    background_tasks.add_task(
        _call_n8n_webhook,
        url=settings.N8N_RESEARCH_WEBHOOK_URL,
        payload=payload
    )

    return {"message": "Prospect research triggered successfully", "status": tender.status}

@router.post("/from-nlp", response_model=TenderResponse, status_code=status.HTTP_201_CREATED)
def create_tender_from_nlp(
    nlp_payload: NLPTenderPayload,
    db: Session = Depends(get_db)
):
    """
    Ingest a new tender directly from the NLP extraction JSON output.
    """
    # Map NLP payload to Tender
    if nlp_payload.deadline:
        # Convert date to datetime
        from datetime import datetime, time, timezone
        deadline = datetime.combine(nlp_payload.deadline, time.min).replace(tzinfo=timezone.utc)
    else:
        deadline = None

    db_tender = Tender(
        title=nlp_payload.title,
        organization_name=nlp_payload.client_name,
        source_url=nlp_payload.reference,  # Assuming reference is somewhat unique
        raw_description="",  # Data is already structured
        deadline=deadline,
        is_partial=False,
        nlp_metadata=nlp_payload.model_dump(mode="json"),
        status=TenderStatus.DETECTED
    )
    db.add(db_tender)
    db.commit()
    db.refresh(db_tender)
    return db_tender
