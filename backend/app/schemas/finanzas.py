"""Esquemas de validación Pydantic para Finanzas y Transacciones de Socios."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.finanzas import TipoMovimientoFinanciero


class FinanzaBase(BaseModel):
    tipo_movimiento: TipoMovimientoFinanciero = Field(..., description="APORTE, MULTA, PAGO_MULTA o RETIRO_AHORRO")
    monto: Decimal = Field(..., gt=0, description="Monto monetario del movimiento")
    descripcion: Optional[str] = Field(None, max_length=255, description="Detalle del movimiento")


class FinanzaCreate(FinanzaBase):
    socio_id: int = Field(..., description="ID del socio al que pertenece la transacción")


class FinanzaResponse(FinanzaBase):
    id: int
    socio_id: int
    fecha: datetime

    model_config = ConfigDict(from_attributes=True)


class LiquidacionSocioItem(BaseModel):
    socio_id: int
    nombre: str
    cedula: str
    total_ahorrado: Decimal
    porcentaje_participacion: Decimal
    utilidad_ganada: Decimal
    bien_comun_asignado: Decimal
    deuda_prestamos: Decimal
    multas_pendientes: Decimal
    total_neto_entregar: Decimal


class LiquidacionAnualResponse(BaseModel):
    total_ahorro_acumulado: Decimal
    total_utilidades_generadas: Decimal
    total_bien_comun_general: Decimal
    rentabilidad_porcentual: Decimal
    total_deuda_descontada: Decimal
    total_multas_descontadas: Decimal
    gran_total_a_entregar: Decimal
    socios_liquidados: list[LiquidacionSocioItem]

