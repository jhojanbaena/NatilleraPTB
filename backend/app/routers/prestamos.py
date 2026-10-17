"""Router para la Gestión y Consolidación de Préstamos (/prestamos).
Cumple con el criterio RF9 (Consolidar dinero prestado global y lista detallada por socio con su saldo pendiente).
"""
from datetime import date
from decimal import Decimal
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.models.usuario import Usuario
from app.models.socio import Socio
from app.models.prestamo import Prestamo, AbonoPrestamo, EstadoPrestamo
from app.services.historial_service import registrar_movimiento
from app.schemas.prestamo import (
    PrestamoCreate,
    PrestamoResponse,
    AbonoPrestamoCreate,
    AbonoPrestamoResponse,
    ResumenPrestamoSocio
)

router = APIRouter(prefix="/prestamos", tags=["Préstamos"])


@router.post("", response_model=PrestamoResponse, status_code=status.HTTP_201_CREATED, summary="Registrar un nuevo préstamo")
def create_prestamo(
    prestamo_in: PrestamoCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Prestamo:
    """
    Registra un desembolso de préstamo para un socio.
    Calcula intereses proyectados y fija el saldo inicial pendiente.
    """
    # Validar que el socio exista y esté activo
    stmt_socio = select(Socio).where(Socio.id == prestamo_in.socio_id)
    socio = db.execute(stmt_socio).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {prestamo_in.socio_id} no encontrado",
        )

    if not socio.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden emitir préstamos a un socio inactivo",
        )

    # Calcular el interés mensual acumulado durante todas las cuotas pactadas.
    interes_mensual = prestamo_in.monto_prestado * (prestamo_in.tasa_interes / Decimal("100.0"))
    total_intereses = (interes_mensual * prestamo_in.numero_cuotas).quantize(Decimal("0.01"))
    fecha_prestamo = prestamo_in.fecha_prestamo or date.today()

    db_prestamo = Prestamo(
        socio_id=prestamo_in.socio_id,
        monto_prestado=prestamo_in.monto_prestado,
        tasa_interes=prestamo_in.tasa_interes,
        total_intereses=total_intereses,
        saldo_pendiente=prestamo_in.monto_prestado,  # Saldo de capital adeudado
        numero_cuotas=prestamo_in.numero_cuotas,
        cuotas_pagadas=0,
        estado=EstadoPrestamo.PENDIENTE.value,
        fecha_prestamo=fecha_prestamo,
        fecha_vencimiento=prestamo_in.fecha_vencimiento,
    )
    db.add(db_prestamo)
    db.commit()
    db.refresh(db_prestamo)

    registrar_movimiento(
        db=db,
        modulo="Préstamos",
        tipo_accion="CREAR",
        descripcion=f"Préstamo #{db_prestamo.id} registrado para socio {socio.nombre} por ${db_prestamo.monto_prestado:,.2f}",
        entidad_tipo="Prestamo",
        entidad_id=db_prestamo.id,
        datos_nuevos=db_prestamo,
        usuario=current_user,
        commit_now=True
    )

    return db_prestamo


@router.post("/{prestamo_id}/abonos", response_model=AbonoPrestamoResponse, status_code=status.HTTP_201_CREATED, summary="Abonar a cuota de préstamo")
def registrar_abono_prestamo(
    prestamo_id: int,
    abono_in: AbonoPrestamoCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> AbonoPrestamo:
    """
    Registra el pago de una cuota de crédito:
    - Amortiza capital y reduce transaccionalmente el saldo pendiente.
    - Incrementa el conteo de cuotas pagadas.
    - Si el saldo llega a 0, marca el crédito como PAGADO automáticamente.
    """
    stmt = select(Prestamo).where(Prestamo.id == prestamo_id)
    prestamo = db.execute(stmt).scalar_one_or_none()

    if not prestamo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Préstamo con ID {prestamo_id} no encontrado",
        )

    if prestamo.estado == EstadoPrestamo.PAGADO.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El préstamo ya se encuentra completamente cancelado",
        )

    if abono_in.monto_capital is not None:
        monto_interes = abono_in.monto_interes or Decimal("0.00")
        if monto_interes + abono_in.monto_capital != abono_in.monto_abonado:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El capital y el interés deben sumar exactamente el monto abonado",
            )
        if abono_in.monto_capital > prestamo.saldo_pendiente:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El capital abonado no puede superar el saldo pendiente",
            )

    # Calcular desglose capital vs interés si no viene desagregado
    if abono_in.monto_capital is not None:
        monto_capital = abono_in.monto_capital
        monto_interes = abono_in.monto_interes or Decimal("0.00")
    else:
        # Si no se desglosa, se amortiza hasta el tope del saldo de capital
        monto_capital = min(prestamo.saldo_pendiente, abono_in.monto_abonado)
        monto_interes = max(Decimal("0.00"), abono_in.monto_abonado - monto_capital)

    numero_cuota = abono_in.numero_cuota or (prestamo.cuotas_pagadas + 1)

    db_abono = AbonoPrestamo(
        prestamo_id=prestamo_id,
        monto_abonado=abono_in.monto_abonado,
        monto_capital=monto_capital,
        monto_interes=monto_interes,
        numero_cuota=numero_cuota,
    )
    db.add(db_abono)

    # Actualizar estado del préstamo
    prestamo.saldo_pendiente = max(Decimal("0.00"), prestamo.saldo_pendiente - monto_capital)
    prestamo.cuotas_pagadas += 1

    if prestamo.saldo_pendiente == Decimal("0.00"):
        prestamo.estado = EstadoPrestamo.PAGADO.value

    db.commit()
    db.refresh(db_abono)

    registrar_movimiento(
        db=db,
        modulo="Préstamos",
        tipo_accion="CREAR",
        descripcion=f"Abono de cuota #{db_abono.numero_cuota} por ${db_abono.monto_abonado:,.2f} al préstamo #{prestamo_id}",
        entidad_tipo="AbonoPrestamo",
        entidad_id=db_abono.id,
        datos_nuevos=db_abono,
        usuario=current_user,
        commit_now=True
    )

    return db_abono


@router.put("/{prestamo_id}/abonos/{abono_id}", response_model=AbonoPrestamoResponse, summary="Editar un abono de préstamo")
def editar_abono_prestamo(
    prestamo_id: int,
    abono_id: int,
    abono_in: AbonoPrestamoCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> AbonoPrestamo:
    """Corrige los valores de un abono y recalcula el saldo del préstamo."""
    prestamo = db.execute(select(Prestamo).where(Prestamo.id == prestamo_id)).scalar_one_or_none()
    abono = db.execute(
        select(AbonoPrestamo).where(
            AbonoPrestamo.id == abono_id,
            AbonoPrestamo.prestamo_id == prestamo_id,
        )
    ).scalar_one_or_none()

    if not prestamo or not abono:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Préstamo o abono no encontrado",
        )

    monto_interes = abono_in.monto_interes or Decimal("0.00")
    monto_capital = abono_in.monto_capital
    if monto_capital is None:
        monto_capital = min(prestamo.monto_prestado, abono_in.monto_abonado)
        monto_interes = abono_in.monto_abonado - monto_capital

    otros_abonos = [otro for otro in prestamo.abonos if otro.id != abono_id]
    capital_restante = prestamo.monto_prestado - sum(
        (otro.monto_capital for otro in otros_abonos), Decimal("0.00")
    )
    if monto_capital > capital_restante:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El capital abonado supera el capital pendiente del préstamo",
        )

    abono.monto_abonado = abono_in.monto_abonado
    abono.monto_capital = monto_capital
    abono.monto_interes = monto_interes
    abono.numero_cuota = abono_in.numero_cuota or abono.numero_cuota

    total_capital_abonado = sum(
        (item.monto_capital for item in prestamo.abonos), Decimal("0.00")
    )
    total_interes_abonado = sum(
        (item.monto_interes for item in prestamo.abonos), Decimal("0.00")
    )
    prestamo.saldo_pendiente = max(Decimal("0.00"), prestamo.monto_prestado - total_capital_abonado)
    prestamo.cuotas_pagadas = len(prestamo.abonos)
    if (
        prestamo.saldo_pendiente == Decimal("0.00")
        and total_interes_abonado >= prestamo.total_intereses
    ):
        prestamo.estado = EstadoPrestamo.PAGADO.value
    else:
        prestamo.estado = EstadoPrestamo.PENDIENTE.value

    db.commit()
    db.refresh(abono)
    return abono


@router.get("", response_model=List[PrestamoResponse], summary="Listar préstamos")
def list_prestamos(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    socio_id: Optional[int] = Query(None, description="Filtrar por socio"),
    estado: Optional[EstadoPrestamo] = Query(None, description="PENDIENTE, PAGADO o EN_MORA"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
) -> List[Prestamo]:
    """Retorna listado de préstamos ordenados por fecha de desembolso descendente."""
    query = select(Prestamo)

    if socio_id:
        query = query.where(Prestamo.socio_id == socio_id)
    if estado:
        query = query.where(Prestamo.estado == estado.value)

    query = query.order_by(Prestamo.fecha_prestamo.desc()).offset(skip).limit(limit)
    return db.execute(query).scalars().all()


@router.get("/consolidado/global", summary="Consolidado global de préstamos y cartera por socio (RF9)")
def get_consolidado_global_prestamos(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Criterio RF9: Retorna el monto global prestado, el saldo pendiente consolidado y
    una lista detallada por socio con su saldo adeudado.
    """
    # 1. Agregaciones globales
    stmt_global = select(
        func.coalesce(func.sum(Prestamo.monto_prestado), Decimal("0.00")),
        func.coalesce(func.sum(Prestamo.saldo_pendiente), Decimal("0.00")),
        func.count(Prestamo.id)
    )
    monto_global_prestado, saldo_global_pendiente, total_prestamos = db.execute(stmt_global).one()

    # Total préstamos que aún tienen saldo activo
    stmt_activos = select(func.count(Prestamo.id)).where(Prestamo.estado != EstadoPrestamo.PAGADO.value)
    total_activos = db.execute(stmt_activos).scalar_one()

    # 2. Desglose detallado por socio
    stmt_por_socio = (
        select(
            Socio.id,
            Socio.cedula,
            Socio.nombre,
            func.count(Prestamo.id).label("total_prestamos"),
            func.coalesce(func.sum(Prestamo.saldo_pendiente), Decimal("0.00")).label("saldo_pendiente_total")
        )
        .join(Prestamo, Prestamo.socio_id == Socio.id)
        .where(Prestamo.estado != EstadoPrestamo.PAGADO.value)
        .group_by(Socio.id, Socio.cedula, Socio.nombre)
        .order_by(func.sum(Prestamo.saldo_pendiente).desc())
    )
    filas = db.execute(stmt_por_socio).all()

    detalle_socios = [
        ResumenPrestamoSocio(
            socio_id=fila[0],
            cedula=fila[1],
            nombre=fila[2],
            total_prestamos=fila[3],
            saldo_pendiente_total=fila[4],
        )
        for fila in filas
    ]

    return {
        "monto_global_prestado": monto_global_prestado,
        "monto_global_saldo_pendiente": saldo_global_pendiente,
        "total_prestamos_historicos": total_prestamos,
        "total_prestamos_activos": total_activos,
        "socios_con_saldo_pendiente": len(detalle_socios),
        "detalle_por_socio": detalle_socios,
    }


@router.delete("/{prestamo_id}", status_code=status.HTTP_200_OK, summary="Eliminar un préstamo")
def delete_prestamo(
    prestamo_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
):
    """Elimina un préstamo y sus abonos asociados de forma permanente."""
    stmt = select(Prestamo).where(Prestamo.id == prestamo_id)
    prestamo = db.execute(stmt).scalar_one_or_none()

    if not prestamo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Préstamo con ID {prestamo_id} no encontrado",
        )

    total_abonado = sum((abono.monto_abonado for abono in prestamo.abonos), Decimal("0.00"))
    total_deuda = prestamo.monto_prestado + prestamo.total_intereses
    saldo_total = total_deuda - total_abonado
    if saldo_total > Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el préstamo mientras tenga deuda pendiente",
        )

    socio_nombre = prestamo.socio.nombre if prestamo.socio else f"Socio #{prestamo.socio_id}"
    registrar_movimiento(
        db=db,
        modulo="Préstamos",
        tipo_accion="ELIMINAR",
        descripcion=f"Se eliminó el préstamo #{prestamo.id} de {socio_nombre} por ${prestamo.monto_prestado:,.2f}",
        entidad_tipo="Prestamo",
        entidad_id=prestamo.id,
        datos_previos=prestamo,
        usuario=current_user,
        commit_now=False
    )

    db.delete(prestamo)
    db.commit()
    return {"message": f"Préstamo {prestamo_id} eliminado exitosamente", "prestamo_id": prestamo_id}


@router.get("/{prestamo_id}", response_model=PrestamoResponse, summary="Detalle de préstamo con abonos")
def get_prestamo(
    prestamo_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Prestamo:
    """Consulta la ficha completa de un préstamo y el desglose de sus abonos."""
    stmt = select(Prestamo).where(Prestamo.id == prestamo_id)
    prestamo = db.execute(stmt).scalar_one_or_none()

    if not prestamo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Préstamo con ID {prestamo_id} no encontrado",
        )
    return prestamo
