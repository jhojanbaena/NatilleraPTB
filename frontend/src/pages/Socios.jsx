import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  CreditCard, 
  DollarSign, 
  Eye, 
  Edit, 
  PlusCircle, 
  AlertCircle,
  FileText,
  BadgeCheck,
  Trash2
} from "lucide-react";
import api from "../api/client";
import { Modal } from "../components/Modal";
import { RichTextDisplay, RichTextField } from "../components/RichTextField";
import { formatMoney, formatDate } from "../utils/formatters";

export const Socios = () => {
  const [socios, setSocios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("alfabetico");
  const [loading, setLoading] = useState(true);

  // Modal Crear / Editar Socio
  const [isSocioModalOpen, setIsSocioModalOpen] = useState(false);
  const [editingSocio, setEditingSocio] = useState(null);
  const [formData, setFormData] = useState({
    id: "",
    cedula: "",
    nombre: "",
    telefono: "",
    residencia: "",
    aporte_mensual: "100000.00",
  });
  const [submittingSocio, setSubmittingSocio] = useState(false);
  const [deletingSocioId, setDeletingSocioId] = useState(null);

  // Modal Perfil Financiero / Estado de Cuenta
  const [selectedSocioProfile, setSelectedSocioProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Modal Registro de Movimiento (Aporte / Multa)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementData, setMovementData] = useState({
    tipo_movimiento: "APORTE",
    monto: "",
    descripcion: "",
  });
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const fetchSocios = async () => {
    try {
      setLoading(true);
      const res = await api.get("/socios");
      setSocios(res.data);
    } catch (err) {
      console.error("Error al cargar socios", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSocio = async (socio) => {
    if (!window.confirm(`¿Deseas eliminar al socio ${socio.nombre}?`)) return;

    try {
      setDeletingSocioId(socio.id);
      await api.delete(`/socios/${socio.id}`);
      await fetchSocios();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al eliminar el socio.");
    } finally {
      setDeletingSocioId(null);
    }
  };

  useEffect(() => {
    fetchSocios();
  }, []);

  const openCreateModal = () => {
    setEditingSocio(null);
    const idsUsados = new Set(socios.map((socio) => socio.id));
    let siguienteId = 1;
    while (idsUsados.has(siguienteId)) siguienteId += 1;
    setFormData({
      id: String(siguienteId),
      cedula: "",
      nombre: "",
      telefono: "",
      residencia: "",
      aporte_mensual: "100000.00",
    });
    setIsSocioModalOpen(true);
  };

  const openEditModal = (socio) => {
    setEditingSocio(socio);
    setFormData({
      id: socio.id,
      cedula: socio.cedula,
      nombre: socio.nombre,
      telefono: socio.telefono || "",
      residencia: socio.residencia || "",
      aporte_mensual: socio.aporte_mensual,
    });
    setIsSocioModalOpen(true);
  };

  const handleSaveSocio = async (e) => {
    e.preventDefault();
    try {
      setSubmittingSocio(true);
      if (editingSocio) {
        await api.put(`/socios/${editingSocio.id}`, {
          nombre: formData.nombre,
          telefono: formData.telefono,
          residencia: formData.residencia,
          aporte_mensual: formData.aporte_mensual,
        });
      } else {
        await api.post("/socios", formData);
      }
      setIsSocioModalOpen(false);
      fetchSocios();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al guardar el socio.");
    } finally {
      setSubmittingSocio(false);
    }
  };

  const openProfileModal = async (socioId) => {
    try {
      setLoadingProfile(true);
      setIsProfileModalOpen(true);
      const res = await api.get(`/socios/${socioId}/perfil`);
      setSelectedSocioProfile(res.data);
    } catch (err) {
      console.error("Error al obtener perfil", err);
      alert("No se pudo cargar el perfil del socio.");
      setIsProfileModalOpen(false);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    if (!selectedSocioProfile) return;
    const socioId = selectedSocioProfile.id;
    try {
      setSubmittingMovement(true);
      await api.post(`/socios/${socioId}/movimientos`, {
        tipo_movimiento: movementData.tipo_movimiento,
        monto: movementData.monto,
        descripcion: movementData.descripcion || `Registro de ${movementData.tipo_movimiento.toLowerCase()}`,
      });
      setIsMovementModalOpen(false);
      setMovementData({ tipo_movimiento: "APORTE", monto: "", descripcion: "" });
      // Recargar perfil y lista
      await openProfileModal(socioId);
      await fetchSocios();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Error al registrar el movimiento.");
    } finally {
      setSubmittingMovement(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const exactIdMatches = normalizedSearch
    ? socios.filter((socio) => String(socio.id) === normalizedSearch)
    : [];
  const filteredSocios = (exactIdMatches.length > 0 ? exactIdMatches : socios.filter(
    (s) =>
      s.nombre.toLowerCase().includes(normalizedSearch) ||
      s.cedula.includes(searchTerm) ||
      String(s.id).includes(searchTerm.trim())
  ))
    .slice()
    .sort((a, b) => (
      sortBy === "id"
        ? a.id - b.id
        : a.nombre.localeCompare(b.nombre, "es")
    ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            Directorio de Socios
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra los miembros, sus datos personales y estados de cuenta.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Socio
        </button>
      </div>

      {/* Buscador y ordenamiento */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar socio por nombre, cédula o ID..."
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm shadow-xs"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3.5 py-3 bg-white rounded-2xl border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-700 shadow-xs"
        >
          <option value="alfabetico">Orden alfabético</option>
          <option value="id">Orden por ID</option>
        </select>
      </div>

      {/* Tabla de Socios */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando socios...
          </div>
        ) : filteredSocios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Socio / Cédula</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Aporte Pactado</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSocios.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-500">{s.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{s.nombre}</p>
                      <p className="text-xs text-slate-400">CC: {s.cedula}</p>
                    </td>
                    <td className="px-6 py-4">
                      {s.telefono && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {s.telefono}
                        </p>
                      )}
                      {s.residencia && (
                        <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {s.residencia}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {formatMoney(s.aporte_mensual)} <span className="text-[11px] font-normal text-slate-400">/ mes</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {s.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openProfileModal(s.id)}
                        className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Ver Estado de Cuenta"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar Socio"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSocio(s)}
                        disabled={deletingSocioId === s.id}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar Socio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 text-sm">
            No se encontraron socios registrados.
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Socio */}
      <Modal
        isOpen={isSocioModalOpen}
        onClose={() => setIsSocioModalOpen(false)}
        title={editingSocio ? "Editar Datos del Socio" : "Registrar Nuevo Socio"}
      >
        <form onSubmit={handleSaveSocio} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              ID identificativo *
            </label>
            <input
              type="number"
              min="1"
              step="1"
              required
              disabled={!!editingSocio}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="Ej. 12"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Número de Cédula *
            </label>
            <input
              type="text"
              required
              disabled={!!editingSocio}
              value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              placeholder="Ej. 1001234567"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej. Carlos Alberto Restrepo"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Teléfono / Celular
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. 3001234567"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Aporte Mensual ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.aporte_mensual}
                onChange={(e) => setFormData({ ...formData, aporte_mensual: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Dirección de Residencia
            </label>
            <input
              type="text"
              value={formData.residencia}
              onChange={(e) => setFormData({ ...formData, residencia: e.target.value })}
              placeholder="Ej. Carrera 45 # 12-30"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsSocioModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingSocio}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {submittingSocio ? "Guardando..." : editingSocio ? "Actualizar Socio" : "Guardar Socio"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Perfil / Estado de Cuenta Individual */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={selectedSocioProfile ? `Estado de Cuenta — ${selectedSocioProfile.nombre}` : "Estado de Cuenta"}
        maxWidth="max-w-2xl"
      >
        {loadingProfile || !selectedSocioProfile ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando estado financiero del socio...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumen de Cifras */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs font-bold text-emerald-800 uppercase">Ahorro Neto</p>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {formatMoney(selectedSocioProfile.total_ahorrado)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <p className="text-xs font-bold text-purple-800 uppercase">Deuda Créditos</p>
                <p className="text-xl font-black text-purple-700 mt-1">
                  {formatMoney(selectedSocioProfile.saldo_prestamos_pendiente)}
                </p>
              </div>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs font-bold text-rose-800 uppercase">Multas Impagas</p>
                <p className="text-xl font-black text-rose-700 mt-1">
                  {formatMoney(selectedSocioProfile.total_multas_pendientes)}
                </p>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsMovementModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar Aporte / Multa
              </button>
            </div>

            {/* Préstamos Activos */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Préstamos Vigentes ({selectedSocioProfile.prestamos?.length || 0})
              </h4>
              {selectedSocioProfile.prestamos?.length > 0 ? (
                <div className="space-y-2">
                  {selectedSocioProfile.prestamos.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Préstamo #{p.id} — Saldo: {formatMoney(p.saldo_pendiente)}</p>
                        <p className="text-slate-500">Monto: {formatMoney(p.monto_prestado)} | Cuotas: {p.cuotas_pagadas}/{p.numero_cuotas}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                        {p.estado}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No tiene préstamos activos actualmente.</p>
              )}
            </div>

            {/* Historial de Transacciones */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Historial de Movimientos
              </h4>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {selectedSocioProfile.historial_finanzas?.length > 0 ? (
                  selectedSocioProfile.historial_finanzas.map((t) => (
                    <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                      <div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                          t.tipo_movimiento === "APORTE"
                            ? "bg-emerald-100 text-emerald-800"
                            : t.tipo_movimiento === "MULTA"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {t.tipo_movimiento}
                        </span>
                        <RichTextDisplay value={t.descripcion || "-"} className="text-slate-700 font-medium" />
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(t.fecha)}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatMoney(t.monto)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">Sin movimientos registrados.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Movimiento Financiero */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Registrar Movimiento a Socio"
      >
        <form onSubmit={handleCreateMovement} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tipo de Movimiento
            </label>
            <select
              value={movementData.tipo_movimiento}
              onChange={(e) => setMovementData({ ...movementData, tipo_movimiento: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="APORTE">Aporte de Ahorro</option>
              <option value="MULTA">Cargar Multa</option>
              <option value="PAGO_MULTA">Pago de Multa</option>
              <option value="RETIRO_AHORRO">Retiro de Ahorro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Monto en Dinero ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={movementData.monto}
              onChange={(e) => setMovementData({ ...movementData, monto: e.target.value })}
              placeholder="Ej. 150000"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción / Concepto
            </label>
            <RichTextField
              value={movementData.descripcion}
              onChange={(value) => setMovementData({ ...movementData, descripcion: value })}
              placeholder="Ej. Cuota correspondiente al mes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingMovement}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
            >
              {submittingMovement ? "Registrando..." : "Registrar Transacción"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
