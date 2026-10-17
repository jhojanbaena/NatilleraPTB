"""Servicio centralizado para el Registro y Reversión del Historial de Movimientos."""
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import inspect, select

from app.models.historial import HistorialMovimiento
from app.models.usuario import Usuario
from app.models.socio import Socio
from app.models.prestamo import Prestamo, AbonoPrestamo
from app.models.actividad import Actividad
from app.models.rifa import Rifa
from app.models.reunion import Reunion
from app.models.nota import Nota
from app.models.finanzas import FinanzaSocio


def custom_json_serializer(obj: Any) -> Any:
    """Serializador personalizado para tipos de datos Decimal, date y datetime."""
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def model_to_dict(obj: Any, include_relationships: bool = True) -> Dict[str, Any]:
    """Convierte un objeto SQLAlchemy ORM a un diccionario serializable en JSON."""
    if obj is None:
        return {}
    
    result = {}
    mapper = inspect(obj.__class__)
    for column in mapper.columns:
        val = getattr(obj, column.key)
        if isinstance(val, Decimal):
            result[column.key] = str(val)
        elif isinstance(val, (datetime, date)):
            result[column.key] = val.isoformat()
        else:
            result[column.key] = val

    # Incluir relaciones hijo críticas al eliminar entidades padre
    if include_relationships:
        if isinstance(obj, Prestamo) and hasattr(obj, "abonos") and obj.abonos:
            result["abonos"] = [model_to_dict(a, include_relationships=False) for a in obj.abonos]
        elif isinstance(obj, Socio) and hasattr(obj, "finanzas") and obj.finanzas:
            result["finanzas"] = [model_to_dict(f, include_relationships=False) for f in obj.finanzas]

    return result


def registrar_movimiento(
    db: Session,
    modulo: str,
    tipo_accion: str,
    descripcion: str,
    entidad_tipo: str,
    entidad_id: Optional[int] = None,
    datos_previos: Optional[Any] = None,
    datos_nuevos: Optional[Any] = None,
    usuario: Optional[Usuario] = None,
    commit_now: bool = False
) -> HistorialMovimiento:
    """
    Registra un evento en la bitácora de auditoría / historial de movimientos.
    """
    prev_json = None
    if datos_previos is not None:
        if isinstance(datos_previos, (dict, list)):
            prev_json = json.dumps(datos_previos, default=custom_json_serializer, ensure_ascii=False)
        elif hasattr(datos_previos, "__tablename__"):
            prev_json = json.dumps(model_to_dict(datos_previos), default=custom_json_serializer, ensure_ascii=False)
        else:
            prev_json = str(datos_previos)

    new_json = None
    if datos_nuevos is not None:
        if isinstance(datos_nuevos, (dict, list)):
            new_json = json.dumps(datos_nuevos, default=custom_json_serializer, ensure_ascii=False)
        elif hasattr(datos_nuevos, "__tablename__"):
            new_json = json.dumps(model_to_dict(datos_nuevos), default=custom_json_serializer, ensure_ascii=False)
        else:
            new_json = str(datos_nuevos)

    usuario_id = usuario.id if usuario else None
    usuario_nombre = (usuario.nombre_completo or usuario.username) if usuario else "Sistema"

    historial = HistorialMovimiento(
        modulo=modulo,
        tipo_accion=tipo_accion,
        descripcion=descripcion,
        entidad_tipo=entidad_tipo,
        entidad_id=entidad_id,
        datos_previos=prev_json,
        datos_nuevos=new_json,
        usuario_id=usuario_id,
        usuario_nombre=usuario_nombre,
        revertido=False
    )
    db.add(historial)
    if commit_now:
        db.commit()
        db.refresh(historial)
    return historial


def revertir_movimiento(db: Session, historial_id: int, current_user: Usuario) -> Dict[str, Any]:
    """
    Ejecuta la reversión (Undo) de una acción registrada en el historial.
    Soporta la restauración completa de items borrados, revertir creaciones o restaurar estados editados.
    """
    stmt = select(HistorialMovimiento).where(HistorialMovimiento.id == historial_id)
    historial = db.execute(stmt).scalar_one_or_none()

    if not historial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Movimiento con ID {historial_id} no encontrado en el historial",
        )

    if historial.revertido:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este movimiento ya fue revertido previamente",
        )

    entidad_tipo = historial.entidad_tipo
    tipo_accion = historial.tipo_accion

    # 1. REVERTIR ELIMINACIÓN (Restaurar registro exacto con sus mismos valores e ID)
    if tipo_accion == "ELIMINAR":
        if not historial.datos_previos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos previos guardados para revertir esta eliminación",
            )
        datos = json.loads(historial.datos_previos)

        if entidad_tipo == "Prestamo":
            # Recrear préstamo
            db_prestamo = Prestamo(
                id=datos.get("id"),
                socio_id=datos["socio_id"],
                monto_prestado=Decimal(str(datos["monto_prestado"])),
                tasa_interes=Decimal(str(datos.get("tasa_interes", "0.00"))),
                total_intereses=Decimal(str(datos.get("total_intereses", "0.00"))),
                saldo_pendiente=Decimal(str(datos["saldo_pendiente"])),
                numero_cuotas=int(datos["numero_cuotas"]),
                cuotas_pagadas=int(datos.get("cuotas_pagadas", 0)),
                estado=datos.get("estado", "PENDIENTE"),
                fecha_prestamo=date.fromisoformat(datos["fecha_prestamo"]) if datos.get("fecha_prestamo") else date.today(),
                fecha_vencimiento=date.fromisoformat(datos["fecha_vencimiento"]) if datos.get("fecha_vencimiento") else None,
            )
            db.merge(db_prestamo) # db.merge maneja inserción de clave primaria preservando el ID

            # Restaurar abonos asociados si existían
            if "abonos" in datos and datos["abonos"]:
                for ab in datos["abonos"]:
                    db_abono = AbonoPrestamo(
                        id=ab.get("id"),
                        prestamo_id=datos.get("id"),
                        monto_abonado=Decimal(str(ab["monto_abonado"])),
                        monto_capital=Decimal(str(ab["monto_capital"])),
                        monto_interes=Decimal(str(ab.get("monto_interes", "0.00"))),
                        numero_cuota=int(ab["numero_cuota"]),
                        fecha_pago=datetime.fromisoformat(ab["fecha_pago"]) if ab.get("fecha_pago") else datetime.now()
                    )
                    db.merge(db_abono)

        elif entidad_tipo == "Socio":
            db_socio = Socio(
                id=datos.get("id"),
                cedula=datos["cedula"],
                nombre=datos["nombre"],
                telefono=datos["telefono"],
                residencia=datos["residencia"],
                aporte_mensual=Decimal(str(datos.get("aporte_mensual", "0.00"))),
                is_active=datos.get("is_active", True)
            )
            db.merge(db_socio)

            if "finanzas" in datos and datos["finanzas"]:
                for f in datos["finanzas"]:
                    db_f = FinanzaSocio(
                        id=f.get("id"),
                        socio_id=datos.get("id"),
                        tipo_movimiento=f["tipo_movimiento"],
                        monto=Decimal(str(f["monto"])),
                        descripcion=f.get("descripcion")
                    )
                    db.merge(db_f)

        elif entidad_tipo == "AbonoPrestamo":
            db_abono = AbonoPrestamo(
                id=datos.get("id"),
                prestamo_id=datos["prestamo_id"],
                monto_abonado=Decimal(str(datos["monto_abonado"])),
                monto_capital=Decimal(str(datos["monto_capital"])),
                monto_interes=Decimal(str(datos.get("monto_interes", "0.00"))),
                numero_cuota=int(datos["numero_cuota"]),
            )
            db.merge(db_abono)
            # Recalcular saldo pendiente en préstamo
            prestamo = db.get(Prestamo, datos["prestamo_id"])
            if prestamo:
                prestamo.saldo_pendiente = max(Decimal("0.00"), prestamo.saldo_pendiente - Decimal(str(datos["monto_capital"])))

        elif entidad_tipo == "Actividad":
            db_act = Actividad(
                id=datos.get("id"),
                nombre=datos["nombre"],
                grupo_encargado=datos["grupo_encargado"],
                fecha=date.fromisoformat(datos["fecha"]) if datos.get("fecha") else date.today(),
                inversion=Decimal(str(datos.get("inversion", "0.00"))),
                ingresos_brutos=Decimal(str(datos.get("ingresos_brutos", "0.00"))),
                ganancia_neta=Decimal(str(datos.get("ganancia_neta", "0.00"))),
                descripcion=datos.get("descripcion")
            )
            db.merge(db_act)

        elif entidad_tipo == "Rifa":
            db_rifa = Rifa(
                id=datos.get("id"),
                nombre=datos["nombre"],
                tipo=datos["tipo"],
                fecha=date.fromisoformat(datos["fecha"]) if datos.get("fecha") else date.today(),
                inversion_premios=Decimal(str(datos.get("inversion_premios", "0.00"))),
                valor_boleta=Decimal(str(datos.get("valor_boleta", "0.00"))),
                total_boletas=int(datos.get("total_boletas", 0)),
                boletas_vendidas=int(datos.get("boletas_vendidas", 0)),
                ganancia_por_boleta=Decimal(str(datos.get("ganancia_por_boleta", "0.00"))),
                ganancias_totales=Decimal(str(datos.get("ganancias_totales", "0.00"))),
                descripcion=datos.get("descripcion")
            )
            db.merge(db_rifa)

        elif entidad_tipo == "Reunion":
            db_reu = Reunion(
                id=datos.get("id"),
                fecha=date.fromisoformat(datos["fecha"]) if datos.get("fecha") else date.today(),
                hora=datos.get("hora", "00:00"),
                lugar=datos.get("lugar", ""),
                tema=datos.get("tema", ""),
                compromisos=datos.get("compromisos"),
                asistentes_requeridos=datos.get("asistentes_requeridos"),
                ganancias_reunion=Decimal(str(datos.get("ganancias_reunion", "0.00")))
            )
            db.merge(db_reu)

        elif entidad_tipo == "Nota":
            db_nota = Nota(
                id=datos.get("id"),
                titulo=datos.get("titulo"),
                contenido=datos["contenido"],
                fecha_programada=date.fromisoformat(datos["fecha_programada"]) if datos.get("fecha_programada") else None
            )
            db.merge(db_nota)

        elif entidad_tipo == "FinanzaSocio":
            db_fin = FinanzaSocio(
                id=datos.get("id"),
                socio_id=datos["socio_id"],
                tipo_movimiento=datos["tipo_movimiento"],
                monto=Decimal(str(datos["monto"])),
                descripcion=datos.get("descripcion")
            )
            db.merge(db_fin)

    # 2. REVERTIR CREACIÓN (Eliminar la entidad recién creada)
    elif tipo_accion == "CREAR":
        entidad_id = historial.entidad_id
        if not entidad_id and historial.datos_nuevos:
            datos = json.loads(historial.datos_nuevos)
            entidad_id = datos.get("id")

        if entidad_id:
            if entidad_tipo == "Prestamo":
                obj = db.get(Prestamo, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "Socio":
                obj = db.get(Socio, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "AbonoPrestamo":
                obj = db.get(AbonoPrestamo, entidad_id)
                if obj:
                    # Ajustar saldo al borrar abono
                    prestamo = db.get(Prestamo, obj.prestamo_id)
                    if prestamo:
                        prestamo.saldo_pendiente += obj.monto_capital
                        prestamo.cuotas_pagadas = max(0, prestamo.cuotas_pagadas - 1)
                        if prestamo.saldo_pendiente > 0:
                            prestamo.estado = "PENDIENTE"
                    db.delete(obj)
            elif entidad_tipo == "Actividad":
                obj = db.get(Actividad, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "Rifa":
                obj = db.get(Rifa, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "Reunion":
                obj = db.get(Reunion, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "Nota":
                obj = db.get(Nota, entidad_id)
                if obj: db.delete(obj)
            elif entidad_tipo == "FinanzaSocio":
                obj = db.get(FinanzaSocio, entidad_id)
                if obj: db.delete(obj)

    # 3. REVERTIR EDICIÓN (Restaurar campos a datos_previos)
    elif tipo_accion == "EDITAR":
        if not historial.datos_previos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay datos previos guardados para restaurar la edición",
            )
        datos = json.loads(historial.datos_previos)
        entidad_id = historial.entidad_id or datos.get("id")

        if entidad_id:
            if entidad_tipo == "Prestamo":
                obj = db.get(Prestamo, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k in ["monto_prestado", "tasa_interes", "total_intereses", "saldo_pendiente"]:
                            setattr(obj, k, Decimal(str(v)))
                        elif k in ["fecha_prestamo", "fecha_vencimiento"] and v:
                            setattr(obj, k, date.fromisoformat(v))
                        elif k not in ["id", "created_at", "abonos"]:
                            setattr(obj, k, v)
            elif entidad_tipo == "Socio":
                obj = db.get(Socio, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k == "aporte_mensual":
                            setattr(obj, k, Decimal(str(v)))
                        elif k not in ["id", "created_at", "finanzas", "prestamos"]:
                            setattr(obj, k, v)
            elif entidad_tipo == "Actividad":
                obj = db.get(Actividad, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k in ["inversion", "ingresos_brutos", "ganancia_neta"]:
                            setattr(obj, k, Decimal(str(v)))
                        elif k == "fecha" and v:
                            setattr(obj, k, date.fromisoformat(v))
                        elif k not in ["id", "created_at"]:
                            setattr(obj, k, v)
            elif entidad_tipo == "Rifa":
                obj = db.get(Rifa, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k in ["inversion_premios", "valor_boleta", "ganancia_por_boleta", "ganancias_totales"]:
                            setattr(obj, k, Decimal(str(v)))
                        elif k == "fecha" and v:
                            setattr(obj, k, date.fromisoformat(v))
                        elif k not in ["id", "created_at"]:
                            setattr(obj, k, v)
            elif entidad_tipo == "Reunion":
                obj = db.get(Reunion, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k == "ganancias_reunion":
                            setattr(obj, k, Decimal(str(v)))
                        elif k == "fecha" and v:
                            setattr(obj, k, date.fromisoformat(v))
                        elif k not in ["id", "created_at"]:
                            setattr(obj, k, v)
            elif entidad_tipo == "Nota":
                obj = db.get(Nota, entidad_id)
                if obj:
                    for k, v in datos.items():
                        if k == "fecha_programada":
                            setattr(obj, k, date.fromisoformat(v) if v else None)
                        elif k not in ["id", "created_at", "updated_at"]:
                            setattr(obj, k, v)

    # Marcar log original como revertido
    historial.revertido = True

    # Registrar el nuevo evento de auditoría para la Reversión
    desc_reversión = f"Reversión de {tipo_accion.lower()} en {entidad_tipo} #{historial.entidad_id or ''}: {historial.descripcion}"
    registrar_movimiento(
        db=db,
        modulo=historial.modulo,
        tipo_accion="REVERTIR",
        descripcion=desc_reversión,
        entidad_tipo=entidad_tipo,
        entidad_id=historial.entidad_id,
        datos_previos=historial.datos_nuevos,
        datos_nuevos=historial.datos_previos,
        usuario=current_user,
        commit_now=False
    )

    db.commit()
    return {"message": "Movimiento revertido exitosamente", "historial_id": historial_id}
