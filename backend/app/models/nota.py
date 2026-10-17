"""Modelo ORM para Notas y Bitácora rápida."""
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Nota(Base):
    __tablename__ = "notas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(100), nullable=True)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    fecha_programada: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<Nota(id={self.id}, titulo='{self.titulo}')>"
