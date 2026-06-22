import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api';
import { User, Shield, AlertCircle, Plus, Edit, Trash2, CheckCircle, RefreshCw, Key, Landmark, Lock, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserRecord {
  id: number;
  usuario: string;
  rol: string;
  sucursal: string;
  secciones?: string;
}

interface UsuariosViewProps {
  token: string;
  activeUsername: string;
}

export function UsuariosView({ token, activeUsername }: UsuariosViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('Operador');
  const [sucursal, setSucursal] = useState('Montevideo');
  const [secciones, setSecciones] = useState('all');

  const SECCIONES_DISPONIBLES = [
    { id: 'mando', label: 'Cuadro de Mando (Métricas)', desc: 'Dashboard de ventas, gráficos de rendimiento y KPIs.' },
    { id: 'stock', label: 'Stock / Inventario', desc: 'Control de existencias, costos de compra y catálogo.' },
    { id: 'ventas', label: 'Facturación / Caja', desc: 'Emisión de tickets de venta y egresos directos.' },
    { id: 'combos', label: 'Combos de Artículos', desc: 'Empaquetado promocional con precios dinámicos.' },
    { id: 'ingreso', label: 'Ingreso (Reposición)', desc: 'Recepción de mercadería y actualización de costos de proveedor.' },
    { id: 'traslados', label: 'Traslados de Stock', desc: 'Traspasos rápidos de inventario entre locales.' },
    { id: 'envios', label: 'Gestión de Envíos', desc: 'Despachos por agencias de correo y bultos.' },
    { id: 'gastos', label: 'Gastos y Egresos', desc: 'Registro de egresos fijos o retiros de caja chica.' },
    { id: 'finanzas', label: 'Cuentas y Finanzas', desc: 'Gestor de saldos bancarios y arqueos físicos.' },
    { id: 'copiloto-ia', label: 'Copiloto IA Gemini', desc: 'Asistencia inteligente para análisis y proyecciones.' },
  ];

  const handleToggleSection = (secId: string) => {
    if (secciones === 'all') {
      const active = SECCIONES_DISCORRED(secId);
      setSecciones(active.join(','));
    } else {
      const activeList = secciones ? secciones.split(',') : [];
      if (activeList.includes(secId)) {
        const updated = activeList.filter(id => id !== secId);
        setSecciones(updated.length === 0 ? 'none' : updated.join(','));
      } else {
        const updated = [...activeList, secId];
        if (updated.length === SECCIONES_DISPONIBLES.length) {
          setSecciones('all');
        } else {
          setSecciones(updated.join(','));
        }
      }
    }
  };

  const SECCIONES_DISCORRED = (excludeId: string) => {
    return SECCIONES_DISPONIBLES.map(s => s.id).filter(id => id !== excludeId);
  };

  const isSectionActive = (secId: string) => {
    if (rol === 'Admin' || secciones === 'all') return true;
    if (secciones === 'none') return false;
    return secciones.split(',').includes(secId);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/usuarios', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('No se pudieron recuperar los usuarios del servidor.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al conectar con la API de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const resetForm = () => {
    setEditUserId(null);
    setUsuario('');
    setContrasena('');
    setRol('Operador');
    setSucursal('Montevideo');
    setSecciones('all');
  };

  const handleEdit = (u: UserRecord) => {
    setEditUserId(u.id);
    setUsuario(u.usuario);
    setContrasena(''); // Leave blank unless changing
    setRol(u.rol);
    setSucursal(u.sucursal);
    setSecciones(u.secciones || 'all');
  };

  const handleDelete = async (id: number, name: string) => {
    if (name.toLowerCase() === 'administrador' || name.toLowerCase() === 'uriel') {
      setErrorMsg('No se puede eliminar el usuario administrador base del sistema.');
      return;
    }
    if (name.toLowerCase() === activeUsername.toLowerCase()) {
      setErrorMsg('No puedes eliminar tu propio usuario activo.');
      return;
    }
    if (!window.confirm(`¿Estás seguro que deseas eliminar permanentemente el usuario "${name}"?`)) {
      return;
    }

    try {
      setErrorMsg('');
      setSuccessMsg('');
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo eliminar el usuario.');
      }
      setSuccessMsg(`Usuario "${name}" eliminado correctamente.`);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar usuario.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario.trim() || !rol || !sucursal) {
      setErrorMsg('Favor de ingresar todos los campos obligatorios.');
      return;
    }
    if (!editUserId && !contrasena.trim()) {
      setErrorMsg('Favor de especificar una contraseña inicial para el nuevo usuario.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const url = editUserId ? `/api/usuarios/${editUserId}` : '/api/usuarios';
      const method = editUserId ? 'PUT' : 'POST';
      const bodyPayload: any = { usuario, rol, sucursal, secciones };
      
      if (contrasena.trim()) {
        bodyPayload.contrasena = contrasena;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el usuario en el servidor.');
      }

      setSuccessMsg(editUserId ? `Usuario "${usuario}" modificado con éxito.` : `Usuario "${usuario}" creado con éxito.`);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error procesando solicitud de usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans bg-brand-deep rounded-2xl border border-brand-gold/10 mt-4 shadow-2xl relative overflow-hidden text-brand-crema">
      
      {/* Decorative Brand Accent Background Spot */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/5 blur-[120px] pointer-events-none" />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-gold/20 pb-6 relative z-10">
        <div>
          <h1 className="text-3xl font-black text-brand-crema tracking-tight flex items-center gap-3 font-display">
            <Shield className="h-7 w-7 text-brand-gold" />
            Control de Accesos y Permisos
          </h1>
          <p className="text-xs text-brand-lightgold mt-1.5 font-sans">
            Administración centralizada de credenciales operativas, contraseñas y asignación de sucursales (ej. Montevideo, Pinamar).
          </p>
        </div>
        <motion.button
          id="btn-recargar-usuarios"
          onClick={fetchUsers}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-cobalt hover:bg-brand-gold/10 text-brand-gold hover:text-brand-lightgold border border-brand-gold/30 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Credenciales
        </motion.button>
      </div>

      {/* FEEDBACK BARS */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            id="users-error-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-950/30 text-rose-300 p-4 rounded-xl border border-rose-500/20 text-xs flex gap-2.5 items-center relative z-10"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="font-medium font-sans">{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div 
            id="users-success-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/20 text-emerald-300 p-4 rounded-xl border border-blend-gold border-emerald-500/20 text-xs flex gap-2.5 items-center relative z-10"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="font-medium font-sans">{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* LEFT COLUMN: CREATOR & EDITOR FORM */}
        <div className="bg-brand-cobalt p-6 rounded-2xl border border-brand-gold/15 shadow-xl space-y-5">
          <div className="border-b border-brand-gold/10 pb-4">
            <h2 className="text-md font-bold text-brand-crema tracking-tight flex items-center gap-2 font-sans select-none">
              <Key className="h-4 w-4 text-brand-gold" />
              {editUserId ? 'Modificar Credencial' : 'Registrar Credencial'}
            </h2>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              {editUserId ? 'Edita los permisos de sucursal o restablece la contraseña.' : 'Crea claves de acceso con roles independientes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                Nombre de Usuario / Local
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-brand-lightgold/50" />
                </div>
                <input
                  id="user-input-username"
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="Ej. Montevideo"
                  className="w-full text-xs pl-10 pr-3 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold font-sans transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                {editUserId ? 'Nueva Contraseña (Opcional)' : 'Contraseña Corporativa'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-brand-lightgold/50" />
                </div>
                <input
                  id="user-input-password"
                  type="password"
                  placeholder={editUserId ? 'Dejar vacío para no modificar' : '••••••••'}
                  required={!editUserId}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold font-sans transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                  Rol Operativo
                </label>
                <select
                  id="user-select-role"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full text-xs px-3 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold font-sans cursor-pointer"
                >
                  <option value="Admin">Administrador</option>
                  <option value="Operador">Operador (Venta)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-lightgold uppercase tracking-wider mb-2 font-sans select-none">
                  Sucursal Asignada
                </label>
                <select
                  id="user-select-sucursal"
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  className="w-full text-xs px-3 py-3 bg-brand-deep border border-brand-gold/15 rounded-xl text-brand-crema focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold font-sans cursor-pointer"
                >
                  <option value="Todas">Todas (Admin)</option>
                  <option value="Montevideo">Montevideo</option>
                  <option value="Pinamar">Pinamar</option>
                </select>
              </div>
            </div>

            {/* SECCIONES PERMITIDAS */}
            <div className="bg-brand-deep/50 p-4 rounded-xl border border-brand-gold/10 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-brand-lightgold uppercase tracking-wider mb-1 font-sans select-none">
                  Secciones de la App Permitidas
                </label>
                <p className="text-[9px] text-slate-450 font-sans">
                  {rol === 'Admin' 
                    ? 'Los Administradores tienen acceso total a todos los módulos.'
                    : 'Personalice los módulos visibles en el menú lateral para este usuario.'}
                </p>
              </div>

              {rol !== 'Admin' ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {SECCIONES_DISPONIBLES.map((sec) => {
                    const active = isSectionActive(sec.id);
                    return (
                      <label 
                        key={sec.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                          active 
                            ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-crema' 
                            : 'bg-brand-deep/80 border-slate-700/30 text-slate-400 hover:border-slate-600/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleToggleSection(sec.id)}
                          className="mt-0.5 rounded border-brand-gold/30 text-brand-gold focus:ring-brand-gold cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold tracking-tight">{sec.label}</span>
                          <span className="text-[9.5px] text-slate-400 leading-tight">{sec.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-brand-gold/5 border border-brand-gold/15 rounded-lg text-center">
                  <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider block">Acceso Completo Activo</span>
                  <span className="text-[9px] text-slate-400 block mt-1">Este nivel jerárquico no cuenta con restricciones de visibilidad.</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-brand-gold/10">
              {editUserId && (
                <motion.button
                  id="btn-user-cancel-edit"
                  type="button"
                  onClick={resetForm}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-1/2 py-3 border border-brand-gold/20 hover:bg-brand-gold/5 text-brand-lightgold font-bold text-xs rounded-xl transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </motion.button>
              )}
              <motion.button
                id="btn-user-submit"
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`py-3 px-4 font-bold text-xs rounded-xl text-brand-deep transition-all cursor-pointer font-sans ${
                  editUserId ? 'w-1/2 bg-brand-lightgold hover:bg-brand-gold' : 'w-full bg-brand-gold hover:bg-brand-lightgold'
                }`}
              >
                {editUserId ? 'Aplicar Cambios' : 'Registrar Cuenta'}
              </motion.button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: REGISTERED USERS GRID & PRIVILEGES */}
        <div className="lg:col-span-2 bg-brand-cobalt p-6 rounded-2xl border border-brand-gold/15 shadow-xl space-y-4">
          <div className="border-b border-brand-gold/10 pb-4">
            <h2 className="text-md font-bold text-brand-crema tracking-tight font-sans">
              Credenciales de Sucursales Habilitadas ({users.length})
            </h2>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              Todos los operadores mostrados abajo tienen acceso según su rol y sucursal autorizada.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-sans">
              <thead>
                <tr className="border-b border-brand-gold/15 text-brand-lightgold font-sans uppercase font-bold text-[9px] tracking-widest text-left">
                  <th className="py-3 px-3">Usuario / ID</th>
                  <th className="py-3 px-3">Nivel de Permiso</th>
                  <th className="py-3 px-3">Sucursal</th>
                  <th className="py-3 px-3">Secciones Autorizadas</th>
                  <th className="py-3 px-3 text-right">Mantenimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gold/10 text-brand-crema">
                {users.map((u) => {
                  const isCurrentAdmin = u.usuario.toLowerCase() === 'administrador' || u.usuario.toLowerCase() === 'uriel';
                  const isActiveUser = u.usuario.toLowerCase() === activeUsername.toLowerCase();
                  
                  return (
                    <motion.tr 
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-brand-deep/40 transition-colors duration-200"
                    >
                      <td className="py-4 px-3">
                        <div className="font-extrabold text-brand-crema flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg border ${
                            u.rol === 'Admin' ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold' : 'bg-brand-deep border-brand-gold/10 text-brand-lightgold'
                          }`}>
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold tracking-tight text-sm text-brand-crema">{u.usuario}</span>
                            <span className="text-[9px] font-mono text-slate-500 font-semibold uppercase">ID: #{u.id}</span>
                          </div>
                          {isActiveUser && (
                            <span className="bg-brand-gold/20 border border-brand-gold/35 text-brand-gold text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block animate-pulse ml-1">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-block border ${
                          u.rol === 'Admin' 
                            ? 'bg-red-500/10 text-red-300 border-red-500/20' 
                            : 'bg-brand-deep text-brand-lightgold border-brand-gold/20'
                        }`}>
                          {u.rol === 'Admin' ? 'Administrador' : 'Operador de Venta'}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border ${
                          u.sucursal === 'Todas' 
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                            : 'bg-brand-deep text-teal-300 border-teal-500/20'
                        }`}>
                          <Landmark className="h-3 w-3 shrink-0" />
                          {u.sucursal}
                        </span>
                      </td>
                      <td className="py-4 px-3">
                        {u.rol === 'Admin' || (u.secciones || 'all') === 'all' ? (
                          <span className="text-[10px] text-brand-gold bg-brand-gold/5 px-2.5 py-1 rounded-lg border border-brand-gold/20 font-bold block w-fit uppercase tracking-tight select-none">
                            Acceso Total
                          </span>
                        ) : (u.secciones === 'none' || !u.secciones) ? (
                          <span className="text-[10px] text-slate-500 bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-800 block w-fit font-bold select-none">
                            Ninguna
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {u.secciones.split(',').map((s) => {
                              const found = SECCIONES_DISPONIBLES.find(sec => sec.id === s);
                              return (
                                <span 
                                  key={s}
                                  className="text-[9.5px] text-brand-lightgold bg-brand-deep/80 px-2 py-0.5 rounded border border-brand-gold/15 font-bold"
                                  title={found?.desc || s}
                                >
                                  {found ? found.label.split(' ')[0] : s}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right space-x-2">
                        <motion.button
                          id={`edit-user-${u.id}`}
                          onClick={() => handleEdit(u)}
                          whileHover={{ scale: 1.15, rotate: 10 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2 text-brand-lightgold/80 hover:text-brand-gold hover:bg-brand-deep/80 rounded-xl border border-brand-gold/10 transition-all inline-block cursor-pointer shadow-md"
                          title="Restablecer Contraseña / Editar Datos"
                        >
                          <Edit className="h-4 w-4" />
                        </motion.button>
                        <motion.button
                          id={`delete-user-${u.id}`}
                          onClick={() => handleDelete(u.id, u.usuario)}
                          disabled={isCurrentAdmin || isActiveUser}
                          whileHover={!(isCurrentAdmin || isActiveUser) ? { scale: 1.15 } : {}}
                          whileTap={!(isCurrentAdmin || isActiveUser) ? { scale: 0.95 } : {}}
                          className={`p-2 rounded-xl transition-all inline-block ${
                            (isCurrentAdmin || isActiveUser) 
                              ? 'text-slate-700 bg-transparent border border-slate-800 cursor-not-allowed' 
                              : 'text-brand-lightgold/80 hover:text-rose-400 hover:bg-rose-500/10 border border-brand-gold/10 hover:border-rose-500/20 cursor-pointer shadow-md'
                          }`}
                          title={(isCurrentAdmin || isActiveUser) ? 'Protegido de Fábrica' : 'Eliminar Cuenta'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
