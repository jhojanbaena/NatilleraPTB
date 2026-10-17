"""Router para la Gestión Integral de Socios (/socios).
Cumple con los criterios RF2-RF3 (CRUD completo, listado ordenado y perfil financiero detallado).
"""
from decimal import Decimal
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func
from app.core.database import get_db
from app.core.deps import get_current_active_admin, get_current_user
from app.models.usuario import Usuario
from app.models.socio import Socio
from app.models.finanzas import FinanzaSocio, TipoMovimientoFinanciero
from app.models.prestamo import Prestamo, EstadoPrestamo
from app.schemas.socio import SocioCreate, SocioUpdate, SocioResponse, SocioDetailResponse
from app.schemas.finanzas import FinanzaBase, FinanzaResponse
from app.services.historial_service import registrar_movimiento, model_to_dict

router = APIRouter(prefix="/socios", tags=["Socios"])


@router.post("", response_model=SocioResponse, status_code=status.HTTP_201_CREATED, summary="Registrar un nuevo socio")
def create_socio(
    socio_in: SocioCreate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Socio:
    """
    Crea un nuevo socio en el fondo.
    Valida obligatoriamente: Cédula única, nombre, teléfono, residencia y aporte mensual pactado.
    """
    stmt = select(Socio).where(Socio.cedula == socio_in.cedula.strip())
    existing_socio = db.execute(stmt).scalar_one_or_none()

    if existing_socio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un socio registrado con la cédula {socio_in.cedula}",
        )

    if socio_in.id is not None:
        existing_id = db.execute(select(Socio).where(Socio.id == socio_in.id)).scalar_one_or_none()
        if existing_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un socio registrado con el ID {socio_in.id}",
            )

    db_socio = Socio(
        id=socio_in.id,
        cedula=socio_in.cedula.strip(),
        nombre=socio_in.nombre.strip(),
        telefono=socio_in.telefono.strip(),
        residencia=socio_in.residencia.strip(),
        aporte_mensual=socio_in.aporte_mensual,
        is_active=True,
    )
    db.add(db_socio)
    db.commit()
    db.refresh(db_socio)

    registrar_movimiento(
        db=db,
        modulo="Socios",
        tipo_accion="CREAR",
        descripcion=f"Socio registrado: {db_socio.nombre} (C.C. {db_socio.cedula})",
        entidad_tipo="Socio",
        entidad_id=db_socio.id,
        datos_nuevos=db_socio,
        usuario=current_user,
        commit_now=True
    )

    return db_socio


@router.get("", response_model=List[SocioResponse], summary="Listado general de socios")
def list_socios(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Paginación: registros a omitir"),
    limit: int = Query(100, ge=1, le=500, description="Paginación: límite de registros"),
    q: Optional[str] = Query(None, description="Búsqueda por nombre o cédula"),
    solo_activos: bool = Query(True, description="Filtrar únicamente socios activos"),
    ordenar_por: str = Query("nombre", pattern="^(nombre|cedula|id)$", description="Campo de ordenamiento")
) -> List[Socio]:
    """
    Retorna el listado general de socios ordenado alfabéticamente por nombre (o id/cédula).
    Permite búsqueda por texto y paginación.
    """
    query = select(Socio)

    if solo_activos:
        query = query.where(Socio.is_active.is_(True))

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Socio.nombre.ilike(search_pattern),
                Socio.cedula.ilike(search_pattern)
            )
        )

    if ordenar_por == "id":
        query = query.order_by(Socio.id.asc())
    elif ordenar_por == "cedula":
        query = query.order_by(Socio.cedula.asc())
    else:
        query = query.order_by(Socio.nombre.asc())

    query = query.offset(skip).limit(limit)
    socios = db.execute(query).scalars().all()
    return socios


@router.get("/{socio_id}", response_model=SocioResponse, summary="Obtener información básica de un socio")
def get_socio(
    socio_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> Socio:
    """Consulta los datos básicos de un socio por su ID."""
    stmt = select(Socio).where(Socio.id == socio_id)
    socio = db.execute(stmt).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {socio_id} no encontrado",
        )
    return socio


@router.put("/{socio_id}", response_model=SocioResponse, summary="Actualizar datos de un socio")
def update_socio(
    socio_id: int,
    socio_in: SocioUpdate,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> Socio:
    """Actualiza la información personal o cuota mensual de un socio."""
    stmt = select(Socio).where(Socio.id == socio_id)
    socio = db.execute(stmt).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {socio_id} no encontrado",
        )

    datos_previos = model_to_dict(socio)

    # Validar que la cédula no esté en uso por otro socio
    if socio_in.cedula and socio_in.cedula.strip() != socio.cedula:
        cedula_check = select(Socio).where(
            Socio.cedula == socio_in.cedula.strip(),
            Socio.id != socio_id
        )
        if db.execute(cedula_check).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La cédula {socio_in.cedula} ya está asignada a otro miembro",
            )
        socio.cedula = socio_in.cedula.strip()

    if socio_in.nombre is not None:
        socio.nombre = socio_in.nombre.strip()
    if socio_in.telefono is not None:
        socio.telefono = socio_in.telefono.strip()
    if socio_in.residencia is not None:
        socio.residencia = socio_in.residencia.strip()
    if socio_in.aporte_mensual is not None:
        socio.aporte_mensual = socio_in.aporte_mensual
    if socio_in.is_active is not None:
        socio.is_active = socio_in.is_active

    db.commit()
    db.refresh(socio)

    registrar_movimiento(
        db=db,
        modulo="Socios",
        tipo_accion="EDITAR",
        descripcion=f"Datos actualizados del socio {socio.nombre} (C.C. {socio.cedula})",
        entidad_tipo="Socio",
        entidad_id=socio.id,
        datos_previos=datos_previos,
        datos_nuevos=socio,
        usuario=current_user,
        commit_now=True
    )

    return socio


@router.delete("/{socio_id}", summary="Eliminar o desactivar un socio")
def delete_socio(
    socio_id: int,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    hard_delete: bool = Query(False, description="True para borrado físico permanente, False para inactivación"),
    db: Session = Depends(get_db)
):
    """
    Desactiva (soft-delete por defecto) o borra permanentemente un socio y su registro en cascada.
    """
    stmt = select(Socio).where(Socio.id == socio_id)
    socio = db.execute(stmt).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {socio_id} no encontrado",
        )

    if hard_delete:
        registrar_movimiento(
            db=db,
            modulo="Socios",
            tipo_accion="ELIMINAR",
            descripcion=f"Se eliminó permanentemente al socio {socio.nombre} (C.C. {socio.cedula})",
            entidad_tipo="Socio",
            entidad_id=socio.id,
            datos_previos=socio,
            usuario=current_user,
            commit_now=False
        )
        db.delete(socio)
        db.commit()
        return {"message": f"Socio {socio_id} eliminado permanentemente", "socio_id": socio_id}
    else:
        datos_previos = model_to_dict(socio)
        socio.is_active = False
        db.commit()
        registrar_movimiento(
            db=db,
            modulo="Socios",
            tipo_accion="EDITAR",
            descripcion=f"Se desactivó al socio {socio.nombre} (C.C. {socio.cedula})",
            entidad_tipo="Socio",
            entidad_id=socio.id,
            datos_previos=datos_previos,
            datos_nuevos=socio,
            usuario=current_user,
            commit_now=True
        )
        return {"message": f"Socio {socio_id} desactivado exitosamente", "socio_id": socio_id}


@router.get("/{socio_id}/perfil", response_model=SocioDetailResponse, summary="Perfil financiero detallado del socio")
def get_socio_perfil(
    socio_id: int,
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> SocioDetailResponse:
    """
    Genera el estado de cuenta y perfil financiero consolidado del socio:
    - Dinero ahorrado (Aportes netos).
    - Multas generadas vs pagadas y saldo pendiente por multas.
    - Estado y saldo de créditos o préstamos activos.
    - Historial completo de movimientos transaccionales.
    """
    stmt = select(Socio).where(Socio.id == socio_id)
    socio = db.execute(stmt).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {socio_id} no encontrado",
        )

    # 1. Historial de transacciones
    stmt_finanzas = select(FinanzaSocio).where(FinanzaSocio.socio_id == socio_id).order_by(FinanzaSocio.fecha.desc())
    historial_finanzas = db.execute(stmt_finanzas).scalars().all()

    total_aportes = Decimal("0.00")
    total_retiros = Decimal("0.00")
    total_multas = Decimal("0.00")
    total_multas_pagadas = Decimal("0.00")

    for f in historial_finanzas:
        if f.tipo_movimiento == TipoMovimientoFinanciero.APORTE.value:
            total_aportes += f.monto
        elif f.tipo_movimiento == TipoMovimientoFinanciero.RETIRO_AHORRO.value:
            total_retiros += f.monto
        elif f.tipo_movimiento == TipoMovimientoFinanciero.MULTA.value:
            total_multas += f.monto
        elif f.tipo_movimiento == TipoMovimientoFinanciero.PAGO_MULTA.value:
            total_multas_pagadas += f.monto

    total_ahorrado = max(Decimal("0.00"), total_aportes - total_retiros)
    total_multas_pendientes = max(Decimal("0.00"), total_multas - total_multas_pagadas)

    # 2. Préstamos del socio
    stmt_prestamos = select(Prestamo).where(Prestamo.socio_id == socio_id).order_by(Prestamo.fecha_prestamo.desc())
    prestamos = db.execute(stmt_prestamos).scalars().all()

    total_prestamos_activos = sum(1 for p in prestamos if p.estado != EstadoPrestamo.PAGADO.value)
    saldo_prestamos_pendiente = sum(p.saldo_pendiente for p in prestamos if p.estado != EstadoPrestamo.PAGADO.value)

    return SocioDetailResponse(
        id=socio.id,
        cedula=socio.cedula,
        nombre=socio.nombre,
        telefono=socio.telefono,
        residencia=socio.residencia,
        aporte_mensual=socio.aporte_mensual,
        is_active=socio.is_active,
        created_at=socio.created_at,
        total_ahorrado=total_ahorrado,
        total_multas_pendientes=total_multas_pendientes,
        total_multas_pagadas=total_multas_pagadas,
        total_prestamos_activos=total_prestamos_activos,
        saldo_prestamos_pendiente=saldo_prestamos_pendiente,
        historial_finanzas=historial_finanzas,
        prestamos=prestamos,
    )


@router.post("/{socio_id}/movimientos", response_model=FinanzaResponse, status_code=status.HTTP_201_CREATED, summary="Registrar movimiento financiero a socio (Aporte, Multa, Pago)")
def create_socio_movimiento(
    socio_id: int,
    movimiento_in: FinanzaBase,
    current_user: Annotated[Usuario, Depends(get_current_active_admin)],
    db: Session = Depends(get_db)
) -> FinanzaSocio:
    """
    Registra directamente un aporte, multa o pago de multa para el socio indicado.
    """
    stmt = select(Socio).where(Socio.id == socio_id)
    socio = db.execute(stmt).scalar_one_or_none()

    if not socio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Socio con ID {socio_id} no encontrado",
        )

    db_movimiento = FinanzaSocio(
        socio_id=socio_id,
        tipo_movimiento=movimiento_in.tipo_movimiento.value,
        monto=movimiento_in.monto,
        descripcion=movimiento_in.descripcion,
    )
    db.add(db_movimiento)
    db.commit()
    db.refresh(db_movimiento)

    registrar_movimiento(
        db=db,
        modulo="Finanzas",
        tipo_accion="CREAR",
        descripcion=f"Movimiento '{db_movimiento.tipo_movimiento}' por ${db_movimiento.monto:,.2f} registrado para socio {socio.nombre}",
        entidad_tipo="FinanzaSocio",
        entidad_id=db_movimiento.id,
        datos_nuevos=db_movimiento,
        usuario=current_user,
        commit_now=True
    )

    return db_movimiento
