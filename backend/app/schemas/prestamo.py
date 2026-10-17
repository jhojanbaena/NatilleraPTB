"""Esquemas de validación Pydantic para Préstamos y Abonos de Cuotas."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.prestamo import EstadoPrestamo


class AbonoPrestamoCreate(BaseModel):
    prestamo_id: int = Field(..., description="ID del préstamo a abonar")
    monto_abonado: Decimal = Field(..., gt=0, description="Monto total entregado en el abono")
    monto_capital: Optional[Decimal] = Field(None, ge=0, description="Porción destinada a amortizar capital")
    monto_interes: Optional[Decimal] = Field(None, ge=0, description="Porción destinada a cubrir interés")
    numero_cuota: Optional[int] = Field(None, ge=1, description="Número de cuota correspondiente")

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def validate_breakdown(self) -> "AbonoPrestamoCreate":
        if self.monto_capital is not None:
            monto_interes = self.monto_interes or Decimal("0.00")
            if self.monto_capital + monto_interes != self.monto_abonado:
                raise ValueError("El capital y el interés deben sumar exactamente el monto abonado")
        return self


class AbonoPrestamoResponse(BaseModel):
    id: int
    prestamo_id: int
    monto_abonado: Decimal
    monto_capital: Decimal
    monto_interes: Decimal
    numero_cuota: int
    fecha_pago: datetime

    model_config = ConfigDict(from_attributes=True)


class PrestamoBase(BaseModel):
    socio_id: int = Field(..., description="ID del socio solicitante")
    monto_prestado: Decimal = Field(..., gt=0, description="Capital total prestado")
    tasa_interes: Decimal = Field(default=Decimal("0.0"), ge=0, description="Tasa de interés acordada en porcentaje")
    numero_cuotas: int = Field(..., gt=0, description="Número total de cuotas pactadas")
    fecha_prestamo: Optional[date] = Field(None, description="Fecha de desembolso")
    fecha_vencimiento: Optional[date] = Field(None, description="Fecha límite de pago")


class PrestamoCreate(PrestamoBase):
    pass


class PrestamoResponse(PrestamoBase):
    id: int
    total_intereses: Decimal
    saldo_pendiente: Decimal
    cuotas_pagadas: int
    estado: EstadoPrestamo
    fecha_prestamo: date
    created_at: datetime
    abonos: List[AbonoPrestamoResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ResumenPrestamoSocio(BaseModel):
    socio_id: int
    cedula: str
    nombre: str
    total_prestamos: int
    saldo_pendiente_total: Decimal
