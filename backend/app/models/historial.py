"""Modelo ORM para Historial de Movimientos y Bitácora de Auditoría."""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class HistorialMovimiento(Base):
    __tablename__ = "historial_movimientos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    modulo: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    tipo_accion: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # CREAR, EDITAR, ELIMINAR, REVERTIR
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    entidad_tipo: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entidad_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    datos_previos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    datos_nuevos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    usuario_nombre: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    revertido: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    historial_origen_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<HistorialMovimiento(id={self.id}, modulo='{self.modulo}', accion='{self.tipo_accion}')>"
