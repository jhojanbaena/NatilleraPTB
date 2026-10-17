"""Modelo ORM para Rifas y Sorteos de la Natillera."""
from datetime import date, datetime
from decimal import Decimal
import enum
from sqlalchemy import String, Numeric, Integer, Date, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TipoRifa(str, enum.Enum):
    INTERNA = "INTERNA"
    GRANDE = "GRANDE"
    PEQUENA = "PEQUENA"


class Rifa(Base):
    __tablename__ = "rifas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(20), default=TipoRifa.INTERNA.value, nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    inversion_premios: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    valor_boleta: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    total_boletas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    boletas_vendidas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ganancia_por_boleta: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=True, default=0.0)
    ganancias_totales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Rifa(id={self.id}, nombre='{self.nombre}', tipo='{self.tipo}', ganancia={self.ganancias_totales})>"
