"""Modelo ORM para Actividades y Eventos de la Natillera."""
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Actividad(Base):
    __tablename__ = "actividades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    grupo_encargado: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    inversion: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    ingresos_brutos: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    ganancia_neta: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0.0)
    descripcion: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Actividad(id={self.id}, nombre='{self.nombre}', ganancia_neta={self.ganancia_neta})>"
