"""Modelo ORM para Finanzas y Registro Transaccional de Socios (Aportes, Multas)."""
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
import enum
from sqlalchemy import String, Numeric, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.socio import Socio


class TipoMovimientoFinanciero(str, enum.Enum):
    APORTE = "APORTE"
    MULTA = "MULTA"
    PAGO_MULTA = "PAGO_MULTA"
    RETIRO_AHORRO = "RETIRO_AHORRO"


class FinanzaSocio(Base):
    __tablename__ = "finanzas_socio"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    socio_id: Mapped[int] = mapped_column(
        ForeignKey("socios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    tipo_movimiento: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True
    )
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Relación inversa
    socio: Mapped["Socio"] = relationship("Socio", back_populates="finanzas")

    def __repr__(self) -> str:
        return f"<FinanzaSocio(id={self.id}, socio_id={self.socio_id}, tipo='{self.tipo_movimiento}', monto={self.monto})>"
