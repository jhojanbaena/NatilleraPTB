"""Router para Notas y Bitácora Rápida (/notas).
Cumple con el criterio RF5 (Guardar texto libre con fecha y hora asignadas automáticamente por el backend).
"""
from typing import Annotated, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.models.usuario import Usuario
from app.models.nota import Nota
from app.schemas.nota import NotaCreate, NotaUpdate, NotaResponse
from app.services.historial_service import registrar_movimiento, model_to_dict

router = APIRouter(prefix="/notas", tags=["Notas"])


@router.post("", response_model=NotaResponse, status_code=status.HTTP_201_CREATED, summary="Crear apunte de texto rápido")
def create_nota(
    nota_in: NotaCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Nota:
    """
    Guarda una nota de texto libre en la bitácora.
    La fecha y hora de creación son asignadas automáticamente por el backend.
    """
    db_nota = Nota(
        titulo=nota_in.titulo.strip() if nota_in.titulo else None,
        contenido=nota_in.contenido.strip(),
        fecha_programada=nota_in.fecha_programada,
    )
    db.add(db_nota)
    db.commit()
    db.refresh(db_nota)

    registrar_movimiento(
        db=db,
        modulo="Notas",
        tipo_accion="CREAR",
        descripcion=f"Nota creada: {db_nota.titulo or 'Sin Título'}",
        entidad_tipo="Nota",
        entidad_id=db_nota.id,
        datos_nuevos=db_nota,
        usuario=current_user,
        commit_now=True
    )

    return db_nota


@router.get("", response_model=List[NotaResponse], summary="Listar notas de la bitácora")
def list_notas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    q: Optional[str] = Query(None, description="Búsqueda por palabra clave en título o contenido")
) -> List[Nota]:
    """Retorna las notas registradas ordenadas cronológicamente en orden descendente (más recientes primero)."""
    query = select(Nota)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Nota.titulo.ilike(search_pattern),
                Nota.contenido.ilike(search_pattern)
            )
        )

    query = query.order_by(Nota.created_at.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/{nota_id}", response_model=NotaResponse, summary="Obtener una nota por ID")
def get_nota(
    nota_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Nota:
    """Consulta los detalles de una nota específica."""
    stmt = select(Nota).where(Nota.id == nota_id)
    nota = db.execute(stmt).scalar_one_or_none()

    if not nota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nota con ID {nota_id} no encontrada",
        )
    return nota


@router.put("/{nota_id}", response_model=NotaResponse, summary="Actualizar contenido de una nota")
def update_nota(
    nota_id: int,
    nota_in: NotaUpdate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Nota:
    """Modifica el título o contenido de una nota y actualiza su fecha de modificación."""
    stmt = select(Nota).where(Nota.id == nota_id)
    nota = db.execute(stmt).scalar_one_or_none()

    if not nota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nota con ID {nota_id} no encontrada",
        )

    datos_previos = model_to_dict(nota)

    if nota_in.titulo is not None:
        nota.titulo = nota_in.titulo.strip() if nota_in.titulo else None
    if nota_in.contenido is not None:
        nota.contenido = nota_in.contenido.strip()
    if nota_in.fecha_programada is not None:
        nota.fecha_programada = nota_in.fecha_programada

    nota.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(nota)

    registrar_movimiento(
        db=db,
        modulo="Notas",
        tipo_accion="EDITAR",
        descripcion=f"Nota actualizada: {nota.titulo or 'Sin Título'}",
        entidad_tipo="Nota",
        entidad_id=nota.id,
        datos_previos=datos_previos,
        datos_nuevos=nota,
        usuario=current_user,
        commit_now=True
    )

    return nota


@router.delete("/{nota_id}", summary="Eliminar una nota")
def delete_nota(
    nota_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """Elimina permanentemente una nota de la bitácora."""
    stmt = select(Nota).where(Nota.id == nota_id)
    nota = db.execute(stmt).scalar_one_or_none()

    if not nota:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nota con ID {nota_id} no encontrada",
        )

    registrar_movimiento(
        db=db,
        modulo="Notas",
        tipo_accion="ELIMINAR",
        descripcion=f"Se eliminó la nota: {nota.titulo or 'Sin Título'}",
        entidad_tipo="Nota",
        entidad_id=nota.id,
        datos_previos=nota,
        usuario=current_user,
        commit_now=False
    )

    db.delete(nota)
    db.commit()
    return {"message": f"Nota {nota_id} eliminada exitosamente", "nota_id": nota_id}
