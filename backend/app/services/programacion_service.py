"""Servicio de Cronograma y Programación Anual Unificada (RF6).
Agrupa y clasifica eventos (Actividades, Cuotas, Rifas internas/grandes, Reuniones, Ventas) filtrables por mes.
"""
from datetime import date
from decimal import Decimal
from typing import List, Optional
import calendar
from sqlalchemy.orm import Session
from sqlalchemy import and_, select, extract, or_
from app.models.actividad import Actividad
from app.models.rifa import Rifa, TipoRifa
from app.models.reunion import Reunion
from app.models.socio import Socio
from app.models.nota import Nota
from app.schemas.programacion import EventoProgramado, TipoEventoProgramado, ProgramacionMesResponse


class ProgramacionService:
    @staticmethod
    def obtener_programacion_mes(
        db: Session,
        mes: int,
        anio: int,
        tipo_filtro: Optional[str] = None
    ) -> ProgramacionMesResponse:
        """
        Criterio RF6: Consolida en una agenda unificada todos los eventos del mes clasificados:
        - Actividad
        - Cuota (Aportes pactados de los socios)
        - Rifa interna
        - Rifa grande
        - Venta (o Rifa pequeña)
        - Reunión
        """
        eventos: List[EventoProgramado] = []

        # 1. Consultar Actividades del mes y año
        stmt_actividades = select(Actividad).where(
            extract("month", Actividad.fecha) == mes,
            extract("year", Actividad.fecha) == anio
        )
        for act in db.execute(stmt_actividades).scalars().all():
            eventos.append(
                EventoProgramado(
                    id=act.id,
                    tipo_evento=TipoEventoProgramado.ACTIVIDAD.value,
                    titulo=act.nombre,
                    fecha=act.fecha,
                    lugar=f"Grupo: {act.grupo_encargado}",
                    descripcion=act.descripcion or f"Inversión: ${act.inversion} | Meta: ${act.ingresos_brutos}",
                    monto_asociado=act.ganancia_neta,
                )
            )

        # 2. Consultar Rifas del mes y año
        stmt_rifas = select(Rifa).where(
            extract("month", Rifa.fecha) == mes,
            extract("year", Rifa.fecha) == anio
        )
        for rifa in db.execute(stmt_rifas).scalars().all():
            if rifa.tipo == TipoRifa.GRANDE.value:
                tipo_clasificado = TipoEventoProgramado.RIFA_GRANDE.value
            elif rifa.tipo == TipoRifa.PEQUENA.value:
                tipo_clasificado = TipoEventoProgramado.VENTA.value
            else:
                tipo_clasificado = TipoEventoProgramado.RIFA_INTERNA.value

            eventos.append(
                EventoProgramado(
                    id=rifa.id,
                    tipo_evento=tipo_clasificado,
                    titulo=rifa.nombre,
                    fecha=rifa.fecha,
                    descripcion=rifa.descripcion or f"Boletas: {rifa.total_boletas} a ${rifa.valor_boleta}",
                    monto_asociado=rifa.ganancias_totales,
                )
            )

        # 3. Consultar Reuniones del mes y año
        stmt_reuniones = select(Reunion).where(
            extract("month", Reunion.fecha) == mes,
            extract("year", Reunion.fecha) == anio
        )
        for reunion in db.execute(stmt_reuniones).scalars().all():
            eventos.append(
                EventoProgramado(
                    id=reunion.id,
                    tipo_evento=TipoEventoProgramado.REUNION.value,
                    titulo=f"Reunión: {reunion.tema}",
                    fecha=reunion.fecha,
                    hora=reunion.hora,
                    lugar=reunion.lugar,
                    descripcion=reunion.compromisos or reunion.tema,
                    monto_asociado=reunion.ganancias_reunion,
                )
            )

        # 4. Actividades de notas programadas para el mes.
        stmt_notas = select(Nota).where(
            or_(
                and_(
                    extract("month", Nota.fecha_programada) == mes,
                    extract("year", Nota.fecha_programada) == anio,
                ),
                and_(
                    Nota.fecha_programada.is_(None),
                    extract("month", Nota.created_at) == mes,
                    extract("year", Nota.created_at) == anio,
                ),
            )
        )
        for nota in db.execute(stmt_notas).scalars().all():
            eventos.append(
                EventoProgramado(
                    id=nota.id,
                    tipo_evento=TipoEventoProgramado.NOTA.value,
                    titulo=nota.titulo or "Actividad programada",
                    fecha=nota.fecha_programada or nota.created_at.date(),
                    descripcion=nota.contenido,
                )
            )

        # 5. Programación de Cuotas esperadas del mes para socios activos
        # Se establece una fecha estimada estándar para el recaudo mensual (ej. día 15 o fin de mes)
        _, ultimo_dia = calendar.monthrange(anio, mes)
        fecha_corte_cuota = date(anio, mes, min(15, ultimo_dia))

        stmt_socios = select(Socio).where(Socio.is_active.is_(True))
        socios_activos = db.execute(stmt_socios).scalars().all()

        for socio in socios_activos:
            eventos.append(
                EventoProgramado(
                    id=socio.id,
                    tipo_evento=TipoEventoProgramado.CUOTA.value,
                    titulo=f"Cuota mensual - {socio.nombre}",
                    fecha=fecha_corte_cuota,
                    descripcion=f"Compromiso de ahorro mensual cédula {socio.cedula}",
                    monto_asociado=socio.aporte_mensual,
                )
            )

        # Filtrar por tipo_filtro si fue solicitado
        if tipo_filtro:
            tipo_filtro_limpio = tipo_filtro.strip().lower()
            eventos = [
                e for e in eventos
                if e.tipo_evento.lower() == tipo_filtro_limpio or tipo_filtro_limpio in e.tipo_evento.lower()
            ]

        # Ordenar cronológicamente por fecha ascendente
        eventos.sort(key=lambda x: (x.fecha, x.hora or "00:00"))

        return ProgramacionMesResponse(
            mes=mes,
            anio=anio,
            total_eventos=len(eventos),
            eventos=eventos,
        )
