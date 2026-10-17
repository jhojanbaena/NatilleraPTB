"""Modelo ORM para Socios de la Natillera."""
from datetime import datetime
from decimal import Decimal
from typing import List, TYPE_CHECKING
from sqlalchemy import String, Numeric, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.finanzas import FinanzaSocio
    from app.models.prestamo import Prestamo


class Socio(Base):
    __tablename__ = "socios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    cedula: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    telefono: Mapped[str] = mapped_column(String(20), nullable=False)
    residencia: Mapped[str] = mapped_column(String(200), nullable=False)
    aporte_mensual: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relaciones
    finanzas: Mapped[List["FinanzaSocio"]] = relationship(
        "FinanzaSocio",
        back_populates="socio",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    prestamos: Mapped[List["Prestamo"]] = relationship(
        "Prestamo",
        back_populates="socio",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Socio(id={self.id}, cedula='{self.cedula}', nombre='{self.nombre}')>"
