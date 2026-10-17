"""Router para el Lobby / Dashboard Principal y Finanzas Globales (/dashboard y /finanzas).
Cumple con los criterios RF4 (Lobby unificado con métricas y accesos) y RF8 (Cálculo del capital total en tiempo real).
"""
from typing import Annotated
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.models.socio import Socio
from app.models.prestamo import Prestamo, EstadoPrestamo
from app.models.nota import Nota
from app.schemas.dashboard import BienComunResponse, CapitalTotalResponse, DashboardSummaryResponse
from app.schemas.finanzas import LiquidacionAnualResponse
from app.schemas.nota import NotaResponse
from app.services.finanzas_service import FinanzasService
from app.services.programacion_service import ProgramacionService

router = APIRouter(tags=["Dashboard & Finanzas"])


@router.get("/finanzas/bien-comun", response_model=BienComunResponse, summary="Resumen financiero del bien común")
def get_bien_comun(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> BienComunResponse:
    return FinanzasService.calcular_bien_comun(db)


@router.get("/finanzas/liquidacion-anual", response_model=LiquidacionAnualResponse, summary="Liquidación de fin de año y reparto de utilidades")
def get_liquidacion_anual(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> LiquidacionAnualResponse:
    """
    Cálculo contable automatizado de liquidación anual (Diciembre):
    - Devuelve el 100% de los ahorros a cada socio activo.
    - Reparte utilidades del fondo (rifas, eventos, intereses de créditos, multas) en estricta proporción al ahorro.
    - Cruza y descuenta deudas de créditos pendientes y multas impagas.
    """
    return FinanzasService.calcular_liquidacion_anual(db)


@router.get("/finanzas/capital-total", response_model=CapitalTotalResponse, summary="Cálculo general de capital total y balance en tiempo real (RF8)")
@router.get("/finanzas", response_model=CapitalTotalResponse, summary="Resumen financiero de capital total")
def get_capital_total(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> CapitalTotalResponse:
    """
    Criterio RF8: Sumatoria automatizada en tiempo real mediante consultas SQL optimizadas:
    Capital Total = (Aportes netos) + (Multas cobradas) + (Ganancias actividades) + (Ganancias rifas) + (Ganancias reuniones) + (Intereses préstamos)
    También retorna la cartera prestada activa y la liquidez física en caja.
    """
    return FinanzasService.calcular_capital_total(db)


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse, summary="Lobby principal con métricas consolidadas (RF4)")
@router.get("/dashboard", response_model=DashboardSummaryResponse, summary="Lobby principal")
def get_dashboard_summary(
    current_user: Annotated[Usuario, Depends(get_current_user)],
    db: Session = Depends(get_db)
) -> DashboardSummaryResponse:
    """
    Criterio RF4: Endpoint consolidado para el lobby de inicio del usuario:
    - Estado de fondos y capital total.
    - Conteo de socios activos.
    - Préstamos activos y en mora.
    - Próximos eventos programados del mes en curso.
    - Últimas notas y avisos de la bitácora.
    """
    # 1. Capital y fondos
    capital_info = FinanzasService.calcular_capital_total(db)

    # 2. Conteo de socios activos
    stmt_socios = select(func.count(Socio.id)).where(Socio.is_active.is_(True))
    total_socios_activos = db.execute(stmt_socios).scalar_one()

    # 3. Préstamos activos y en mora
    stmt_activos = select(func.count(Prestamo.id)).where(Prestamo.estado != EstadoPrestamo.PAGADO.value)
    total_prestamos_activos = db.execute(stmt_activos).scalar_one()

    stmt_mora = select(func.count(Prestamo.id)).where(Prestamo.estado == EstadoPrestamo.EN_MORA.value)
    total_prestamos_en_mora = db.execute(stmt_mora).scalar_one()

    # 4. Próximos eventos del mes
    hoy = date.today()
    programacion = ProgramacionService.obtener_programacion_mes(db, mes=hoy.month, anio=hoy.year)
    # Excluir eventos ya vencidos y limitar la respuesta para el dashboard.
    proximos_eventos = [evento for evento in programacion.eventos if evento.fecha >= hoy][:5]

    # 5. Últimas notas
    stmt_notas = select(Nota).order_by(Nota.created_at.desc()).limit(5)
    ultimas_notas_orm = db.execute(stmt_notas).scalars().all()
    ultimas_notas = [NotaResponse.model_validate(n) for n in ultimas_notas_orm]

    return DashboardSummaryResponse(
        capital=capital_info,
        total_socios_activos=total_socios_activos,
        total_prestamos_activos=total_prestamos_activos,
        total_prestamos_en_mora=total_prestamos_en_mora,
        proximos_eventos=proximos_eventos,
        ultimas_notas=ultimas_notas,
    )
