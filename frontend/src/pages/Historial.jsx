import React, { useState, useEffect, useCallback } from "react";
import api from "../api/client";
import { formatMoney, formatDate } from "../utils/formatters";
import {
  History,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  ShieldAlert,
  ArrowRightLeft
} from "lucide-react";

export const Historial = () => {
  const [historial, setHistorial] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [modulo, setModulo] = useState("");
  const [tipoAccion, setTipoAccion] = useState("");
  const [revertido, setRevertido] = useState("");
  const [search, setSearch] = useState("");

  // Modal de reversión
  const [itemToRevert, setItemToRevert] = useState(null);
  const [reverting, setReverting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (modulo) params.modulo = modulo;
      if (tipoAccion) params.tipo_accion = tipoAccion;
      if (revertido !== "") params.revertido = revertido === "true";
      if (search) params.q = search;

      const [resHist, resRes] = await Promise.all([
        api.get("/historial", { params }),
        api.get("/historial/resumen"),
      ]);

      setHistorial(resHist.data);
      setResumen(resRes.data);
    } catch (err) {
      console.error("Error cargando historial:", err);
      setError("No se pudo cargar el historial de movimientos. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  }, [modulo, tipoAccion, revertido, search]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const handleRevert = async () => {
    if (!itemToRevert) return;
    setReverting(true);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await api.post(`/historial/${itemToRevert.id}/revertir`);
      setActionSuccess(`¡Movimiento #${itemToRevert.id} revertido con éxito! ${res.data.message || ""}`);
      setItemToRevert(null);
      fetchHistorial();
    } catch (err) {
      console.error("Error al revertir:", err);
      const detail = err.response?.data?.detail || "No se pudo realizar la reversión.";
      setError(`Error al revertir: ${detail}`);
    } finally {
      setReverting(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionBadge = (tipo, isRevertido) => {
    if (isRevertido) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <RotateCcw className="w-3 h-3" /> Revertido
        </span>
      );
    }
    switch (tipo) {
      case "CREAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Creación
          </span>
        );
      case "EDITAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Edición
          </span>
        );
      case "ELIMINAR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            Eliminación
          </span>
        );
      case "REVERTIR":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ArrowRightLeft className="w-3 h-3" /> Reversión
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {tipo}
          </span>
        );
    }
  };

  const getModuloBadge = (mod) => {
    const colors = {
      Socios: "bg-indigo-50 text-indigo-700 border-indigo-200",
      Préstamos: "bg-purple-50 text-purple-700 border-purple-200",
      Actividades: "bg-cyan-50 text-cyan-700 border-cyan-200",
      Rifas: "bg-amber-50 text-amber-700 border-amber-200",
      Reuniones: "bg-teal-50 text-teal-700 border-teal-200",
      Notas: "bg-slate-100 text-slate-700 border-slate-200",
      Finanzas: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border ${colors[mod] || "bg-slate-50 text-slate-600"}`}>
        {mod}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Historial Global de Movimientos</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría completa de acciones y reversión inmediata de operaciones (Undo) en todos los módulos.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistorial}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {/* Alertas */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Métricas Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Eventos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{resumen.total_movimientos}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Acciones Revertidas</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{resumen.total_revertidos}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Módulos Activos</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {Object.keys(resumen.movimientos_por_modulo || {}).length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros de Búsqueda */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          <Filter className="w-4 h-4 text-purple-600" />
          Filtros de Búsqueda
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda por texto */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en descripción o usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Módulo */}
          <select
            value={modulo}
            onChange={(e) => setModulo(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
          >
            <option value="">Todos los Módulos</option>
            <option value="Socios">Socios</option>
            <option value="Préstamos">Préstamos</option>
            <option value="Actividades">Actividades</option>
            <option value="Rifas">Rifas</option>
            <option value="Reuniones">Reuniones</option>
            <option value="Notas">Notas</option>
            <option value="Finanzas">Finanzas</option>
          </select>

          {/* Tipo Acción */}
          <select
            value={tipoAccion}
            onChange={(e) => setTipoAccion(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
          >
            <option value="">Todas las Acciones</option>
            <option value="CREAR">Creación</option>
            <option value="EDITAR">Edición</option>
            <option value="ELIMINAR">Eliminación</option>
            <option value="REVERTIR">Reversión</option>
          </select>

          {/* Revertido */}
          <select
            value={revertido}
            onChange={(e) => setRevertido(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
          >
            <option value="">Todos los Estados</option>
            <option value="false">Activos (Sin revertir)</option>
            <option value="true">Revertidos</option>
          </select>
        </div>
      </div>

      {/* Tabla del Historial */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
            <p className="text-sm font-medium">Cargando registros del historial...</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
            <p className="text-base font-semibold text-slate-700">No se encontraron movimientos</p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba cambiando o limpiando los filtros de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Módulo</th>
                  <th className="py-3.5 px-4">Acción</th>
                  <th className="py-3.5 px-4">Descripción del Movimiento</th>
                  <th className="py-3.5 px-4">Usuario</th>
                  <th className="py-3.5 px-4 text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {historial.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4">{getModuloBadge(item.modulo)}</td>
                    <td className="py-3.5 px-4">{getActionBadge(item.tipo_accion, item.revertido)}</td>
                    <td className="py-3.5 px-4 max-w-md font-medium text-slate-800">
                      {item.descripcion}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.usuario_nombre || "Sistema"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {item.tipo_accion !== "REVERTIR" && !item.revertido ? (
                        <button
                          onClick={() => setItemToRevert(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200/80 transition-all active:scale-95 shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                          Revertir
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-semibold italic">
                          {item.revertido ? "Revertido" : "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Reversión */}
      {itemToRevert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">¿Revertir esta operación?</h3>
                  <p className="text-xs text-slate-500">Esta acción restaurará el estado anterior en la base de datos.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Módulo:</span>
                  <span className="font-bold text-slate-800">{itemToRevert.modulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Tipo de Acción:</span>
                  <span className="font-bold text-slate-800">{itemToRevert.tipo_accion}</span>
                </div>
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-500">Descripción:</span>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">{itemToRevert.descripcion}</p>
                </div>
              </div>

              {itemToRevert.tipo_accion === "ELIMINAR" && (
                <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  💡 Al revertir esta eliminación, el registro (ej. préstamo o actividad) reaparecerá inmediatamente en su módulo correspondiente con exactamente sus mismos datos.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setItemToRevert(null)}
                  disabled={reverting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRevert}
                  disabled={reverting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {reverting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Revirtiendo...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Confirmar Reversión
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
