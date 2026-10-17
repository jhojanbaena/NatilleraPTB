"""Esquemas de validación Pydantic para Actividades y Eventos."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ActividadBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre de la actividad o evento")
    grupo_encargado: str = Field(..., min_length=2, max_length=100, description="Comité o grupo responsable")
    fecha: date = Field(..., description="Fecha de realización")
    inversion: Decimal = Field(default=Decimal("0.00"), ge=0, description="Gastos o inversión realizada")
    ingresos_brutos: Decimal = Field(default=Decimal("0.00"), ge=0, description="Total de dinero recolectado")
    descripcion: Optional[str] = Field(None, description="Detalles o descripción del evento")


class ActividadCreate(ActividadBase):
    pass


class ActividadUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    grupo_encargado: Optional[str] = Field(None, min_length=2, max_length=100)
    fecha: Optional[date] = None
    inversion: Optional[Decimal] = Field(None, ge=0)
    ingresos_brutos: Optional[Decimal] = Field(None, ge=0)
    descripcion: Optional[str] = None


class ActividadResponse(ActividadBase):
    id: int
    ganancia_neta: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
