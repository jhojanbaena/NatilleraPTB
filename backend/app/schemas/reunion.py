"""Esquemas de validación Pydantic para Reuniones y Agenda de Sesiones."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ReunionBase(BaseModel):
    fecha: date = Field(..., description="Fecha de la sesión")
    hora: str = Field(..., max_length=10, description="Hora programada (ej. 19:00 o 7:00 PM)")
    lugar: str = Field(..., min_length=2, max_length=150, description="Lugar de reunión")
    tema: str = Field(..., min_length=2, max_length=255, description="Tema central u orden del día")
    compromisos: Optional[str] = Field(None, description="Compromisos o acuerdos establecidos")
    asistentes_requeridos: Optional[str] = Field(None, description="Lista o nota de asistentes requeridos")
    ganancias_reunion: Decimal = Field(default=Decimal("0.00"), ge=0, description="Ingresos en la sesión (multas de asistencia, ventas)")


class ReunionCreate(ReunionBase):
    pass


class ReunionUpdate(BaseModel):
    fecha: Optional[date] = None
    hora: Optional[str] = Field(None, max_length=10)
    lugar: Optional[str] = Field(None, min_length=2, max_length=150)
    tema: Optional[str] = Field(None, min_length=2, max_length=255)
    compromisos: Optional[str] = None
    asistentes_requeridos: Optional[str] = None
    ganancias_reunion: Optional[Decimal] = Field(None, ge=0)


class ReunionResponse(ReunionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
