"""Router para la Gestión de Actividades y Eventos (/actividades).
Registra actividades, inversión, ingresos y calcula automáticamente la ganancia neta.
"""
from decimal import Decimal
from typing import Annotated, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.models.usuario import Usuario
from app.models.actividad import Actividad
from app.schemas.actividad import ActividadCreate, ActividadUpdate, ActividadResponse
from app.services.historial_service import registrar_movimiento, model_to_dict

router = APIRouter(prefix="/actividades", tags=["Actividades"])


@router.post("", response_model=ActividadResponse, status_code=status.HTTP_201_CREATED, summary="Registrar una nueva actividad")
def create_actividad(
    actividad_in: ActividadCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Actividad:
    """
    Crea una actividad comunitaria.
    Calcula automáticamente la ganancia neta como (ingresos_brutos - inversión).
    """
    ganancia_neta = actividad_in.ingresos_brutos - actividad_in.inversion

    db_actividad = Actividad(
        nombre=actividad_in.nombre.strip(),
        grupo_encargado=actividad_in.grupo_encargado.strip(),
        fecha=actividad_in.fecha,
        inversion=actividad_in.inversion,
        ingresos_brutos=actividad_in.ingresos_brutos,
        ganancia_neta=ganancia_neta,
        descripcion=actividad_in.descripcion.strip() if actividad_in.descripcion else None,
    )
    db.add(db_actividad)
    db.commit()
    db.refresh(db_actividad)

    registrar_movimiento(
        db=db,
        modulo="Actividades",
        tipo_accion="CREAR",
        descripcion=f"Actividad creada: {db_actividad.nombre} por grupo {db_actividad.grupo_encargado}",
        entidad_tipo="Actividad",
        entidad_id=db_actividad.id,
        datos_nuevos=db_actividad,
        usuario=current_user,
        commit_now=True
    )

    return db_actividad


@router.get("", response_model=List[ActividadResponse], summary="Listar actividades registradas")
def list_actividades(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    desde: Optional[date] = Query(None, description="Filtrar desde esta fecha"),
    hasta: Optional[date] = Query(None, description="Filtrar hasta esta fecha"),
    grupo: Optional[str] = Query(None, description="Filtrar por grupo encargado")
) -> List[Actividad]:
    """Consulta el listado de actividades ordenadas por fecha descendente."""
    query = select(Actividad)

    if desde:
        query = query.where(Actividad.fecha >= desde)
    if hasta:
        query = query.where(Actividad.fecha <= hasta)
    if grupo:
        query = query.where(Actividad.grupo_encargado.ilike(f"%{grupo.strip()}%"))

    query = query.order_by(Actividad.fecha.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/resumen/balance", summary="Resumen financiero global de actividades")
def get_balance_actividades(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Retorna los totales consolidados de inversión, ingresos brutos y ganancias netas."""
    stmt = select(
        func.coalesce(func.sum(Actividad.inversion), Decimal("0.00")),
        func.coalesce(func.sum(Actividad.ingresos_brutos), Decimal("0.00")),
        func.coalesce(func.sum(Actividad.ganancia_neta), Decimal("0.00")),
        func.count(Actividad.id)
    )
    total_inversion, total_ingresos, total_ganancia, total_eventos = db.execute(stmt).one()

    return {
        "total_actividades": total_eventos,
        "total_inversion": total_inversion,
        "total_ingresos_brutos": total_ingresos,
        "total_ganancia_neta": total_ganancia
    }


@router.get("/{actividad_id}", response_model=ActividadResponse, summary="Obtener una actividad por ID")
def get_actividad(
    actividad_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Actividad:
    """Consulta los detalles de una actividad específica."""
    stmt = select(Actividad).where(Actividad.id == actividad_id)
    actividad = db.execute(stmt).scalar_one_or_none()

    if not actividad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Actividad con ID {actividad_id} no encontrada",
        )
    return actividad


@router.put("/{actividad_id}", response_model=ActividadResponse, summary="Actualizar datos de una actividad")
def update_actividad(
    actividad_id: int,
    actividad_in: ActividadUpdate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Actividad:
    """Actualiza una actividad y recalcula automáticamente su ganancia neta."""
    stmt = select(Actividad).where(Actividad.id == actividad_id)
    actividad = db.execute(stmt).scalar_one_or_none()

    if not actividad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Actividad con ID {actividad_id} no encontrada",
        )

    datos_previos = model_to_dict(actividad)

    if actividad_in.nombre is not None:
        actividad.nombre = actividad_in.nombre.strip()
    if actividad_in.grupo_encargado is not None:
        actividad.grupo_encargado = actividad_in.grupo_encargado.strip()
    if actividad_in.fecha is not None:
        actividad.fecha = actividad_in.fecha
    if actividad_in.inversion is not None:
        actividad.inversion = actividad_in.inversion
    if actividad_in.ingresos_brutos is not None:
        actividad.ingresos_brutos = actividad_in.ingresos_brutos
    if actividad_in.descripcion is not None:
        actividad.descripcion = actividad_in.descripcion.strip()

    # Recalcular ganancia neta siempre que se modifiquen ingresos o inversión
    actividad.ganancia_neta = actividad.ingresos_brutos - actividad.inversion

    db.commit()
    db.refresh(actividad)

    registrar_movimiento(
        db=db,
        modulo="Actividades",
        tipo_accion="EDITAR",
        descripcion=f"Actividad actualizada: {actividad.nombre}",
        entidad_tipo="Actividad",
        entidad_id=actividad.id,
        datos_previos=datos_previos,
        datos_nuevos=actividad,
        usuario=current_user,
        commit_now=True
    )

    return actividad


@router.delete("/{actividad_id}", summary="Eliminar una actividad")
def delete_actividad(
    actividad_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """Elimina permanentemente el registro de una actividad."""
    stmt = select(Actividad).where(Actividad.id == actividad_id)
    actividad = db.execute(stmt).scalar_one_or_none()

    if not actividad:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Actividad con ID {actividad_id} no encontrada",
        )

    registrar_movimiento(
        db=db,
        modulo="Actividades",
        tipo_accion="ELIMINAR",
        descripcion=f"Se eliminó la actividad: {actividad.nombre}",
        entidad_tipo="Actividad",
        entidad_id=actividad.id,
        datos_previos=actividad,
        usuario=current_user,
        commit_now=False
    )

    db.delete(actividad)
    db.commit()
    return {"message": f"Actividad {actividad_id} eliminada exitosamente", "actividad_id": actividad_id}
