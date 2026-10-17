"""Router para la Programación y Cronograma Anual (/programacion).
Cumple con el criterio RF6 (Filtrar por mes y clasificar por tipo de evento).
"""
from typing import Annotated, Optional
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.programacion import ProgramacionMesResponse
from app.services.programacion_service import ProgramacionService

router = APIRouter(prefix="/programacion", tags=["Programación"])


@router.get("", response_model=ProgramacionMesResponse, summary="Cronograma unificado filtrable por mes y tipo (RF6)")
def get_programacion_mes(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    mes: int = Query(
        default=date.today().month,
        ge=1,
        le=12,
        description="Mes a consultar (1 = Enero, 12 = Diciembre)"
    ),
    anio: int = Query(
        default=date.today().year,
        ge=2020,
        le=2050,
        description="Año a consultar"
    ),
    tipo_evento: Optional[str] = Query(
        None,
        description="Filtrar por tipo: Actividad, Cuota, Rifa interna, Venta, Reunión, Rifa grande"
    )
) -> ProgramacionMesResponse:
    """
    Criterio RF6: Unifica y clasifica en un solo cronograma mensual:
    - Actividades
    - Cuotas obligatorias de socios
    - Rifas internas y grandes
    - Ventas
    - Reuniones agendadas
    Permite filtrar por mes, año y tipo de evento específico.
    """
    return ProgramacionService.obtener_programacion_mes(
        db=db,
        mes=mes,
        anio=anio,
        tipo_filtro=tipo_evento
    )
