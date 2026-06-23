import uuid
from datetime import datetime
from typing import List
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Repository(Base):
    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner: Mapped[str] = mapped_column(String(255), nullable=False)
    clone_url: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    forks: Mapped[int] = mapped_column(Integer, default=0)
    open_issues: Mapped[int] = mapped_column(Integer, default=0)
    contributors_count: Mapped[int] = mapped_column(Integer, default=0)
    last_commit_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    local_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="idle")  # idle, cloning, cloned, failed
    detected_stack: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dependencies_profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    environment_profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    documentation_profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    build_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    failure_diagnosis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    vulnerability_profile: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to analyses
    analyses: Mapped[List["Analysis"]] = relationship(
        "Analysis",
        back_populates="repository",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    # Relationship to user
    user: Mapped["User"] = relationship(
        "User",
        back_populates="repositories",
        lazy="selectin"
    )

