import React, { useState, useEffect } from "react";
import {
  HandCoins, Plus, BadgePercent, CreditCard, ChevronDown, ChevronUp, DollarSign, Trash2, Edit
} from "lucide-react";
import api from "../api/client";
import { Modal } from "../components/Modal";
import { formatMoney, formatDate } from "../utils/formatters";

export const Prestamos = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [socios, setSocios] = useState([]);
  const [consolidado, setConsolidado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Modal nuevo préstamo
  const [isPrestamoModalOpen, setIsPrestamoModalOpen] = useState(false);
  const [prestamoForm, setPrestamoForm] = useState({
    socio_id: "", monto_prestado: "", tasa_interes: "5.0",
    numero_cuotas: 4, fecha_prestamo: new Date().toISOString().slice(0, 10),
  });
  const [submittingPrestamo, setSubmittingPrestamo] = useState(false);

  // Modal abonar cuota
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const [abonoForm, setAbonoForm] = useState({
    monto_abonado: "", monto_capital: "", monto_interes: "0",
  });
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const [editingAbono, setEditingAbono] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [presRes, socRes, conRes] = await Promise.all([
        api.get("/prestamos"),
        api.get("/socios"),
        api.get("/prestamos/consolidado/global"),
      ]);
      setPrestamos(presRes.data);
      setSocios(socRes.data);
      setConsolidado(conRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreatePrestamo = async (e) => {
    e.preventDefault();
    if (!prestamoForm.socio_id || !prestamoForm.monto_prestado || !prestamoForm.numero_cuotas) {
      alert("Completa el socio, el monto y el número de cuotas.");
      return;
    }

    try {
      setSubmittingPrestamo(true);
      await api.post("/prestamos", {
        socio_id: Number(prestamoForm.socio_id),
        monto_prestado: prestamoForm.monto_prestado,
        tasa_interes: prestamoForm.tasa_interes || "0",
        numero_cuotas: Number(prestamoForm.numero_cuotas),
        fecha_prestamo: prestamoForm.fecha_prestamo || null,
      });
      setIsPrestamoModalOpen(false);
      setPrestamoForm({
        socio_id: "",
        monto_prestado: "",
        tasa_interes: "5.0",
        numero_cuotas: 4,
        fecha_prestamo: new Date().toISOString().slice(0, 10),
      });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al registrar el préstamo.");
    } finally {
      setSubmittingPrestamo(false);
    }
  };

  const handleAbono = async (e) => {
    e.preventDefault();
    const montoAbonado = Number(abonoForm.monto_abonado);
    const montoCapital = Number(abonoForm.monto_capital);
    const montoInteres = Number(abonoForm.monto_interes || "0");

    if (!Number.isFinite(montoAbonado) || montoAbonado <= 0) {
      alert("Ingresa un monto total válido para el abono.");
      return;
    }
    if (!Number.isFinite(montoCapital) || montoCapital < 0 || !Number.isFinite(montoInteres) || montoInteres < 0) {
      alert("Ingresa valores válidos para capital e interés.");
      return;
    }
    if (Math.round((montoCapital + montoInteres) * 100) !== Math.round(montoAbonado * 100)) {
      alert("El capital y el interés deben sumar exactamente el monto total abonado.");
      return;
    }

    try {
      setSubmittingAbono(true);
      const payload = {
        prestamo_id: selectedPrestamo.id,
        monto_abonado: abonoForm.monto_abonado,
        monto_capital: abonoForm.monto_capital,
        monto_interes: abonoForm.monto_interes || "0",
        numero_cuota: editingAbono?.numero_cuota || selectedPrestamo.cuotas_pagadas + 1,
      };
      if (editingAbono) {
        await api.put(`/prestamos/${selectedPrestamo.id}/abonos/${editingAbono.id}`, payload);
      } else {
        await api.post(`/prestamos/${selectedPrestamo.id}/abonos`, payload);
      }
      setIsAbonoModalOpen(false);
      setEditingAbono(null);
      setAbonoForm({ monto_abonado: "", monto_capital: "", monto_interes: "0" });
      await fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail;
      alert(message || "Error al registrar el abono.");
    } finally {
      setSubmittingAbono(false);
    }
  };

  const openEditAbono = (prestamo, abono) => {
    setSelectedPrestamo(prestamo);
    setEditingAbono(abono);
    setAbonoForm({
      monto_abonado: String(abono.monto_abonado),
      monto_capital: String(abono.monto_capital),
      monto_interes: String(abono.monto_interes),
    });
    setIsAbonoModalOpen(true);
  };

  const handleDeletePrestamo = async (prestamo) => {
    if (getTotalPendiente(prestamo) > 0) {
      alert("No se puede eliminar el préstamo mientras tenga deuda pendiente.");
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el préstamo #${prestamo.id} y todos sus abonos? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/prestamos/${prestamo.id}`);
      if (expandedId === prestamo.id) setExpandedId(null);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Error al eliminar el préstamo.");
    }
  };

  const estadoColor = (estado) => {
    if (estado === "PAGADO") return "bg-emerald-100 text-emerald-800";
    if (estado === "EN_MORA") return "bg-rose-100 text-rose-800";
    return "bg-amber-100 text-amber-800";
  };

  const getSocioNombre = (socioId) => (
    socios.find((socio) => socio.id === socioId)?.nombre || `Socio #${socioId}`
  );

  const getTotalInicial = (prestamo) => (
    Number(prestamo.monto_prestado) + Number(prestamo.total_intereses || 0)
  );

  const getTotalAbonado = (prestamo) => (
    (prestamo.abonos || []).reduce((total, abono) => total + Number(abono.monto_abonado || 0), 0)
  );

  const getCapitalAbonado = (prestamo) => (
    (prestamo.abonos || []).reduce((total, abono) => total + Number(abono.monto_capital || 0), 0)
  );

  const getInteresesAbonados = (prestamo) => (
    (prestamo.abonos || []).reduce((total, abono) => total + Number(abono.monto_interes || 0), 0)
  );

  const getCapitalPendiente = (prestamo) => (
    Math.max(0, Number(prestamo.monto_prestado) - getCapitalAbonado(prestamo))
  );

  const getInteresesPendientes = (prestamo) => (
    Math.max(0, Number(prestamo.total_intereses || 0) - getInteresesAbonados(prestamo))
  );

  const getTotalPendiente = (prestamo) => (
    Math.max(0, getTotalInicial(prestamo) - getTotalAbonado(prestamo))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <HandCoins className="w-7 h-7 text-purple-600" />
            Préstamos y Cartera Activa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de créditos, cuotas y amortización de capital e intereses.</p>
        </div>
        <button
          onClick={() => setIsPrestamoModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nuevo Préstamo
        </button>
      </div>

      {/* Consolidado global */}
      {consolidado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Desembolsado</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{formatMoney(consolidado.monto_global_prestado)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-purple-200/80 shadow-sm bg-purple-50/30">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Saldo Pendiente Activo</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{formatMoney(consolidado.monto_global_saldo_pendiente)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Préstamos registrados</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{consolidado.total_prestamos_historicos}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-sm bg-emerald-50/30">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Préstamos en circulación</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{consolidado.total_activos}</p>
          </div>
        </div>
      )}

      {/* Lista de préstamos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando cartera de préstamos...
          </div>
        ) : prestamos.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {prestamos.map((p) => (
              <div key={p.id} className="p-4 sm:p-5 hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 text-sm">{getSocioNombre(p.socio_id)}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estadoColor(p.estado)}`}>{p.estado}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Préstamo #{p.id} · Fecha: {formatDate(p.fecha_prestamo)} · Cuotas: {p.cuotas_pagadas}/{p.numero_cuotas} · Tasa: {p.tasa_interes}%
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total pendiente</p>
                      <p className="font-black text-purple-700 text-lg">{formatMoney(getTotalPendiente(p))}</p>
                      <p className="text-[11px] text-slate-400">Total inicial: {formatMoney(getTotalInicial(p))}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {p.estado !== "PAGADO" && (
                        <button
                          onClick={() => { setSelectedPrestamo(p); setIsAbonoModalOpen(true); }}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-lg transition-colors"
                        >
                          Abonar
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 justify-center"
                      >
                        Detalle
                        {expandedId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleDeletePrestamo(p)}
                        disabled={getTotalPendiente(p) > 0}
                        title="Eliminar préstamo"
                        aria-label={`Eliminar préstamo ${p.id}`}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Historial de abonos expandible */}
                {expandedId === p.id && (
                  <div className="mt-3 pl-4 border-l-2 border-purple-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-slate-400">Capital inicial</p>
                        <p className="font-bold text-slate-700">{formatMoney(getCapitalPendiente(p))}</p>
                        <p className="text-[11px] text-slate-400">Pendiente</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <p className="text-purple-500">Intereses ({p.tasa_interes}% x {p.numero_cuotas} meses)</p>
                        <p className="font-bold text-purple-700">{formatMoney(getInteresesPendientes(p))}</p>
                        <p className="text-[11px] text-purple-400">Pendientes</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <p className="text-amber-600">Capital abonado</p>
                        <p className="font-bold text-amber-700">{formatMoney(getCapitalAbonado(p))}</p>
                        <p className="text-[11px] text-amber-500">de {formatMoney(p.monto_prestado)}</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <p className="text-emerald-600">Interés abonado</p>
                        <p className="font-bold text-emerald-700">{formatMoney(getInteresesAbonados(p))}</p>
                        <p className="text-[11px] text-emerald-500">de {formatMoney(p.total_intereses)}</p>
                      </div>
                    </div>
                    {p.abonos && p.abonos.length > 0 ? (
                      <div className="space-y-1.5">
                        {p.abonos.map((ab) => (
                          <div key={ab.id} className="flex items-center justify-between text-xs text-slate-600 py-1.5 border-b border-slate-50 last:border-0">
                            <span>Cuota #{ab.numero_cuota} · {formatDate(ab.fecha_pago)}</span>
                            <div className="text-right">
                              <span className="font-bold text-slate-800">{formatMoney(ab.monto_abonado)}</span>
                              <span className="text-slate-400 ml-2">(Capital: {formatMoney(ab.monto_capital)} + Int: {formatMoney(ab.monto_interes)})</span>
                              <button
                                type="button"
                                onClick={() => openEditAbono(p, ab)}
                                title="Editar abono"
                                aria-label={`Editar abono ${ab.id}`}
                                className="ml-2 inline-flex p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1">Sin abonos registrados aún.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">No hay préstamos registrados.</div>
        )}
      </div>

      {/* Modal Nuevo Préstamo */}
      <Modal isOpen={isPrestamoModalOpen} onClose={() => setIsPrestamoModalOpen(false)} title="Registrar Nuevo Préstamo">
        <form onSubmit={handleCreatePrestamo} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Socio *</label>
            <select required value={prestamoForm.socio_id} onChange={(e) => setPrestamoForm({ ...prestamoForm, socio_id: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm">
              <option value="">Seleccionar socio...</option>
              {socios.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.nombre} (CC: {s.cedula})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monto a Prestar ($) *</label>
              <input type="number" step="0.01" min="0.01" required value={prestamoForm.monto_prestado}
                onChange={(e) => setPrestamoForm({ ...prestamoForm, monto_prestado: e.target.value })}
                placeholder="Ej. 500000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tasa de Interés (%)</label>
              <input type="number" step="0.01" min="0" value={prestamoForm.tasa_interes}
                onChange={(e) => setPrestamoForm({ ...prestamoForm, tasa_interes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Número de Cuotas *</label>
              <input type="number" min="1" required value={prestamoForm.numero_cuotas}
                onChange={(e) => setPrestamoForm({ ...prestamoForm, numero_cuotas: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de Desembolso</label>
              <input type="date" value={prestamoForm.fecha_prestamo}
                onChange={(e) => setPrestamoForm({ ...prestamoForm, fecha_prestamo: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
          </div>
          {prestamoForm.monto_prestado && prestamoForm.tasa_interes && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-800">
              <p className="font-bold">Estimación:</p>
              <p>Interés mensual: <strong>{formatMoney(parseFloat(prestamoForm.monto_prestado) * parseFloat(prestamoForm.tasa_interes) / 100)}</strong></p>
              <p>Intereses proyectados ({prestamoForm.numero_cuotas} meses): <strong>{formatMoney(parseFloat(prestamoForm.monto_prestado) * parseFloat(prestamoForm.tasa_interes) / 100 * parseInt(prestamoForm.numero_cuotas || 0, 10))}</strong></p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsPrestamoModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingPrestamo} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl disabled:opacity-50">
              {submittingPrestamo ? "Registrando..." : "Registrar Préstamo"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Abonar Cuota */}
      <Modal isOpen={isAbonoModalOpen} onClose={() => { setIsAbonoModalOpen(false); setEditingAbono(null); }} title={selectedPrestamo ? `${editingAbono ? "Editar" : "Abonar"} Cuota #${editingAbono?.numero_cuota || selectedPrestamo.cuotas_pagadas + 1} — Préstamo #${selectedPrestamo?.id}` : "Abonar Cuota"}>
        <form onSubmit={handleAbono} className="space-y-4">
          {selectedPrestamo && (
            <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-800 border border-purple-100">
              <p>Saldo pendiente: <strong>{formatMoney(selectedPrestamo.saldo_pendiente)}</strong></p>
              <p className="mt-0.5">Tasa: {selectedPrestamo.tasa_interes}% · Cuota siguiente: #{selectedPrestamo.cuotas_pagadas + 1} de {selectedPrestamo.numero_cuotas}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Monto Total a Abonar ($) *</label>
            <input type="number" step="0.01" min="0.01" required value={abonoForm.monto_abonado}
              onChange={(e) => setAbonoForm({ ...abonoForm, monto_abonado: e.target.value })}
              placeholder="Ej. 150000"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Capital Amortizado ($) *</label>
              <input type="number" step="0.01" min="0" required value={abonoForm.monto_capital}
                onChange={(e) => setAbonoForm({ ...abonoForm, monto_capital: e.target.value })}
                placeholder="Ej. 125000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Interés Cobrado ($)</label>
              <input type="number" step="0.01" min="0" value={abonoForm.monto_interes}
                onChange={(e) => setAbonoForm({ ...abonoForm, monto_interes: e.target.value })}
                placeholder="Ej. 25000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsAbonoModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingAbono} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl disabled:opacity-50">
              {submittingAbono ? "Guardando..." : editingAbono ? "Guardar cambios" : "Registrar Abono"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
