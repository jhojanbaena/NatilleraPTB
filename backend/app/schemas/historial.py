"""Esquemas Pydantic para la consulta y respuesta del Historial de Movimientos."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class HistorialResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    modulo: str
    tipo_accion: str
    descripcion: str
    entidad_tipo: str
    entidad_id: Optional[int] = None
    datos_previos: Optional[str] = None
    datos_nuevos: Optional[str] = None
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    revertido: bool
    historial_origen_id: Optional[int] = None
    created_at: datetime


class HistorialResumen(BaseModel):
    total_movimientos: int
    movimientos_por_modulo: Dict[str, int]
    total_revertidos: int
    ultimos_movimientos: List[HistorialResponse]
