"""Modelo ORM para Reuniones y Agenda de Sesiones de la Natillera."""
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Reunion(Base):
    __tablename__ = "reuniones"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hora: Mapped[str] = mapped_column(String(10), nullable=False)  # Formato "HH:MM"
    lugar: Mapped[str] = mapped_column(String(150), nullable=False)
    tema: Mapped[str] = mapped_column(String(255), nullable=False)
    compromisos: Mapped[str] = mapped_column(Text, nullable=True)
    asistentes_requeridos: Mapped[str] = mapped_column(Text, nullable=True)
    ganancias_reunion: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Reunion(id={self.id}, fecha={self.fecha}, tema='{self.tema}')>"
