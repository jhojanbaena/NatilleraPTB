import React, { useState, useEffect } from "react";
import { CalendarDays, Ticket, PartyPopper, Plus, TrendingUp, Edit3, Trash2 } from "lucide-react";
import api from "../api/client";
import { Modal } from "../components/Modal";
import { RichTextDisplay, RichTextField } from "../components/RichTextField";
import { formatMoney, formatDate } from "../utils/formatters";

export const ActividadesRifas = () => {
  const [actividades, setActividades] = useState([]);
  const [rifas, setRifas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [tab, setTab] = useState("actividades");
  const [loading, setLoading] = useState(true);

  // Modal actividad
  const [isActModal, setIsActModal] = useState(false);
  const [actForm, setActForm] = useState({ nombre: "", grupo_encargado: "", fecha: "", inversion: "0", ingresos_brutos: "0", descripcion: "" });
  const [submittingAct, setSubmittingAct] = useState(false);
  const [editingActividad, setEditingActividad] = useState(null);

  // Modal rifa
  const [isRifaModal, setIsRifaModal] = useState(false);
  const [rifaForm, setRifaForm] = useState({ nombre: "", tipo: "INTERNA", fecha: "", inversion_premios: "0", valor_boleta: "1000", total_boletas: 100, boletas_vendidas: 0, descripcion: "" });
  const [submittingRifa, setSubmittingRifa] = useState(false);
  const [editingRifa, setEditingRifa] = useState(null);

  // Modal reunion
  const [isReunionModal, setIsReunionModal] = useState(false);
  const [reunionForm, setReunionForm] = useState({ fecha: "", hora: "18:00", lugar: "", tema: "", compromisos: "", asistentes_requeridos: 10, ganancias_reunion: "0" });
  const [submittingReunion, setSubmittingReunion] = useState(false);
  const [editingReunion, setEditingReunion] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [actRes, rifaRes, reunRes] = await Promise.all([
        api.get("/actividades"),
        api.get("/rifas"),
        api.get("/reuniones"),
      ]);
      setActividades(actRes.data);
      setRifas(rifaRes.data);
      setReuniones(reunRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreateActividad = async (e) => {
    e.preventDefault();
    if (!actForm.nombre.trim() || !actForm.fecha) {
      alert("Completa el nombre y la fecha de la actividad.");
      return;
    }

    try {
      setSubmittingAct(true);
      const payload = {
        ...actForm,
        nombre: actForm.nombre.trim(),
        grupo_encargado: actForm.grupo_encargado.trim(),
        descripcion: actForm.descripcion.trim() || null,
        inversion: actForm.inversion || "0",
        ingresos_brutos: actForm.ingresos_brutos || "0",
      };

      if (editingActividad) {
        await api.put(`/actividades/${editingActividad.id}`, payload);
      } else {
        await api.post("/actividades", payload);
      }

      setIsActModal(false);
      setEditingActividad(null);
      setActForm({ nombre: "", grupo_encargado: "", fecha: "", inversion: "0", ingresos_brutos: "0", descripcion: "" });
      await fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail;
      alert(message || (editingActividad ? "Error al actualizar la actividad." : "Error al registrar la actividad."));
    } finally {
      setSubmittingAct(false);
    }
  };

  const openEditActividad = (actividad) => {
    setEditingActividad(actividad);
    setActForm({
      nombre: actividad.nombre || "",
      grupo_encargado: actividad.grupo_encargado || "",
      fecha: actividad.fecha || "",
      inversion: actividad.inversion ?? "0",
      ingresos_brutos: actividad.ingresos_brutos ?? "0",
      descripcion: actividad.descripcion || "",
    });
    setIsActModal(true);
  };

  const handleDeleteActividad = async (actividad) => {
    if (!window.confirm(`¿Eliminar la actividad "${actividad.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/actividades/${actividad.id}`);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo eliminar la actividad.");
    }
  };

  const handleCreateRifa = async (e) => {
    e.preventDefault();
    const totalBoletas = Number(rifaForm.total_boletas);
    const boletasVendidas = Number(rifaForm.boletas_vendidas);
    if (!rifaForm.nombre.trim() || !rifaForm.fecha) {
      alert("Completa el nombre y la fecha de la rifa.");
      return;
    }
    if (!Number.isInteger(totalBoletas) || totalBoletas < 1) {
      alert("El total de boletas debe ser un número entero mayor que cero.");
      return;
    }
    if (!Number.isInteger(boletasVendidas) || boletasVendidas < 0 || boletasVendidas > totalBoletas) {
      alert("Las boletas vendidas deben estar entre cero y el total de boletas.");
      return;
    }

    try {
      setSubmittingRifa(true);
      const payload = {
        ...rifaForm,
        nombre: rifaForm.nombre.trim(),
        inversion_premios: rifaForm.inversion_premios || "0",
        valor_boleta: rifaForm.valor_boleta || "0",
        total_boletas: totalBoletas,
        boletas_vendidas: boletasVendidas,
      };
      if (editingRifa) {
        await api.put(`/rifas/${editingRifa.id}`, payload);
      } else {
        await api.post("/rifas", payload);
      }
      setIsRifaModal(false);
      setEditingRifa(null);
      setRifaForm({ nombre: "", tipo: "INTERNA", fecha: "", inversion_premios: "0", valor_boleta: "1000", total_boletas: 100, boletas_vendidas: 0, descripcion: "" });
      await fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail;
      alert(message || (editingRifa ? "Error al actualizar la rifa." : "Error al registrar la rifa."));
    } finally {
      setSubmittingRifa(false);
    }
  };

  const openEditRifa = (rifa) => {
    setEditingRifa(rifa);
    setRifaForm({
      nombre: rifa.nombre || "",
      tipo: rifa.tipo || "INTERNA",
      fecha: rifa.fecha || "",
      inversion_premios: rifa.inversion_premios ?? "0",
      valor_boleta: rifa.valor_boleta ?? "0",
      total_boletas: rifa.total_boletas ?? 0,
      boletas_vendidas: rifa.boletas_vendidas ?? 0,
      descripcion: rifa.descripcion || "",
    });
    setIsRifaModal(true);
  };

  const handleDeleteRifa = async (rifa) => {
    if (!window.confirm(`¿Eliminar la rifa "${rifa.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/rifas/${rifa.id}`);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo eliminar la rifa.");
    }
  };

  const handleCreateReunion = async (e) => {
    e.preventDefault();
    if (!reunionForm.fecha || reunionForm.lugar.trim().length < 2 || reunionForm.tema.trim().length < 2) {
      alert("Completa la fecha, el lugar y el tema de la reunión.");
      return;
    }

    try {
      setSubmittingReunion(true);
      const payload = {
        fecha: reunionForm.fecha,
        hora: reunionForm.hora || "18:00",
        lugar: reunionForm.lugar.trim(),
        tema: reunionForm.tema.trim(),
        compromisos: reunionForm.compromisos.trim() || null,
        asistentes_requeridos: reunionForm.asistentes_requeridos
          ? String(reunionForm.asistentes_requeridos)
          : null,
        ganancias_reunion: reunionForm.ganancias_reunion || "0",
      };

      if (editingReunion) {
        await api.put(`/reuniones/${editingReunion.id}`, payload);
      } else {
        await api.post("/reuniones", payload);
      }

      setIsReunionModal(false);
      setEditingReunion(null);
      setReunionForm({ fecha: "", hora: "18:00", lugar: "", tema: "", compromisos: "", asistentes_requeridos: 10, ganancias_reunion: "0" });
      await fetchAll();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((item) => item.msg).join("; ")
        : detail;
      alert(message || (editingReunion ? "Error al actualizar la reunión." : "Error al registrar la reunión."));
    } finally {
      setSubmittingReunion(false);
    }
  };

  const openEditReunion = (reunion) => {
    setEditingReunion(reunion);
    setReunionForm({
      fecha: reunion.fecha || "",
      hora: reunion.hora || "18:00",
      lugar: reunion.lugar || "",
      tema: reunion.tema || "",
      compromisos: reunion.compromisos || "",
      asistentes_requeridos: reunion.asistentes_requeridos ?? 10,
      ganancias_reunion: reunion.ganancias_reunion ?? "0",
    });
    setIsReunionModal(true);
  };

  const handleDeleteReunion = async (reunion) => {
    if (!window.confirm(`¿Eliminar la reunión del ${reunion.fecha}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/reuniones/${reunion.id}`);
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo eliminar la reunión.");
    }
  };

  const tabs = [
    { id: "actividades", label: "Actividades", icon: PartyPopper, count: actividades.length },
    { id: "rifas", label: "Rifas y Sorteos", icon: Ticket, count: rifas.length },
    { id: "reuniones", label: "Reuniones y Actas", icon: CalendarDays, count: reuniones.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-sky-500" />
            Eventos, Rifas y Agenda
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestión de actividades comunitarias, sorteos y actas de reuniones.</p>
        </div>
        <div className="flex gap-2">
          {tab === "actividades" && (
            <button onClick={() => setIsActModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-500/20 transition-all">
              <Plus className="w-4 h-4" /> Nueva Actividad
            </button>
          )}
          {tab === "rifas" && (
            <button onClick={() => { setEditingRifa(null); setRifaForm({ nombre: "", tipo: "INTERNA", fecha: "", inversion_premios: "0", valor_boleta: "1000", total_boletas: 100, boletas_vendidas: 0, descripcion: "" }); setIsRifaModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all">
              <Plus className="w-4 h-4" /> Nueva Rifa
            </button>
          )}
          {tab === "reuniones" && (
            <button onClick={() => setIsReunionModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all">
              <Plus className="w-4 h-4" /> Nueva Reunión
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100/80 p-1.5 rounded-2xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <Icon className="w-4 h-4" /> {t.label}
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Cargando datos...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Actividades */}
          {tab === "actividades" && (
            actividades.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {actividades.map((a) => (
                  <div key={a.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40">
                    <div>
                      <h4 className="font-bold text-slate-800">{a.nombre}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {a.grupo_encargado && <span>Grupo: {a.grupo_encargado} · </span>}
                        {formatDate(a.fecha)}
                      </p>
                      {a.descripcion && <RichTextDisplay value={a.descripcion} className="text-xs text-slate-400 mt-1" />}
                    </div>
                    <div className="flex gap-4 text-right text-xs items-center">
                      <div>
                        <p className="text-slate-400">Inversión</p>
                        <p className="font-bold text-slate-700">{formatMoney(a.inversion)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Ingresos</p>
                        <p className="font-bold text-slate-700">{formatMoney(a.ingresos_brutos)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Ganancia</p>
                        <p className={`font-black text-base ${parseFloat(a.ganancia_neta) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatMoney(a.ganancia_neta)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEditActividad(a)} title="Editar actividad" aria-label={`Editar actividad ${a.nombre}`} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteActividad(a)} title="Eliminar actividad" aria-label={`Eliminar actividad ${a.nombre}`} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-16 text-center text-slate-400 text-sm">No hay actividades registradas aún.</div>
          )}

          {/* Rifas */}
          {tab === "rifas" && (
            rifas.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {rifas.map((r) => (
                  <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">{r.nombre}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">{r.tipo}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(r.fecha)} · Boletas: {r.boletas_vendidas}/{r.total_boletas} a {formatMoney(r.valor_boleta)} c/u
                      </p>
                    </div>
                    <div className="flex gap-4 text-right text-xs">
                      <div>
                        <p className="text-slate-400">Premio / Inversión</p>
                        <p className="font-bold text-slate-700">{formatMoney(r.inversion_premios)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Ganancia Total</p>
                        <p className="font-black text-base text-emerald-600">{formatMoney(r.ganancias_totales)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEditRifa(r)} title="Editar rifa" aria-label={`Editar rifa ${r.nombre}`} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteRifa(r)} title="Eliminar rifa" aria-label={`Eliminar rifa ${r.nombre}`} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-16 text-center text-slate-400 text-sm">No hay rifas registradas aún.</div>
          )}

          {/* Reuniones */}
          {tab === "reuniones" && (
            reuniones.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {reuniones.map((r) => (
                  <div key={r.id} className="p-5 hover:bg-slate-50/40">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{formatDate(r.fecha)} a las {r.hora}h</p>
                            {r.lugar && <p className="text-xs text-slate-500">{r.lugar}</p>}
                          </div>
                        </div>
                        {r.tema && <p className="text-sm text-slate-700 mt-2 ml-11"><strong>Tema:</strong> {r.tema}</p>}
                        {r.compromisos && <p className="text-xs text-slate-500 mt-1 ml-11"><strong>Compromisos:</strong> <RichTextDisplay value={r.compromisos} /></p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-11 sm:ml-0">
                        {r.ganancias_reunion > 0 && (
                          <div className="text-right text-xs">
                            <p className="text-slate-400">Fondo recaudado</p>
                            <p className="font-black text-emerald-600 text-base">{formatMoney(r.ganancias_reunion)}</p>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <button type="button" onClick={() => openEditReunion(r)} title="Editar reunión" aria-label={`Editar reunión ${r.tema || r.lugar}`} className="p-2 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteReunion(r)} title="Eliminar reunión" aria-label={`Eliminar reunión ${r.tema || r.lugar}`} className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="py-16 text-center text-slate-400 text-sm">No hay reuniones registradas aún.</div>
          )}
        </div>
      )}

      {/* Modal Actividad */}
      <Modal isOpen={isActModal} onClose={() => { setIsActModal(false); setEditingActividad(null); }} title={editingActividad ? "Editar Actividad" : "Registrar Nueva Actividad"}>
        <form onSubmit={handleCreateActividad} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre del Evento *</label>
            <input type="text" required value={actForm.nombre} onChange={(e) => setActForm({ ...actForm, nombre: e.target.value })}
              placeholder="Ej. Bazar de Navidad" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Grupo Encargado</label>
              <input type="text" value={actForm.grupo_encargado} onChange={(e) => setActForm({ ...actForm, grupo_encargado: e.target.value })}
                placeholder="Ej. Comité de eventos" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha *</label>
              <input type="date" required value={actForm.fecha} onChange={(e) => setActForm({ ...actForm, fecha: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Inversión / Gastos ($)</label>
              <input type="number" step="1000" min="0" value={actForm.inversion} onChange={(e) => setActForm({ ...actForm, inversion: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Ingresos Brutos ($)</label>
              <input type="number" step="1000" min="0" value={actForm.ingresos_brutos} onChange={(e) => setActForm({ ...actForm, ingresos_brutos: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" />
            </div>
          </div>
          {actForm.ingresos_brutos && actForm.inversion && (
            <div className={`p-3 rounded-xl border text-xs font-bold ${parseFloat(actForm.ingresos_brutos) - parseFloat(actForm.inversion) >= 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"}`}>
              Ganancia neta estimada: {formatMoney(parseFloat(actForm.ingresos_brutos) - parseFloat(actForm.inversion))}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Observaciones</label>
            <RichTextField rows={2} value={actForm.descripcion} onChange={(value) => setActForm({ ...actForm, descripcion: value })} placeholder="Escribe observaciones..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsActModal(false); setEditingActividad(null); }} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingAct} className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">
              {submittingAct ? "Guardando..." : editingActividad ? "Guardar Cambios" : "Guardar Actividad"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Rifa */}
      <Modal isOpen={isRifaModal} onClose={() => { setIsRifaModal(false); setEditingRifa(null); }} title={editingRifa ? "Editar Rifa / Sorteo" : "Registrar Nueva Rifa / Sorteo"}>
        <form onSubmit={handleCreateRifa} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nombre de la Rifa *</label>
              <input type="text" required value={rifaForm.nombre} onChange={(e) => setRifaForm({ ...rifaForm, nombre: e.target.value })}
                placeholder="Ej. Rifa de Fin de Año" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo</label>
              <select value={rifaForm.tipo} onChange={(e) => setRifaForm({ ...rifaForm, tipo: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm">
                <option value="INTERNA">Interna (entre socios)</option>
                <option value="GRANDE">Grande / Venta al público</option>
                <option value="PEQUENA">Pequeña / Venta al público</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha *</label>
              <input type="date" required value={rifaForm.fecha} onChange={(e) => setRifaForm({ ...rifaForm, fecha: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Inversión en Premios ($)</label>
              <input type="number" step="0.01" min="0" value={rifaForm.inversion_premios} onChange={(e) => setRifaForm({ ...rifaForm, inversion_premios: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Valor Boleta ($)</label>
              <input type="number" step="0.01" min="0" value={rifaForm.valor_boleta} onChange={(e) => setRifaForm({ ...rifaForm, valor_boleta: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Total Boletas</label>
              <input type="number" min="1" step="1" value={rifaForm.total_boletas} onChange={(e) => setRifaForm({ ...rifaForm, total_boletas: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Boletas Vendidas</label>
              <input type="number" min="0" step="1" value={rifaForm.boletas_vendidas} onChange={(e) => setRifaForm({ ...rifaForm, boletas_vendidas: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsRifaModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingRifa} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50">
              {submittingRifa ? "Guardando..." : editingRifa ? "Guardar Cambios" : "Guardar Rifa"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Reunion */}
      <Modal isOpen={isReunionModal} onClose={() => { setIsReunionModal(false); setEditingReunion(null); }} title={editingReunion ? "Editar Reunión / Acta" : "Registrar Nueva Reunión"}>
        <form onSubmit={handleCreateReunion} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha *</label>
              <input type="date" required value={reunionForm.fecha} onChange={(e) => setReunionForm({ ...reunionForm, fecha: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hora</label>
              <input type="time" value={reunionForm.hora} onChange={(e) => setReunionForm({ ...reunionForm, hora: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lugar</label>
            <input type="text" required minLength={2} value={reunionForm.lugar} onChange={(e) => setReunionForm({ ...reunionForm, lugar: e.target.value })}
              placeholder="Ej. Casa de la tesorera" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Temas tratados</label>
            <RichTextField rows={2} required value={reunionForm.tema} onChange={(value) => setReunionForm({ ...reunionForm, tema: value })} placeholder="Ej. Revisión de saldos, elección de tesorero..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Compromisos / Acuerdos</label>
            <RichTextField rows={2} value={reunionForm.compromisos} onChange={(value) => setReunionForm({ ...reunionForm, compromisos: value })} placeholder="Ej. Todos deben traer la cuota el próximo sábado..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Asistentes Requeridos</label>
              <input type="number" min="1" step="1" value={reunionForm.asistentes_requeridos} onChange={(e) => setReunionForm({ ...reunionForm, asistentes_requeridos: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fondo Recaudado ($)</label>
              <input type="number" step="0.01" min="0" value={reunionForm.ganancias_reunion} onChange={(e) => setReunionForm({ ...reunionForm, ganancias_reunion: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { setIsReunionModal(false); setEditingReunion(null); }} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingReunion} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50">
              {submittingReunion ? "Guardando..." : editingReunion ? "Guardar Cambios" : "Guardar Reunión"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
