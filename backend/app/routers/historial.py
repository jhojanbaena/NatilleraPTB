"""Router para la Gestión y Bitácora del Historial de Movimientos (/historial)."""
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_active_admin
from app.models.usuario import Usuario
from app.models.historial import HistorialMovimiento
from app.schemas.historial import HistorialResponse, HistorialResumen
from app.services.historial_service import revertir_movimiento

router = APIRouter(prefix="/historial", tags=["Historial de Movimientos"])


@router.get("", response_model=List[HistorialResponse], summary="Consultar el historial completo de movimientos")
def list_historial(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    modulo: Optional[str] = Query(None, description="Filtrar por módulo (Socios, Préstamos, Actividades, Rifas, Reuniones, Notas, Finanzas)"),
    tipo_accion: Optional[str] = Query(None, description="Filtrar por acción (CREAR, EDITAR, ELIMINAR, REVERTIR)"),
    revertido: Optional[bool] = Query(None, description="Filtrar por estado de reversión"),
    q: Optional[str] = Query(None, description="Búsqueda por texto en la descripción o usuario"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
) -> List[HistorialMovimiento]:
    """
    Retorna el listado del historial de movimientos ordenado por fecha descendente.
    """
    query = select(HistorialMovimiento)

    if modulo:
        query = query.where(HistorialMovimiento.modulo == modulo)
    if tipo_accion:
        query = query.where(HistorialMovimiento.tipo_accion == tipo_accion)
    if revertido is not None:
        query = query.where(HistorialMovimiento.revertido.is_(revertido))
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                HistorialMovimiento.descripcion.ilike(search_pattern),
                HistorialMovimiento.usuario_nombre.ilike(search_pattern),
                HistorialMovimiento.entidad_tipo.ilike(search_pattern)
            )
        )

    query = query.order_by(HistorialMovimiento.created_at.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/resumen", response_model=HistorialResumen, summary="Resumen estadístico del historial")
def get_historial_resumen(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> HistorialResumen:
    """Retorna los conteos agregados del historial y los últimos 5 movimientos."""
    # Total movimientos
    total_movimientos = db.execute(select(func.count(HistorialMovimiento.id))).scalar_one()

    # Total revertidos
    total_revertidos = db.execute(
        select(func.count(HistorialMovimiento.id)).where(HistorialMovimiento.revertido.is_(True))
    ).scalar_one()

    # Conteo por módulo
    stmt_modulos = (
        select(HistorialMovimiento.modulo, func.count(HistorialMovimiento.id))
        .group_by(HistorialMovimiento.modulo)
    )
    filas = db.execute(stmt_modulos).all()
    movimientos_por_modulo = {fila[0]: fila[1] for fila in filas}

    # Últimos 5
    ultimos = db.execute(
        select(HistorialMovimiento).order_by(HistorialMovimiento.created_at.desc()).limit(5)
    ).scalars().all()

    return HistorialResumen(
        total_movimientos=total_movimientos,
        movimientos_por_modulo=movimientos_por_modulo,
        total_revertidos=total_revertidos,
        ultimos_movimientos=ultimos
    )


@router.post("/{historial_id}/revertir", summary="Revertir una acción registrada en el historial")
def revertir_accion_historial(
    historial_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """
    Ejecuta la reversión (Undo) de un movimiento específico del historial.
    Restaura el estado anterior si fue una ELIMINACIÓN o EDICIÓN, o desactiva/borra si fue una CREACIÓN.
    """
    return revertir_movimiento(db=db, historial_id=historial_id, current_user=current_user)
