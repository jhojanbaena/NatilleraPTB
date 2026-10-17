"""Router para la Gestión de Rifas y Sorteos (/rifas).
Gestiona sorteos comunitarios y calcula automáticamente sus métricas financieras.
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
from app.models.rifa import Rifa, TipoRifa
from app.schemas.rifa import RifaCreate, RifaUpdate, RifaResponse
from app.services.historial_service import registrar_movimiento, model_to_dict

router = APIRouter(prefix="/rifas", tags=["Rifas"])


def _calcular_metricas_rifa(
    inversion_premios: Decimal,
    valor_boleta: Decimal,
    total_boletas: int,
    boletas_vendidas: int
) -> tuple[Decimal, Decimal]:
    """Calcula las ganancias totales y el margen de ganancia por boleta vendida."""
    recaudo_bruto = Decimal(boletas_vendidas) * valor_boleta
    ganancias_totales = recaudo_bruto - inversion_premios

    if boletas_vendidas > 0:
        ganancia_por_boleta = (ganancias_totales / Decimal(boletas_vendidas)).quantize(Decimal("0.01"))
    elif total_boletas > 0:
        # Costo unitario por boleta proyectada
        costo_por_boleta = inversion_premios / Decimal(total_boletas)
        ganancia_por_boleta = (valor_boleta - costo_por_boleta).quantize(Decimal("0.01"))
    else:
        ganancia_por_boleta = Decimal("0.00")

    return ganancias_totales, ganancia_por_boleta


@router.post("", response_model=RifaResponse, status_code=status.HTTP_201_CREATED, summary="Crear una nueva rifa")
def create_rifa(
    rifa_in: RifaCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Rifa:
    """
    Registra una rifa y calcula métricas:
    - Ganancias totales = (boletas_vendidas * valor_boleta) - inversión_premios.
    - Ganancia neta promedio por boleta vendida.
    """
    ganancias_totales, ganancia_por_boleta = _calcular_metricas_rifa(
        rifa_in.inversion_premios,
        rifa_in.valor_boleta,
        rifa_in.total_boletas,
        rifa_in.boletas_vendidas
    )

    db_rifa = Rifa(
        nombre=rifa_in.nombre.strip(),
        tipo=rifa_in.tipo.value if isinstance(rifa_in.tipo, TipoRifa) else rifa_in.tipo,
        fecha=rifa_in.fecha,
        inversion_premios=rifa_in.inversion_premios,
        valor_boleta=rifa_in.valor_boleta,
        total_boletas=rifa_in.total_boletas,
        boletas_vendidas=rifa_in.boletas_vendidas,
        ganancia_por_boleta=ganancia_por_boleta,
        ganancias_totales=ganancias_totales,
        descripcion=rifa_in.descripcion.strip() if rifa_in.descripcion else None,
    )
    db.add(db_rifa)
    db.commit()
    db.refresh(db_rifa)

    registrar_movimiento(
        db=db,
        modulo="Rifas",
        tipo_accion="CREAR",
        descripcion=f"Rifa registrada: {db_rifa.nombre} (Tipo {db_rifa.tipo})",
        entidad_tipo="Rifa",
        entidad_id=db_rifa.id,
        datos_nuevos=db_rifa,
        usuario=current_user,
        commit_now=True
    )

    return db_rifa


@router.get("", response_model=List[RifaResponse], summary="Listar rifas registradas")
def list_rifas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    tipo: Optional[TipoRifa] = Query(None, description="Filtrar por tipo (INTERNA, GRANDE, PEQUENA)"),
    desde: Optional[date] = Query(None, description="Fecha mínima del sorteo"),
    hasta: Optional[date] = Query(None, description="Fecha máxima del sorteo"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
) -> List[Rifa]:
    """Retorna el listado de rifas ordenadas por fecha descendente."""
    query = select(Rifa)

    if tipo:
        query = query.where(Rifa.tipo == tipo.value)
    if desde:
        query = query.where(Rifa.fecha >= desde)
    if hasta:
        query = query.where(Rifa.fecha <= hasta)

    query = query.order_by(Rifa.fecha.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/resumen/metricas", summary="Métricas financieras consolidadas de rifas")
def get_metricas_rifas(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Calcula totales globales de premios entregados, boletas vendidas y ganancias totales."""
    stmt = select(
        func.coalesce(func.sum(Rifa.inversion_premios), Decimal("0.00")),
        func.coalesce(func.sum(Rifa.ganancias_totales), Decimal("0.00")),
        func.coalesce(func.sum(Rifa.total_boletas), 0),
        func.coalesce(func.sum(Rifa.boletas_vendidas), 0),
        func.count(Rifa.id)
    )
    inversion, ganancias, boletas_totales, vendidas, num_rifas = db.execute(stmt).one()

    return {
        "total_rifas": num_rifas,
        "total_boletas_emitidas": boletas_totales,
        "total_boletas_vendidas": vendidas,
        "total_inversion_premios": inversion,
        "total_ganancias_netas": ganancias
    }


@router.get("/{rifa_id}", response_model=RifaResponse, summary="Obtener una rifa por ID")
def get_rifa(
    rifa_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Rifa:
    """Consulta la información detallada de una rifa específica."""
    stmt = select(Rifa).where(Rifa.id == rifa_id)
    rifa = db.execute(stmt).scalar_one_or_none()

    if not rifa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rifa con ID {rifa_id} no encontrada",
        )
    return rifa


@router.put("/{rifa_id}", response_model=RifaResponse, summary="Actualizar datos de una rifa")
def update_rifa(
    rifa_id: int,
    rifa_in: RifaUpdate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Rifa:
    """Actualiza una rifa y recalcula sus balances y métricas financieras."""
    stmt = select(Rifa).where(Rifa.id == rifa_id)
    rifa = db.execute(stmt).scalar_one_or_none()

    if not rifa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rifa con ID {rifa_id} no encontrada",
        )

    datos_previos = model_to_dict(rifa)

    if rifa_in.nombre is not None:
        rifa.nombre = rifa_in.nombre.strip()
    if rifa_in.tipo is not None:
        rifa.tipo = rifa_in.tipo.value if isinstance(rifa_in.tipo, TipoRifa) else rifa_in.tipo
    if rifa_in.fecha is not None:
        rifa.fecha = rifa_in.fecha
    if rifa_in.inversion_premios is not None:
        rifa.inversion_premios = rifa_in.inversion_premios
    if rifa_in.valor_boleta is not None:
        rifa.valor_boleta = rifa_in.valor_boleta
    if rifa_in.total_boletas is not None:
        rifa.total_boletas = rifa_in.total_boletas
    if rifa_in.boletas_vendidas is not None:
        rifa.boletas_vendidas = rifa_in.boletas_vendidas
    if rifa_in.descripcion is not None:
        rifa.descripcion = rifa_in.descripcion.strip()

    # Recalcular métricas
    ganancias_totales, ganancia_por_boleta = _calcular_metricas_rifa(
        rifa.inversion_premios,
        rifa.valor_boleta,
        rifa.total_boletas,
        rifa.boletas_vendidas
    )
    rifa.ganancias_totales = ganancias_totales
    rifa.ganancia_por_boleta = ganancia_por_boleta

    db.commit()
    db.refresh(rifa)

    registrar_movimiento(
        db=db,
        modulo="Rifas",
        tipo_accion="EDITAR",
        descripcion=f"Rifa actualizada: {rifa.nombre}",
        entidad_tipo="Rifa",
        entidad_id=rifa.id,
        datos_previos=datos_previos,
        datos_nuevos=rifa,
        usuario=current_user,
        commit_now=True
    )

    return rifa


@router.delete("/{rifa_id}", summary="Eliminar una rifa")
def delete_rifa(
    rifa_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """Elimina permanentemente una rifa de la base de datos."""
    stmt = select(Rifa).where(Rifa.id == rifa_id)
    rifa = db.execute(stmt).scalar_one_or_none()

    if not rifa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rifa con ID {rifa_id} no encontrada",
        )

    registrar_movimiento(
        db=db,
        modulo="Rifas",
        tipo_accion="ELIMINAR",
        descripcion=f"Se eliminó la rifa: {rifa.nombre}",
        entidad_tipo="Rifa",
        entidad_id=rifa.id,
        datos_previos=rifa,
        usuario=current_user,
        commit_now=False
    )

    db.delete(rifa)
    db.commit()
    return {"message": f"Rifa {rifa_id} eliminada exitosamente", "rifa_id": rifa_id}
