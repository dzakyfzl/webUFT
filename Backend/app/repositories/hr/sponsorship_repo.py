"""Repository for Sponsorship module."""

from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import joinedload

from app.models.hr.sponsorship import Sponsor, SponsorNote, SponsorOffer, SponsorProposal
from app.repositories.base import BaseRepository


class SponsorRepository(BaseRepository):

    def create(self, **kwargs) -> Sponsor:
        entity = Sponsor(**kwargs)
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def get_by_id(self, sponsor_id: int) -> Optional[Sponsor]:
        return (
            self.db.query(Sponsor)
            .options(
                joinedload(Sponsor.proposals),
                joinedload(Sponsor.offers),
                joinedload(Sponsor.notes),
            )
            .filter(Sponsor.id == sponsor_id)
            .first()
        )

    def list_all(
        self,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Sponsor]:
        query = self.db.query(Sponsor)
        if status:
            query = query.filter(Sponsor.status == status)
        if search:
            like = f"%{search}%"
            query = query.filter(
                or_(
                    Sponsor.nama_perusahaan.ilike(like),
                    Sponsor.cp_nama.ilike(like),
                    Sponsor.cp_wa.ilike(like),
                )
            )
        return query.order_by(Sponsor.created_at.desc()).offset(skip).limit(limit).all()

    def count(self, status: Optional[str] = None) -> int:
        query = self.db.query(Sponsor)
        if status:
            query = query.filter(Sponsor.status == status)
        return query.count()

    def update(self, sponsor_id: int, **kwargs) -> Optional[Sponsor]:
        entity = self.db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
        if entity is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(entity, key, value)
        self.db.commit()
        self.db.refresh(entity)
        return entity

    def delete(self, sponsor_id: int) -> bool:
        entity = self.db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
        if entity is None:
            return False
        self.db.delete(entity)
        self.db.commit()
        return True

    # --- Sub-record: Proposal ---

    def add_proposal(self, sponsor_id: int, created_by: int, **kwargs) -> SponsorProposal:
        proposal = SponsorProposal(sponsor_id=sponsor_id, created_by=created_by, **kwargs)
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        return proposal

    # --- Sub-record: Offer ---

    def add_offer(self, sponsor_id: int, created_by: int, **kwargs) -> SponsorOffer:
        offer = SponsorOffer(sponsor_id=sponsor_id, created_by=created_by, **kwargs)
        self.db.add(offer)
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def update_offer(self, offer_id: int, **kwargs) -> Optional[SponsorOffer]:
        offer = self.db.query(SponsorOffer).filter(SponsorOffer.id == offer_id).first()
        if offer is None:
            return None
        for key, value in kwargs.items():
            if value is not None:
                setattr(offer, key, value)
        self.db.commit()
        self.db.refresh(offer)
        return offer

    def get_offer(self, offer_id: int) -> Optional[SponsorOffer]:
        return self.db.query(SponsorOffer).filter(SponsorOffer.id == offer_id).first()

    # --- Sub-record: Note ---

    def add_note(self, sponsor_id: int, content: str, created_by: int) -> SponsorNote:
        note = SponsorNote(sponsor_id=sponsor_id, content=content, created_by=created_by)
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note
