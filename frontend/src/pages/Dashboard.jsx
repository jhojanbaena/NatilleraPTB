import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  Coins, 
  HandCoins, 
  Users, 
  AlertTriangle, 
  Calendar, 
  StickyNote, 
  Plus, 
  TrendingUp,
  Receipt,
  Ticket,
  Trash2,
  Edit3
} from "lucide-react";
import api from "../api/client";
import { MetricCard } from "../components/MetricCard";
import { Modal } from "../components/Modal";
import { RichTextDisplay, RichTextField } from "../components/RichTextField";
import { formatMoney, formatDate } from "../utils/formatters";

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal para nueva nota
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [submittingNote, setSubmittingNote] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({});
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [createEventForm, setCreateEventForm] = useState({
    tipo: "Actividad",
    nombre: "",
    grupo_encargado: "",
    fecha: "",
    inversion: "0",
    ingresos_brutos: "0",
    tipo_rifa: "INTERNA",
    inversion_premios: "0",
    valor_boleta: "1000",
    total_boletas: "100",
    boletas_vendidas: "0",
    hora: "18:00",
    lugar: "",
    tema: "",
    compromisos: "",
    asistentes_requeridos: "",
    ganancias_reunion: "0",
    contenido: "",
    fecha_programada: "",
  });
  const [submittingCreateEvent, setSubmittingCreateEvent] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/summary");
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar dashboard", err);
      setError("No se pudo conectar con el servidor o cargar los datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      setSubmittingNote(true);
      await api.post("/notas", {
        titulo: noteTitle,
        contenido: noteContent,
        fecha_programada: noteDate || null,
      });
      setNoteTitle("");
      setNoteContent("");
      setNoteDate(new Date().toISOString().slice(0, 10));
      setIsNoteModalOpen(false);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la nota.");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const form = createEventForm;
    let endpoint;
    let payload;

    if (form.tipo === "Actividad") {
      if (!form.nombre.trim() || !form.grupo_encargado.trim() || !form.fecha) {
        alert("Completa nombre, grupo encargado y fecha de la actividad.");
        return;
      }
      endpoint = "/actividades";
      payload = {
        nombre: form.nombre.trim(),
        grupo_encargado: form.grupo_encargado.trim(),
        fecha: form.fecha,
        inversion: form.inversion || "0",
        ingresos_brutos: form.ingresos_brutos || "0",
        descripcion: form.descripcion?.trim() || null,
      };
    } else if (form.tipo === "Rifa") {
      const totalBoletas = Number(form.total_boletas);
      const boletasVendidas = Number(form.boletas_vendidas);
      if (!form.nombre.trim() || !form.fecha || !Number.isInteger(totalBoletas) || totalBoletas < 1 || !Number.isInteger(boletasVendidas) || boletasVendidas < 0 || boletasVendidas > totalBoletas) {
        alert("Completa la rifa y verifica que las boletas vendidas no superen el total.");
        return;
      }
      endpoint = "/rifas";
      payload = {
        nombre: form.nombre.trim(),
        tipo: form.tipo_rifa,
        fecha: form.fecha,
        inversion_premios: form.inversion_premios || "0",
        valor_boleta: form.valor_boleta || "0",
        total_boletas: totalBoletas,
        boletas_vendidas: boletasVendidas,
        descripcion: form.descripcion?.trim() || null,
      };
    } else if (form.tipo === "Reunión") {
      if (!form.fecha || form.lugar.trim().length < 2 || form.tema.trim().length < 2) {
        alert("Completa fecha, lugar y tema de la reunión.");
        return;
      }
      endpoint = "/reuniones";
      payload = {
        fecha: form.fecha,
        hora: form.hora || "18:00",
        lugar: form.lugar.trim(),
        tema: form.tema.trim(),
        compromisos: form.compromisos.trim() || null,
        asistentes_requeridos: form.asistentes_requeridos ? String(form.asistentes_requeridos) : null,
        ganancias_reunion: form.ganancias_reunion || "0",
      };
    } else {
      if (!form.nombre.trim() || !form.contenido.trim()) {
        alert("Completa la actividad y el detalle de la nota.");
        return;
      }
      endpoint = "/notas";
      payload = {
        titulo: form.nombre.trim(),
        contenido: form.contenido.trim(),
        fecha_programada: form.fecha_programada || null,
      };
    }

    try {
      setSubmittingCreateEvent(true);
      await api.post(endpoint, payload);
      setIsCreateEventModalOpen(false);
      await fetchDashboardData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = Array.isArray(detail) ? detail.map((item) => item.msg).join("; ") : detail;
      alert(message || "No se pudo guardar el evento.");
    } finally {
      setSubmittingCreateEvent(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    const eventType = event.tipo_evento;
    const endpointByType = {
      Actividad: "/actividades",
      "Rifa interna": "/rifas",
      Venta: "/rifas",
      "Rifa grande": "/rifas",
      "Reunión": "/reuniones",
      Nota: "/notas",
    };
    const endpoint = endpointByType[eventType];

    if (!endpoint) return;

    const confirmed = window.confirm(
      `¿Eliminar el evento "${event.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`${endpoint}/${event.id}`);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo eliminar el evento.");
    }
  };

  const getEventEndpoint = (eventType) => {
    if (eventType === "Actividad") return "/actividades";
    if (["Rifa interna", "Venta", "Rifa grande"].includes(eventType)) return "/rifas";
    if (eventType === "Reunión") return "/reuniones";
    if (eventType === "Nota") return "/notas";
    return null;
  };

  const handleOpenEditEvent = async (event) => {
    const endpoint = getEventEndpoint(event.tipo_evento);
    if (!endpoint) return;

    try {
      setLoadingEvent(true);
      const response = await api.get(`${endpoint}/${event.id}`);
      setEditingEvent({ ...event, endpoint });
      setEventForm(response.data);
      setIsEventModalOpen(true);
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo cargar el evento.");
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleEditEvent = async (eventSubmit) => {
    eventSubmit.preventDefault();
    try {
      setSubmittingEvent(true);
      const payload = { ...eventForm };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.ganancia_neta;
      delete payload.ganancia_por_boleta;
      delete payload.ganancias_totales;
      await api.put(`${editingEvent.endpoint}/${editingEvent.id}`, payload);
      setIsEventModalOpen(false);
      setEditingEvent(null);
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo actualizar el evento.");
    } finally {
      setSubmittingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sky-600 text-sm">Cargando métricas y finanzas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
        <p className="font-bold">Error de conexión</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { capital } = data;

  return (
    <div className="space-y-8">
      {/* Saludo y bienvenida */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-sky-800 tracking-tight">
          Lobby Financiero
        </h1>
        <p className="text-sm text-sky-600 mt-0.5">
          Resumen general en tiempo real del fondo de ahorro y crédito.
        </p>
      </div>

      {/* Tarjetas Principales de Capital (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MetricCard
          title="Capital Total Fondos"
          value={formatMoney(capital.capital_total)}
          subtitle="Sumatoria global del fondo"
          icon={Wallet}
          color="emerald"
        />
        <MetricCard
          title="Liquidez en Caja"
          value={formatMoney(capital.liquidez_disponible_caja)}
          subtitle="Dinero efectivo disponible"
          icon={Coins}
          color="blue"
        />
        <MetricCard
          title="Cartera en Préstamos"
          value={formatMoney(capital.total_dinero_prestado_activo)}
          subtitle={`${data.total_prestamos_activos} créditos activos`}
          icon={HandCoins}
          color="purple"
        />
        <MetricCard
          title="Socios Activos"
          value={data.total_socios_activos}
          subtitle={
            data.total_prestamos_en_mora > 0 ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {data.total_prestamos_en_mora} préstamo(s) en mora
              </span>
            ) : (
              "Todos al día"
            )
          }
          icon={Users}
          color={data.total_prestamos_en_mora > 0 ? "rose" : "amber"}
        />
      </div>

      {/* Desglose de ingresos del fondo */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-base font-bold text-sky-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-600" />
          Desglose de Fuentes de Capital del Fondo
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-sky-600 font-medium">Aportes Socios</p>
            <p className="text-sm font-bold text-sky-800 mt-1">{formatMoney(capital.total_aportes_socios)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Intereses Créditos</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">{formatMoney(capital.total_intereses_prestamos)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-sky-600 font-medium">Ganancias Rifas</p>
            <p className="text-sm font-bold text-sky-800 mt-1">{formatMoney(capital.total_ganancias_rifas)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-sky-600 font-medium">Ganancias Eventos</p>
            <p className="text-sm font-bold text-sky-800 mt-1">{formatMoney(capital.total_ganancias_actividades)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-sky-600 font-medium">Multas Cobradas</p>
            <p className="text-sm font-bold text-sky-800 mt-1">{formatMoney(capital.total_multas_cobradas)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-sky-600 font-medium">Fondo Reuniones</p>
            <p className="text-sm font-bold text-sky-800 mt-1">{formatMoney(capital.total_ganancias_reuniones)}</p>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas: Agenda del Mes y Bitácora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos eventos */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-sky-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600" />
              Cronograma y Próximos Eventos
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                {data.proximos_eventos?.length || 0} eventos
              </span>
              <button
                type="button"
                onClick={() => setIsCreateEventModalOpen(true)}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Evento
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80">
            {data.proximos_eventos?.length > 0 ? (
              data.proximos_eventos.map((ev, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-sky-100 hover:border-sky-200 hover:bg-sky-50/40 transition-all flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-emerald-100 text-emerald-800 mb-1">
                      {ev.tipo_evento}
                    </span>
                    <h4 className="text-sm font-bold text-sky-800">{ev.titulo}</h4>
                    {ev.descripcion && (
                      <RichTextDisplay value={ev.descripcion} className="text-xs text-slate-500 mt-0.5 line-clamp-1" />
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <p className="text-xs font-bold text-sky-700">{formatDate(ev.fecha)}</p>
                    {ev.monto_asociado && (
                      <p className="text-xs font-semibold text-emerald-600 mt-0.5">{formatMoney(ev.monto_asociado)}</p>
                    )}
                    {ev.tipo_evento !== "Cuota" && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(ev)}
                          title="Editar evento"
                          aria-label={`Editar ${ev.titulo}`}
                          className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev)}
                          title="Eliminar evento"
                          aria-label={`Eliminar ${ev.titulo}`}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No hay eventos programados para este mes.
              </div>
            )}
          </div>
        </div>

        {/* Bitácora de Notas */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-500" />
              Bitácora de Notas y Avisos
            </h3>
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(true)}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Nota
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-80">
            {data.ultimas_notas?.length > 0 ? (
              data.ultimas_notas.map((n) => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl border border-amber-100/80 bg-amber-50/30 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">{n.titulo}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-slate-400">
                        {n.fecha_programada ? `Actividad: ${formatDate(n.fecha_programada)}` : `Creada: ${formatDate(n.created_at)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEditEvent({
                          id: n.id,
                          titulo: n.titulo,
                          tipo_evento: "Nota",
                        })}
                        title="Editar nota"
                        aria-label={`Editar nota ${n.titulo || n.id}`}
                        className="p-1 text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent({
                          id: n.id,
                          titulo: n.titulo || "Nota",
                          tipo_evento: "Nota",
                        })}
                        title="Eliminar nota"
                        aria-label={`Eliminar nota ${n.titulo || n.id}`}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <RichTextDisplay value={n.contenido} className="text-xs text-slate-600 whitespace-pre-line" />
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No hay notas registradas en la bitácora aún.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        title="Nuevo Evento del Cronograma"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de evento</label>
            <select
              value={createEventForm.tipo}
              onChange={(e) => setCreateEventForm({ ...createEventForm, tipo: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            >
              <option value="Actividad">Actividad</option>
              <option value="Rifa">Rifa</option>
              <option value="Reunión">Reunión</option>
              <option value="Nota">Nota / tarea</option>
            </select>
          </div>

          {createEventForm.tipo === "Actividad" && (
            <>
              <input required value={createEventForm.nombre} onChange={(e) => setCreateEventForm({ ...createEventForm, nombre: e.target.value })} placeholder="Actividad a realizar" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <input required value={createEventForm.grupo_encargado} onChange={(e) => setCreateEventForm({ ...createEventForm, grupo_encargado: e.target.value })} placeholder="Grupo encargado" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <input required type="date" value={createEventForm.fecha} onChange={(e) => setCreateEventForm({ ...createEventForm, fecha: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" value={createEventForm.inversion} onChange={(e) => setCreateEventForm({ ...createEventForm, inversion: e.target.value })} placeholder="Inversión" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
                <input type="number" step="0.01" min="0" value={createEventForm.ingresos_brutos} onChange={(e) => setCreateEventForm({ ...createEventForm, ingresos_brutos: e.target.value })} placeholder="Ingresos" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <RichTextField value={createEventForm.descripcion || ""} onChange={(value) => setCreateEventForm({ ...createEventForm, descripcion: value })} placeholder="Descripción" rows={3} />
            </>
          )}

          {createEventForm.tipo === "Rifa" && (
            <>
              <input required value={createEventForm.nombre} onChange={(e) => setCreateEventForm({ ...createEventForm, nombre: e.target.value })} placeholder="Nombre de la rifa" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <select value={createEventForm.tipo_rifa} onChange={(e) => setCreateEventForm({ ...createEventForm, tipo_rifa: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm">
                <option value="INTERNA">Rifa interna</option>
                <option value="GRANDE">Rifa grande</option>
                <option value="PEQUENA">Venta / rifa pequeña</option>
              </select>
              <input required type="date" value={createEventForm.fecha} onChange={(e) => setCreateEventForm({ ...createEventForm, fecha: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" min="0" value={createEventForm.inversion_premios} onChange={(e) => setCreateEventForm({ ...createEventForm, inversion_premios: e.target.value })} placeholder="Premios" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
                <input type="number" step="0.01" min="0" value={createEventForm.valor_boleta} onChange={(e) => setCreateEventForm({ ...createEventForm, valor_boleta: e.target.value })} placeholder="Valor boleta" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input required type="number" min="1" step="1" value={createEventForm.total_boletas} onChange={(e) => setCreateEventForm({ ...createEventForm, total_boletas: e.target.value })} placeholder="Total boletas" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
                <input type="number" min="0" step="1" value={createEventForm.boletas_vendidas} onChange={(e) => setCreateEventForm({ ...createEventForm, boletas_vendidas: e.target.value })} placeholder="Vendidas" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
            </>
          )}

          {createEventForm.tipo === "Reunión" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input required type="date" value={createEventForm.fecha} onChange={(e) => setCreateEventForm({ ...createEventForm, fecha: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
                <input type="time" value={createEventForm.hora} onChange={(e) => setCreateEventForm({ ...createEventForm, hora: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              </div>
              <input required minLength={2} value={createEventForm.lugar} onChange={(e) => setCreateEventForm({ ...createEventForm, lugar: e.target.value })} placeholder="Lugar" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <input required minLength={2} value={createEventForm.tema} onChange={(e) => setCreateEventForm({ ...createEventForm, tema: e.target.value })} placeholder="Tema" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <RichTextField value={createEventForm.compromisos} onChange={(value) => setCreateEventForm({ ...createEventForm, compromisos: value })} placeholder="Compromisos" rows={3} />
              <input type="number" step="0.01" min="0" value={createEventForm.ganancias_reunion} onChange={(e) => setCreateEventForm({ ...createEventForm, ganancias_reunion: e.target.value })} placeholder="Fondo recaudado" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
            </>
          )}

          {createEventForm.tipo === "Nota" && (
            <>
              <input required value={createEventForm.nombre} onChange={(e) => setCreateEventForm({ ...createEventForm, nombre: e.target.value })} placeholder="Actividad o tarea a realizar" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <input type="date" value={createEventForm.fecha_programada} onChange={(e) => setCreateEventForm({ ...createEventForm, fecha_programada: e.target.value })} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" />
              <RichTextField required value={createEventForm.contenido} onChange={(value) => setCreateEventForm({ ...createEventForm, contenido: value })} placeholder="Detalle de la actividad" rows={4} />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsCreateEventModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={submittingCreateEvent} className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">{submittingCreateEvent ? "Guardando..." : "Guardar Evento"}</button>
          </div>
        </form>
      </Modal>

      {/* Modal para crear nota */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Agregar Nota a la Bitácora"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fecha de realización
            </label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Actividad a realizar
            </label>
            <input
              type="text"
              required
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Ej. Ir de compras"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Detalle de la actividad
            </label>
            <RichTextField
              required
              rows={4}
              value={noteContent}
              onChange={setNoteContent}
              placeholder="Escribe los detalles de la actividad..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNoteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingNote}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {submittingNote ? "Guardando..." : "Guardar Nota"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEvent ? `Editar ${editingEvent.tipo_evento}` : "Editar evento"}
      >
        {loadingEvent ? (
          <div className="py-8 text-center text-slate-500 text-sm">Cargando evento...</div>
        ) : editingEvent && (
          <form onSubmit={handleEditEvent} className="space-y-4">
            {editingEvent.tipo_evento === "Actividad" && (
              <>
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.nombre || ""} onChange={(e) => setEventForm({ ...eventForm, nombre: e.target.value })} placeholder="Nombre" />
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.grupo_encargado || ""} onChange={(e) => setEventForm({ ...eventForm, grupo_encargado: e.target.value })} placeholder="Grupo encargado" />
                <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.fecha || ""} onChange={(e) => setEventForm({ ...eventForm, fecha: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.inversion ?? ""} onChange={(e) => setEventForm({ ...eventForm, inversion: e.target.value })} placeholder="Inversión" />
                  <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.ingresos_brutos ?? ""} onChange={(e) => setEventForm({ ...eventForm, ingresos_brutos: e.target.value })} placeholder="Ingresos" />
                </div>
                <RichTextField value={eventForm.descripcion || ""} onChange={(value) => setEventForm({ ...eventForm, descripcion: value })} placeholder="Descripción" rows={3} />
              </>
            )}
            {["Rifa interna", "Venta", "Rifa grande"].includes(editingEvent.tipo_evento) && (
              <>
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.nombre || ""} onChange={(e) => setEventForm({ ...eventForm, nombre: e.target.value })} placeholder="Nombre de la rifa" />
                <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.fecha || ""} onChange={(e) => setEventForm({ ...eventForm, fecha: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.inversion_premios ?? ""} onChange={(e) => setEventForm({ ...eventForm, inversion_premios: e.target.value })} placeholder="Premios" />
                  <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.valor_boleta ?? ""} onChange={(e) => setEventForm({ ...eventForm, valor_boleta: e.target.value })} placeholder="Valor boleta" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.total_boletas ?? ""} onChange={(e) => setEventForm({ ...eventForm, total_boletas: e.target.value })} placeholder="Total boletas" />
                  <input type="number" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.boletas_vendidas ?? ""} onChange={(e) => setEventForm({ ...eventForm, boletas_vendidas: e.target.value })} placeholder="Vendidas" />
                </div>
                <RichTextField value={eventForm.descripcion || ""} onChange={(value) => setEventForm({ ...eventForm, descripcion: value })} placeholder="Descripción" rows={3} />
              </>
            )}
            {editingEvent.tipo_evento === "Reunión" && (
              <>
                <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.fecha || ""} onChange={(e) => setEventForm({ ...eventForm, fecha: e.target.value })} />
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.hora || ""} onChange={(e) => setEventForm({ ...eventForm, hora: e.target.value })} placeholder="Hora" />
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.lugar || ""} onChange={(e) => setEventForm({ ...eventForm, lugar: e.target.value })} placeholder="Lugar" />
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" required value={eventForm.tema || ""} onChange={(e) => setEventForm({ ...eventForm, tema: e.target.value })} placeholder="Tema" />
                <RichTextField value={eventForm.compromisos || ""} onChange={(value) => setEventForm({ ...eventForm, compromisos: value })} placeholder="Compromisos" rows={3} />
                <input type="number" step="0.01" min="0" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.ganancias_reunion ?? ""} onChange={(e) => setEventForm({ ...eventForm, ganancias_reunion: e.target.value })} placeholder="Ganancias" />
              </>
            )}
            {editingEvent.tipo_evento === "Nota" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha de realización</label>
                    <input type="text" readOnly value={eventForm.fecha_programada ? formatDate(eventForm.fecha_programada) : "Sin fecha"} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Última edición</label>
                    <input type="text" readOnly value={eventForm.updated_at ? formatDate(eventForm.updated_at) : "Sin editar"} className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm" />
                  </div>
                </div>
                <input type="date" className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.fecha_programada || ""} onChange={(e) => setEventForm({ ...eventForm, fecha_programada: e.target.value })} />
                <input className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm" value={eventForm.titulo || ""} onChange={(e) => setEventForm({ ...eventForm, titulo: e.target.value })} placeholder="Actividad a realizar" />
                <RichTextField required value={eventForm.contenido || ""} onChange={(value) => setEventForm({ ...eventForm, contenido: value })} placeholder="Contenido" rows={5} />
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button type="submit" disabled={submittingEvent} className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">{submittingEvent ? "Guardando..." : "Guardar cambios"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
