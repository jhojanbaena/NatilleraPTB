"""Esquemas de validación Pydantic para el Cronograma y Programación Anual."""
from datetime import date
from decimal import Decimal
from typing import List, Optional
import enum
from pydantic import BaseModel, Field


class TipoEventoProgramado(str, enum.Enum):
    ACTIVIDAD = "Actividad"
    CUOTA = "Cuota"
    RIFA_INTERNA = "Rifa interna"
    VENTA = "Venta"
    REUNION = "Reunión"
    RIFA_GRANDE = "Rifa grande"
    NOTA = "Nota"


class EventoProgramado(BaseModel):
    id: int = Field(..., description="ID de la entidad de origen")
    tipo_evento: str = Field(..., description="Clasificación del evento")
    titulo: str = Field(..., description="Título o descripción breve")
    fecha: date = Field(..., description="Fecha programada del evento")
    hora: Optional[str] = Field(None, description="Hora de realización si aplica")
    lugar: Optional[str] = Field(None, description="Lugar si aplica")
    descripcion: Optional[str] = Field(None, description="Información detallada")
    monto_asociado: Optional[Decimal] = Field(None, description="Monto proyectado, recaudado o comprometido")


class ProgramacionMesResponse(BaseModel):
    mes: int
    anio: int
    total_eventos: int
    eventos: List[EventoProgramado]
