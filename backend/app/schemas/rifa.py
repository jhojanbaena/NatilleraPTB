"""Esquemas de validación Pydantic para Rifas y Sorteos."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.rifa import TipoRifa


class RifaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre o descripción del premio")
    tipo: TipoRifa = Field(default=TipoRifa.INTERNA, description="INTERNA, GRANDE o PEQUENA")
    fecha: date = Field(..., description="Fecha del sorteo")
    inversion_premios: Decimal = Field(default=Decimal("0.00"), ge=0, description="Costo total de los premios")
    valor_boleta: Decimal = Field(default=Decimal("0.00"), ge=0, description="Precio de venta por boleta/número")
    total_boletas: int = Field(default=0, ge=0, description="Número total de boletas emitidas")
    boletas_vendidas: int = Field(default=0, ge=0, description="Número de boletas efectivamente vendidas")
    descripcion: Optional[str] = Field(None, description="Detalles adicionales de la rifa")


class RifaCreate(RifaBase):
    pass


class RifaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    tipo: Optional[TipoRifa] = None
    fecha: Optional[date] = None
    inversion_premios: Optional[Decimal] = Field(None, ge=0)
    valor_boleta: Optional[Decimal] = Field(None, ge=0)
    total_boletas: Optional[int] = Field(None, ge=0)
    boletas_vendidas: Optional[int] = Field(None, ge=0)
    descripcion: Optional[str] = None


class RifaResponse(RifaBase):
    id: int
    ganancia_por_boleta: Optional[Decimal] = None
    ganancias_totales: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
