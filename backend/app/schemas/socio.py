"""Esquemas de validación Pydantic para Socios y su Perfil Integral."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.finanzas import FinanzaResponse
from app.schemas.prestamo import PrestamoResponse


class SocioBase(BaseModel):
    cedula: str = Field(..., min_length=5, max_length=20, description="Cédula o documento de identidad único")
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre completo del socio")
    telefono: str = Field(..., min_length=7, max_length=20, description="Número de teléfono o celular")
    residencia: str = Field(..., min_length=3, max_length=200, description="Dirección o lugar de residencia")
    aporte_mensual: Decimal = Field(..., ge=0, description="Cuota o aporte obligatorio mensual pactado")


class SocioCreate(SocioBase):
    id: Optional[int] = Field(None, ge=1, description="Identificador numérico del socio")


class SocioUpdate(BaseModel):
    cedula: Optional[str] = Field(None, min_length=5, max_length=20)
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    residencia: Optional[str] = Field(None, min_length=3, max_length=200)
    aporte_mensual: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None


class SocioResponse(SocioBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SocioDetailResponse(SocioResponse):
    """Perfil detallado que consolida finanzas, multas y préstamos del socio."""
    total_ahorrado: Decimal = Decimal("0.00")
    total_multas_pendientes: Decimal = Decimal("0.00")
    total_multas_pagadas: Decimal = Decimal("0.00")
    total_prestamos_activos: int = 0
    saldo_prestamos_pendiente: Decimal = Decimal("0.00")
    historial_finanzas: List[FinanzaResponse] = []
    prestamos: List[PrestamoResponse] = []

    model_config = ConfigDict(from_attributes=True)
