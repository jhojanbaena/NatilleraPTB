"""Esquemas de validación Pydantic para Notas y Bitácora Rápida."""
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotaBase(BaseModel):
    titulo: Optional[str] = Field(None, max_length=100, description="Título opcional del apunte")
    contenido: str = Field(..., min_length=1, description="Texto libre de la nota o apunte")
    fecha_programada: Optional[date] = Field(None, description="Fecha en que se realizará la actividad")


class NotaCreate(NotaBase):
    fecha_programada: Optional[date] = Field(None, description="Fecha opcional en que se realizará la actividad")


class NotaUpdate(BaseModel):
    titulo: Optional[str] = Field(None, max_length=100)
    contenido: Optional[str] = Field(None, min_length=1)
    fecha_programada: Optional[date] = None


class NotaResponse(NotaBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
