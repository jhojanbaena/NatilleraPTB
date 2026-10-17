"""Módulo de Modelos ORM de SQLAlchemy.
Expone todas las entidades para registro en Base.metadata y acceso limpio.
"""
from app.models.usuario import Usuario
from app.models.socio import Socio
from app.models.finanzas import FinanzaSocio, TipoMovimientoFinanciero
from app.models.prestamo import Prestamo, AbonoPrestamo, EstadoPrestamo
from app.models.actividad import Actividad
from app.models.rifa import Rifa, TipoRifa
from app.models.reunion import Reunion
from app.models.nota import Nota
from app.models.historial import HistorialMovimiento

__all__ = [
    "Usuario",
    "Socio",
    "FinanzaSocio",
    "TipoMovimientoFinanciero",
    "Prestamo",
    "AbonoPrestamo",
    "EstadoPrestamo",
    "Actividad",
    "Rifa",
    "TipoRifa",
    "Reunion",
    "Nota",
    "HistorialMovimiento",
]
