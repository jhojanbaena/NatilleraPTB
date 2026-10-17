"""Servicio de Cálculos Financieros y Agregaciones SQL en Tiempo Real (RF8).
Realiza consultas optimizadas con funciones agregadas nativas para el cálculo del capital total.
"""
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.socio import Socio
from app.models.finanzas import FinanzaSocio, TipoMovimientoFinanciero
from app.models.actividad import Actividad
from app.models.rifa import Rifa
from app.models.reunion import Reunion
from app.models.prestamo import Prestamo, AbonoPrestamo, EstadoPrestamo
from app.schemas.dashboard import BienComunResponse, BienComunSocioItem, CapitalTotalResponse
from app.schemas.finanzas import LiquidacionSocioItem, LiquidacionAnualResponse


class FinanzasService:
    @staticmethod
    def calcular_bien_comun(db: Session) -> BienComunResponse:
        """Consolida multas pagadas e intereses cobrados desde la cuarta cuota."""
        total_multas_pagadas = db.execute(
            select(func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))).where(
                FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.PAGO_MULTA.value
            )
        ).scalar_one()
        total_intereses_bien_comun = db.execute(
            select(func.coalesce(func.sum(AbonoPrestamo.monto_interes), Decimal("0.00")))
            .where(AbonoPrestamo.numero_cuota >= 4)
        ).scalar_one()
        total_intereses_obtenidos = db.execute(
            select(func.coalesce(func.sum(AbonoPrestamo.monto_interes), Decimal("0.00")))
        ).scalar_one()
        total_dinero_total = total_multas_pagadas + total_intereses_bien_comun
        socios = db.execute(select(Socio).order_by(Socio.nombre.asc())).scalars().all()
        participacion = (
            (total_dinero_total / len(socios)).quantize(Decimal("0.01"))
            if socios else Decimal("0.00")
        )

        return BienComunResponse(
            total_multas_recaudadas=total_multas_pagadas,
            total_intereses_obtenidos=total_intereses_obtenidos,
            total_dinero_total=total_dinero_total,
            socios=[
                BienComunSocioItem(
                    id=socio.id,
                    nombre=socio.nombre,
                    participacion=participacion,
                )
                for socio in socios
            ],
        )

    @staticmethod
    def calcular_capital_total(db: Session) -> CapitalTotalResponse:
        """
        Cálculo financiero automatizado en tiempo real (RF8):
        Capital Total = (Aportes netos de socios)
                      + (Multas efectivamente cobradas)
                      + (Ganancias netas de actividades)
                      + (Ganancias netas de rifas)
                      + (Ganancias recaudadas en reuniones)
                      + (Intereses cobrados por préstamos)
        
        Además desglosa:
        - Cartera en circulación (total_dinero_prestado_activo)
        - Liquidez disponible en caja (capital_total - total_dinero_prestado_activo)
        """
        # 1. Aportes de socios (Aportes menos retiros)
        stmt_aportes = select(
            func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
        ).where(FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.APORTE.value)
        total_aportes_bruto = db.execute(stmt_aportes).scalar_one()

        stmt_retiros = select(
            func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
        ).where(FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.RETIRO_AHORRO.value)
        total_retiros = db.execute(stmt_retiros).scalar_one()

        total_aportes_netos = max(Decimal("0.00"), total_aportes_bruto - total_retiros)

        # 2. Multas cobradas (pagadas)
        stmt_multas = select(
            func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
        ).where(FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.PAGO_MULTA.value)
        total_multas_cobradas = db.execute(stmt_multas).scalar_one()

        # 3. Ganancias de actividades
        stmt_actividades = select(
            func.coalesce(func.sum(Actividad.ganancia_neta), Decimal("0.00"))
        )
        total_ganancias_actividades = db.execute(stmt_actividades).scalar_one()

        # 4. Ganancias de rifas
        stmt_rifas = select(
            func.coalesce(func.sum(Rifa.ganancias_totales), Decimal("0.00"))
        )
        total_ganancias_rifas = db.execute(stmt_rifas).scalar_one()

        # 5. Ganancias en reuniones
        stmt_reuniones = select(
            func.coalesce(func.sum(Reunion.ganancias_reunion), Decimal("0.00"))
        )
        total_ganancias_reuniones = db.execute(stmt_reuniones).scalar_one()

        # 6. Intereses cobrados por préstamos (de la tabla de abonos)
        stmt_intereses = select(
            func.coalesce(func.sum(AbonoPrestamo.monto_interes), Decimal("0.00"))
        )
        total_intereses_prestamos = db.execute(stmt_intereses).scalar_one()

        # Capital Total
        capital_total = (
            total_aportes_netos
            + total_multas_cobradas
            + total_ganancias_actividades
            + total_ganancias_rifas
            + total_ganancias_reuniones
            + total_intereses_prestamos
        )

        # Cartera activa prestada (Saldo pendiente en la calle)
        stmt_cartera = select(
            func.coalesce(func.sum(Prestamo.saldo_pendiente), Decimal("0.00"))
        ).where(Prestamo.estado != EstadoPrestamo.PAGADO.value)
        total_dinero_prestado_activo = db.execute(stmt_cartera).scalar_one()

        # Liquidez física disponible en caja
        liquidez_disponible_caja = capital_total - total_dinero_prestado_activo

        return CapitalTotalResponse(
            total_aportes_socios=total_aportes_netos,
            total_multas_cobradas=total_multas_cobradas,
            total_ganancias_actividades=total_ganancias_actividades,
            total_ganancias_rifas=total_ganancias_rifas,
            total_ganancias_reuniones=total_ganancias_reuniones,
            total_intereses_prestamos=total_intereses_prestamos,
            capital_total=capital_total,
            total_dinero_prestado_activo=total_dinero_prestado_activo,
            liquidez_disponible_caja=liquidez_disponible_caja,
        )

    @staticmethod
    def calcular_liquidacion_anual(db: Session) -> LiquidacionAnualResponse:
        """
        Cálculo financiero automatizado de liquidación de fin de año y reparto de utilidades:
        1. Consolidar el fondo de utilidades (multas cobradas + actividades + rifas + reuniones + intereses de préstamos).
        2. Determinar el ahorro acumulado por cada socio activo.
        3. Distribuir las utilidades proporcionalmente según el ahorro de cada socio.
        4. Descontar préstamos pendientes y multas no pagadas de cada socio.
        5. Retornar el informe global de liquidación y la nómina detallada socio por socio.
        """
        # 1. Utilidades generadas por cada fuente del fondo común
        stmt_multas = select(
            func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
        ).where(FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.PAGO_MULTA.value)
        total_multas_cobradas = db.execute(stmt_multas).scalar_one()

        stmt_actividades = select(
            func.coalesce(func.sum(Actividad.ganancia_neta), Decimal("0.00"))
        )
        total_ganancias_actividades = db.execute(stmt_actividades).scalar_one()

        stmt_rifas = select(
            func.coalesce(func.sum(Rifa.ganancias_totales), Decimal("0.00"))
        )
        total_ganancias_rifas = db.execute(stmt_rifas).scalar_one()

        stmt_reuniones = select(
            func.coalesce(func.sum(Reunion.ganancias_reunion), Decimal("0.00"))
        )
        total_ganancias_reuniones = db.execute(stmt_reuniones).scalar_one()

        stmt_intereses = select(
            func.coalesce(func.sum(AbonoPrestamo.monto_interes), Decimal("0.00"))
        )
        total_intereses_prestamos = db.execute(stmt_intereses).scalar_one()

        total_utilidades = (
            total_multas_cobradas
            + total_ganancias_actividades
            + total_ganancias_rifas
            + total_ganancias_reuniones
            + total_intereses_prestamos
        )

        total_bien_comun_general = FinanzasService.calcular_bien_comun(db).total_dinero_total

        # 2. Obtener todos los socios activos ordenados alfabéticamente
        socios = db.execute(select(Socio).order_by(Socio.nombre.asc())).scalars().all()

        datos_socios = []
        total_ahorro_acumulado = Decimal("0.00")

        for s in socios:
            # Aportes brutos del socio
            stmt_ap = select(
                func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
            ).where(
                FinanzaSocio.socio_id == s.id,
                FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.APORTE.value
            )
            ap = db.execute(stmt_ap).scalar_one()

            # Retiros del socio
            stmt_ret = select(
                func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
            ).where(
                FinanzaSocio.socio_id == s.id,
                FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.RETIRO_AHORRO.value
            )
            ret = db.execute(stmt_ret).scalar_one()
            ahorrado = max(Decimal("0.00"), ap - ret)

            # Los intereses de las tres primeras cuotas se suman al ahorro personal.
            stmt_prestamos_socio = select(Prestamo).where(Prestamo.socio_id == s.id)
            todos_prestamos_socio = db.execute(stmt_prestamos_socio).scalars().all()
            intereses_ahorro_personal = sum(
                (
                    abono.monto_interes
                    for prestamo in todos_prestamos_socio
                    for abono in prestamo.abonos
                    if abono.numero_cuota <= 3
                ),
                Decimal("0.00"),
            )
            ahorrado += intereses_ahorro_personal

            # Deuda pendiente en préstamos, incluyendo el interés aún no pagado.
            prestamos_socio = [
                prestamo
                for prestamo in todos_prestamos_socio
                if prestamo.estado != EstadoPrestamo.PAGADO.value
            ]
            deuda = sum(
                (
                    prestamo.saldo_pendiente
                    + max(
                        Decimal("0.00"),
                        prestamo.total_intereses
                        - sum(
                            (abono.monto_interes for abono in prestamo.abonos),
                            Decimal("0.00"),
                        ),
                    )
                for prestamo in prestamos_socio
            ), Decimal("0.00"))

            # Multas pendientes: (MULTA cargada - PAGO_MULTA realizado)
            stmt_m_cargadas = select(
                func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
            ).where(
                FinanzaSocio.socio_id == s.id,
                FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.MULTA.value
            )
            m_cargadas = db.execute(stmt_m_cargadas).scalar_one()

            stmt_m_pagadas = select(
                func.coalesce(func.sum(FinanzaSocio.monto), Decimal("0.00"))
            ).where(
                FinanzaSocio.socio_id == s.id,
                FinanzaSocio.tipo_movimiento == TipoMovimientoFinanciero.PAGO_MULTA.value
            )
            m_pagadas = db.execute(stmt_m_pagadas).scalar_one()
            multas_pendientes = max(Decimal("0.00"), m_cargadas - m_pagadas)

            total_ahorro_acumulado += ahorrado
            datos_socios.append({
                "socio": s,
                "ahorrado": ahorrado,
                "deuda": deuda,
                "multas_pendientes": multas_pendientes,
            })

        # Rentabilidad porcentual del fondo
        if total_ahorro_acumulado > Decimal("0.00"):
            rentabilidad_porcentual = (
                (total_utilidades / total_ahorro_acumulado) * Decimal("100.00")
            ).quantize(Decimal("0.01"))
        else:
            rentabilidad_porcentual = Decimal("0.00")

        socios_liquidados: list[LiquidacionSocioItem] = []
        total_deuda_descontada = Decimal("0.00")
        total_multas_descontadas = Decimal("0.00")
        gran_total_a_entregar = Decimal("0.00")
        bien_comun_por_socio = (
            (total_bien_comun_general / len(socios)).quantize(Decimal("0.01"))
            if socios else Decimal("0.00")
        )

        for item in datos_socios:
            s = item["socio"]
            ahorrado = item["ahorrado"]
            deuda = item["deuda"]
            multas = item["multas_pendientes"]

            if total_ahorro_acumulado > Decimal("0.00") and ahorrado > Decimal("0.00"):
                participacion = (
                    (ahorrado / total_ahorro_acumulado) * Decimal("100.00")
                ).quantize(Decimal("0.01"))
                utilidad = Decimal("0.00")
            else:
                participacion = Decimal("0.00")
                utilidad = Decimal("0.00")

            total_bruto = ahorrado + utilidad + bien_comun_por_socio
            deducciones = deuda + multas
            neto_entregar = total_bruto - deducciones

            total_deuda_descontada += deuda
            total_multas_descontadas += multas
            gran_total_a_entregar += neto_entregar

            socios_liquidados.append(
                LiquidacionSocioItem(
                    socio_id=s.id,
                    nombre=s.nombre,
                    cedula=s.cedula,
                    total_ahorrado=ahorrado,
                    porcentaje_participacion=participacion,
                    utilidad_ganada=utilidad,
                    bien_comun_asignado=bien_comun_por_socio,
                    deuda_prestamos=deuda,
                    multas_pendientes=multas,
                    total_neto_entregar=neto_entregar,
                )
            )

        return LiquidacionAnualResponse(
            total_ahorro_acumulado=total_ahorro_acumulado,
            total_utilidades_generadas=total_utilidades,
            total_bien_comun_general=total_bien_comun_general,
            rentabilidad_porcentual=rentabilidad_porcentual,
            total_deuda_descontada=total_deuda_descontada,
            total_multas_descontadas=total_multas_descontadas,
            gran_total_a_entregar=gran_total_a_entregar,
            socios_liquidados=socios_liquidados,
        )

