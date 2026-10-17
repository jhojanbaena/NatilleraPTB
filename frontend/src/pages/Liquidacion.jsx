import React, { useState, useEffect } from "react";
import { Sparkles, TrendingUp, PiggyBank, Users, AlertTriangle, Search } from "lucide-react";
import api from "../api/client";
import { formatMoney } from "../utils/formatters";

export const Liquidacion = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("alfabetico");

  const fetchLiquidacion = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/finanzas/liquidacion-anual");
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("No se pudo calcular la liquidación. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLiquidacion(); }, []);

  const handlePrint = () => window.print();

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const sociosFiltrados = data?.socios_liquidados
    ?.filter((socio, _, socios) => {
      if (!normalizedSearch) return true;
      const exactIdMatch = socios.some((item) => String(item.socio_id) === normalizedSearch);
      if (exactIdMatch) return String(socio.socio_id) === normalizedSearch;
      return `${socio.nombre} ${socio.cedula} ${socio.socio_id}`.toLocaleLowerCase().includes(normalizedSearch);
    })
    .slice()
    .sort((a, b) => {
      if (sortBy === "mayor_liquidacion") {
        return parseFloat(b.total_neto_entregar) - parseFloat(a.total_neto_entregar);
      }
      if (sortBy === "menor_liquidacion") {
        return parseFloat(a.total_neto_entregar) - parseFloat(b.total_neto_entregar);
      }
      if (sortBy === "deben") {
        const deudaA = parseFloat(a.deuda_prestamos) + parseFloat(a.multas_pendientes);
        const deudaB = parseFloat(b.deuda_prestamos) + parseFloat(b.multas_pendientes);
        return deudaB - deudaA || a.nombre.localeCompare(b.nombre, "es");
      }
      if (sortBy === "id") {
        return a.socio_id - b.socio_id;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-sky-500" />
            Liquidación Anual y Reparto de Utilidades
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cierre de fin de año: devolución de ahorros y distribución proporcional de ganancias del fondo común.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLiquidacion} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all">
            Recalcular
          </button>
          {data && (
            <button onClick={handlePrint} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-500/20 transition-all">
              Imprimir / Exportar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Calculando liquidación de cierre anual...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
          <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Error al calcular</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchLiquidacion} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">Reintentar</button>
        </div>
      ) : data && (
        <div className="space-y-6" id="liquidacion-report">
          {/* Header del reporte */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-sky-400/20 border border-sky-400/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-sky-300" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Informe de Liquidación Anual</h2>
                <p className="text-slate-400 text-xs">Generado el {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Ahorros</p>
                <p className="text-xl font-black text-white mt-0.5">{formatMoney(data.total_ahorro_acumulado)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Bien Común General</p>
                <p className="text-xl font-black text-sky-300 mt-0.5">{formatMoney(data.total_bien_comun_general)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Rentabilidad</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">{data.rentabilidad_porcentual}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Gran Total a Entregar</p>
                <p className="text-xl font-black text-white mt-0.5">{formatMoney(data.gran_total_a_entregar)}</p>
              </div>
            </div>
          </div>

          {/* Resumen de descuentos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Deudas Descontadas</p>
                <p className="text-xl font-black text-rose-700 mt-0.5">{formatMoney(data.total_deuda_descontada)}</p>
                <p className="text-[11px] text-rose-500">Capital pendiente de créditos activos</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Multas Descontadas</p>
                <p className="text-xl font-black text-amber-700 mt-0.5">{formatMoney(data.total_multas_descontadas)}</p>
                <p className="text-[11px] text-amber-500">Multas impagas al cierre</p>
              </div>
            </div>
          </div>

          {/* Tabla de liquidación por socio */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <h3 className="font-bold text-slate-800">Detalle de Liquidación por Socio ({sociosFiltrados.length})</h3>
            </div>
            <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3">
              <label className="relative block">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, cédula o ID"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="alfabetico">Orden alfabético</option>
                <option value="mayor_liquidacion">Mayor liquidación</option>
                <option value="menor_liquidacion">Menor liquidación</option>
                <option value="deben">Los que deben</option>
                <option value="id">Orden por ID</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Socio</th>
                    <th className="px-6 py-3 text-right">Total Ahorrado</th>
                    <th className="px-6 py-3 text-right">Bien Común</th>
                    <th className="px-6 py-3 text-right">Deuda Crédito</th>
                    <th className="px-6 py-3 text-right">Multas Impagas</th>
                    <th className="px-6 py-3 text-right font-black text-emerald-700">NETO A RECIBIR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sociosFiltrados.map((s) => (
                    <tr key={s.socio_id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">{s.nombre}</p>
                        <p className="text-xs text-slate-400">CC: {s.cedula}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">{formatMoney(s.total_ahorrado)}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatMoney(s.bien_comun_asignado)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-rose-600">
                        {parseFloat(s.deuda_prestamos) > 0 ? `- ${formatMoney(s.deuda_prestamos)}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-amber-600">
                        {parseFloat(s.multas_pendientes) > 0 ? `- ${formatMoney(s.multas_pendientes)}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`font-black text-lg ${parseFloat(s.total_neto_entregar) < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                          {formatMoney(s.total_neto_entregar)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-emerald-50 border-t-2 border-emerald-200">
                  <tr>
                    <td className="px-6 py-4 font-black text-slate-800">TOTALES</td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">{formatMoney(data.total_ahorro_acumulado)}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-700">{formatMoney(data.total_bien_comun_general)}</td>
                    <td className="px-6 py-4 text-right font-black text-rose-700">- {formatMoney(data.total_deuda_descontada)}</td>
                    <td className="px-6 py-4 text-right font-black text-amber-700">- {formatMoney(data.total_multas_descontadas)}</td>
                    <td className="px-6 py-4 text-right font-black text-2xl text-emerald-700">{formatMoney(data.gran_total_a_entregar)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Nota de pie */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700">
            <strong>Nota de cálculo:</strong> Las utilidades son distribuidas proporcionalmente al total de aportes netos acumulados de cada socio durante el ciclo. 
            Las deudas de préstamos y multas pendientes al momento de la liquidación son descontadas directamente del monto neto a entregar. 
            El margen de redondeo de centavos es de máximo <strong>\$0.05</strong>.
          </div>
        </div>
      )}
    </div>
  );
};
