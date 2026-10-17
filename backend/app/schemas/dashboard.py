"""Esquemas de validación Pydantic para el Dashboard Principal y Cálculos de Capital."""
from decimal import Decimal
from typing import List
from pydantic import BaseModel
from app.schemas.nota import NotaResponse
from app.schemas.programacion import EventoProgramado


class CapitalTotalResponse(BaseModel):
    """Cálculo financiero consolidado en tiempo real."""
    total_aportes_socios: Decimal
    total_multas_cobradas: Decimal
    total_ganancias_actividades: Decimal
    total_ganancias_rifas: Decimal
    total_ganancias_reuniones: Decimal
    total_intereses_prestamos: Decimal
    capital_total: Decimal  # Suma total acumulada de fondos
    total_dinero_prestado_activo: Decimal  # Cartera activa (saldo pendiente en la calle)
    liquidez_disponible_caja: Decimal  # Capital total menos saldo prestado


class BienComunSocioItem(BaseModel):
    id: int
    nombre: str
    participacion: Decimal


class BienComunResponse(BaseModel):
    """Resumen de multas administradas como recurso del bien común."""
    total_multas_recaudadas: Decimal
    total_intereses_obtenidos: Decimal
    total_dinero_total: Decimal
    socios: List[BienComunSocioItem]


class DashboardSummaryResponse(BaseModel):
    """Resumen integral para el Lobby / Dashboard principal (RF4)."""
    capital: CapitalTotalResponse
    total_socios_activos: int
    total_prestamos_activos: int
    total_prestamos_en_mora: int
    proximos_eventos: List[EventoProgramado]
    ultimas_notas: List[NotaResponse]
