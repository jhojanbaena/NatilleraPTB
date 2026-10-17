"""Router para la Agenda y Sesiones de Reuniones (/reuniones).
Cumple con el criterio RF7 (Historial en orden cronológico inverso desglosando fecha, hora, temas, compromisos y lugar).
"""
from typing import Annotated, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.models.usuario import Usuario
from app.models.reunion import Reunion
from app.schemas.reunion import ReunionCreate, ReunionUpdate, ReunionResponse
from app.services.historial_service import registrar_movimiento, model_to_dict

router = APIRouter(prefix="/reuniones", tags=["Reuniones"])


@router.post("", response_model=ReunionResponse, status_code=status.HTTP_201_CREATED, summary="Agendar o registrar una reunión")
def create_reunion(
    reunion_in: ReunionCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Reunion:
    """
    Registra una sesión o reunión en la agenda.
    Desglosa fecha, hora, lugar, tema, compromisos, asistentes requeridos y posibles recaudos.
    """
    db_reunion = Reunion(
        fecha=reunion_in.fecha,
        hora=reunion_in.hora.strip(),
        lugar=reunion_in.lugar.strip(),
        tema=reunion_in.tema.strip(),
        compromisos=reunion_in.compromisos.strip() if reunion_in.compromisos else None,
        asistentes_requeridos=reunion_in.asistentes_requeridos.strip() if reunion_in.asistentes_requeridos else None,
        ganancias_reunion=reunion_in.ganancias_reunion,
    )
    db.add(db_reunion)
    db.commit()
    db.refresh(db_reunion)

    registrar_movimiento(
        db=db,
        modulo="Reuniones",
        tipo_accion="CREAR",
        descripcion=f"Reunión agendada: {db_reunion.tema} el {db_reunion.fecha} en {db_reunion.lugar}",
        entidad_tipo="Reunion",
        entidad_id=db_reunion.id,
        datos_nuevos=db_reunion,
        usuario=current_user,
        commit_now=True
    )

    return db_reunion


@router.get("", response_model=List[ReunionResponse], summary="Historial de reuniones en orden cronológico inverso")
def list_reuniones(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    desde: Optional[date] = Query(None, description="Filtrar sesiones desde esta fecha"),
    hasta: Optional[date] = Query(None, description="Filtrar sesiones hasta esta fecha"),
    tema: Optional[str] = Query(None, description="Buscar por palabra clave en el tema o lugar"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
) -> List[Reunion]:
    """
    Criterio RF7: Retorna el historial de reuniones ordenado de forma cronológica inversa
    (las más recientes o futuras primero: fecha desc, hora desc), desglosando todos sus campos.
    """
    query = select(Reunion)

    if desde:
        query = query.where(Reunion.fecha >= desde)
    if hasta:
        query = query.where(Reunion.fecha <= hasta)
    if tema:
        search_pattern = f"%{tema.strip()}%"
        query = query.where(
            or_(
                Reunion.tema.ilike(search_pattern),
                Reunion.lugar.ilike(search_pattern)
            )
        )

    # Orden cronológico inverso estricto (RF7)
    query = query.order_by(Reunion.fecha.desc(), Reunion.hora.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/{reunion_id}", response_model=ReunionResponse, summary="Obtener detalle de una reunión")
def get_reunion(
    reunion_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Reunion:
    """Consulta la minuta o datos completos de una reunión específica."""
    stmt = select(Reunion).where(Reunion.id == reunion_id)
    reunion = db.execute(stmt).scalar_one_or_none()

    if not reunion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reunión con ID {reunion_id} no encontrada",
        )
    return reunion


@router.put("/{reunion_id}", response_model=ReunionResponse, summary="Actualizar acta o datos de una reunión")
def update_reunion(
    reunion_id: int,
    reunion_in: ReunionUpdate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Reunion:
    """Actualiza temas, acuerdos, compromisos adquiridos o recaudos de una reunión."""
    stmt = select(Reunion).where(Reunion.id == reunion_id)
    reunion = db.execute(stmt).scalar_one_or_none()

    if not reunion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reunión con ID {reunion_id} no encontrada",
        )

    datos_previos = model_to_dict(reunion)

    if reunion_in.fecha is not None:
        reunion.fecha = reunion_in.fecha
    if reunion_in.hora is not None:
        reunion.hora = reunion_in.hora.strip()
    if reunion_in.lugar is not None:
        reunion.lugar = reunion_in.lugar.strip()
    if reunion_in.tema is not None:
        reunion.tema = reunion_in.tema.strip()
    if reunion_in.compromisos is not None:
        reunion.compromisos = reunion_in.compromisos.strip()
    if reunion_in.asistentes_requeridos is not None:
        reunion.asistentes_requeridos = reunion_in.asistentes_requeridos.strip()
    if reunion_in.ganancias_reunion is not None:
        reunion.ganancias_reunion = reunion_in.ganancias_reunion

    db.commit()
    db.refresh(reunion)

    registrar_movimiento(
        db=db,
        modulo="Reuniones",
        tipo_accion="EDITAR",
        descripcion=f"Reunión actualizada: {reunion.tema}",
        entidad_tipo="Reunion",
        entidad_id=reunion.id,
        datos_previos=datos_previos,
        datos_nuevos=reunion,
        usuario=current_user,
        commit_now=True
    )

    return reunion


@router.delete("/{reunion_id}", summary="Eliminar una reunión agendada")
def delete_reunion(
    reunion_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """Elimina permanentemente una reunión de la agenda."""
    stmt = select(Reunion).where(Reunion.id == reunion_id)
    reunion = db.execute(stmt).scalar_one_or_none()

    if not reunion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reunión con ID {reunion_id} no encontrada",
        )

    registrar_movimiento(
        db=db,
        modulo="Reuniones",
        tipo_accion="ELIMINAR",
        descripcion=f"Se eliminó la reunión: {reunion.tema}",
        entidad_tipo="Reunion",
        entidad_id=reunion.id,
        datos_previos=reunion,
        usuario=current_user,
        commit_now=False
    )

    db.delete(reunion)
    db.commit()
    return {"message": f"Reunión {reunion_id} eliminada exitosamente", "reunion_id": reunion_id}
