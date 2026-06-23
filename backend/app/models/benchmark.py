import uuid
from datetime import datetime
from typing import List
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(50), default="running")  # running, completed, failed
    total_repos: Mapped[int] = mapped_column(Integer, default=0)
    completed_repos: Mapped[int] = mapped_column(Integer, default=0)
    
    # Aggregated metrics
    tech_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    dependency_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    environment_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    build_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    docs_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    results: Mapped[List["BenchmarkResult"]] = relationship(
        "BenchmarkResult",
        back_populates="run",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

class BenchmarkResult(Base):
    __tablename__ = "benchmark_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("benchmark_runs.id", ondelete="CASCADE"))
    repo_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    
    # Truth vs Predicted
    expected_ecosystem: Mapped[str] = mapped_column(String(100), nullable=False)
    predicted_ecosystem: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tech_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    expected_has_deps: Mapped[bool] = mapped_column(Boolean, default=True)
    predicted_has_deps: Mapped[bool] = mapped_column(Boolean, default=False)
    dep_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    expected_has_env: Mapped[bool] = mapped_column(Boolean, default=False)
    predicted_has_env: Mapped[bool] = mapped_column(Boolean, default=False)
    env_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    expected_build_success: Mapped[bool] = mapped_column(Boolean, default=True)
    predicted_build_success: Mapped[bool] = mapped_column(Boolean, default=False)
    build_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    expected_has_readme: Mapped[bool] = mapped_column(Boolean, default=True)
    predicted_has_readme: Mapped[bool] = mapped_column(Boolean, default=False)
    docs_match: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    run: Mapped["BenchmarkRun"] = relationship(
        "BenchmarkRun",
        back_populates="results"
    )
