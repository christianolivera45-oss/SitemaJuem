import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from '../api';
import {
  Calculator,
  History,
  BookOpen,
  Info,
  Check,
  AlertTriangle,
  AlertCircle,
  ClipboardCheck,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface ArqueoCajaViewProps {
  finanzasCuentas: any[];
  finanzasMovimientos: any[];
  sales: any[];
  arqueosList: any[];
  refreshSystemData: () => Promise<void>;
  setShowAddMovimientoModal: (show: boolean) => void;
  totalDisponible: number;
  cobranzasPendientes: number;
  pagosPendientes: number;
  saldoProyectado: number;
  setCompletingMovimiento: (mov: any) => void;
  setFinanzasCompletingCuenta: (accountName: string) => void;
  handleDeleteFinancialMovement: (movId: number) => Promise<void>;
}

export const ArqueoCajaView: React.FC<ArqueoCajaViewProps> = ({
  finanzasCuentas,
  finanzasMovimientos,
  sales,
  arqueosList,
  refreshSystemData,
  setShowAddMovimientoModal,
  totalDisponible,
  cobranzasPendientes,
  pagosPendientes,
  saldoProyectado,
  setCompletingMovimiento,
  setFinanzasCompletingCuenta,
  handleDeleteFinancialMovement
}) => {
  const [activeFinanzasSubTab, setActiveFinanzasSubTab] = useState<'arqueo-diario' | 'historial-arqueos' | 'libro-mayor'>('arqueo-diario');
  const [selectedArqueoCuenta, setSelectedArqueoCuenta] = useState('Caja Chica (Mostrador)');
  const [openingBalanceInput, setOpeningBalanceInput] = useState<string>('0');
  const [arqueoBilletesMonedas, setArqueoBilletesMonedas] = useState<{ [key: string]: number }>({
    "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
  });
  const [arqueoAjustarSaldo, setArqueoAjustarSaldo] = useState(true);
  const [arqueoObservaciones, setArqueoObservaciones] = useState('');
  const [isSavingArqueo, setIsSavingArqueo] = useState(false);

  // Get selected account
  const currentAccount = finanzasCuentas.find(c => c.nombre === selectedArqueoCuenta) || finanzasCuentas[0] || { nombre: 'Caja Chica (Mostrador)', saldo: 0 };

  // Sync default physical opening balance when account shifts or loads
  useEffect(() => {
    if (currentAccount) {
      setOpeningBalanceInput(Number(currentAccount.saldo || 0).toString());
    }
  }, [selectedArqueoCuenta, currentAccount?.id, currentAccount?.saldo]);

  // Parse custom opening balance or default to 0
  const activeOpeningBalance = Number(openingBalanceInput) || 0;

  // Filter sales registered today
  const salesTodaySum = sales.filter((s: any) => {
    const saleDate = new Date(s.fecha);
    const today = new Date();
    return saleDate.getDate() === today.getDate() &&
           saleDate.getMonth() === today.getMonth() &&
           saleDate.getFullYear() === today.getFullYear();
  }).reduce((sum, s) => sum + Number(s.total || 0), 0);

  // Filter today's completed movements for selectedAccount
  const movsToday = finanzasMovimientos.filter(m => {
    if (m.estado !== 'completado') return false;
    const affectsThis = (m.tipo === 'ingreso' && m.origen_cuenta === selectedArqueoCuenta) ||
                        (m.tipo === 'egreso' && m.destino_cuenta === selectedArqueoCuenta) ||
                        (m.tipo === 'transferencia' && (m.origen_cuenta === selectedArqueoCuenta || m.destino_cuenta === selectedArqueoCuenta));
    if (!affectsThis) return false;
    const mDate = new Date(m.fecha);
    const today = new Date();
    return mDate.getDate() === today.getDate() &&
           mDate.getMonth() === today.getMonth() &&
           mDate.getFullYear() === today.getFullYear();
  });

  const ingresosManualesSum = movsToday
    .filter(m => (m.tipo === 'ingreso' && m.origen_cuenta === selectedArqueoCuenta) || (m.tipo === 'transferencia' && m.destino_cuenta === selectedArqueoCuenta))
    .reduce((sum, m) => sum + Number(m.monto || 0), 0);

  const egresosManualesSum = movsToday
    .filter(m => (m.tipo === 'egreso' && m.destino_cuenta === selectedArqueoCuenta) || (m.tipo === 'transferencia' && m.origen_cuenta === selectedArqueoCuenta))
    .reduce((sum, m) => sum + Number(m.monto || 0), 0);

  const isCajaChica = selectedArqueoCuenta.toLowerCase().includes("caja");
  const ventasVal = isCajaChica ? salesTodaySum : 0;

  const theoreticalVal = activeOpeningBalance + ventasVal + ingresosManualesSum - egresosManualesSum;

  const totalPhysical = Object.entries(arqueoBilletesMonedas).reduce((sum, [denomination, qty]) => {
    return sum + (Number(denomination) * Number(qty));
  }, 0);

  const physicalDiff = totalPhysical - theoreticalVal;

  const handleSaveArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingArqueo(true);
    try {
      const response = await fetch('/api/finanzas/arqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuenta: selectedArqueoCuenta,
          saldo_inicial: activeOpeningBalance,
          ventas_sistema: ventasVal,
          ingresos_manuales: ingresosManualesSum,
          egresos_manuales: egresosManualesSum,
          saldo_teorico: theoreticalVal,
          dinero_fisico: totalPhysical,
          diferencia: physicalDiff,
          observaciones: arqueoObservaciones,
          desglose: arqueoBilletesMonedas,
          ajustar_saldo: arqueoAjustarSaldo
        })
      });

      if (response.ok) {
        setArqueoBilletesMonedas({
          "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
        });
        setArqueoObservaciones('');
        await refreshSystemData();
        alert(`¡Arqueo diario guardado exitosamente! Diferencia: $${physicalDiff.toLocaleString('es-UY')}`);
      } else {
        const errJson = await response.json();
        alert(`Ocurrió un error al guardar: ${errJson.error || 'Intente de nuevo.'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conectividad al procesar el arqueo de caja.');
    } finally {
      setIsSavingArqueo(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 text-left">
      {/* Upper Header and Stat Cards */}
      <div className="bg-gradient-to-r from-emerald-950 to-slate-900 p-6 rounded-2xl border border-emerald-900 shadow-lg text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-500/10">
              Control Diario de Caja y Bancos
            </span>
            <h2 className="text-xl font-bold font-display mt-1">
              Arqueo de Caja y Movimientos
            </h2>
            <p className="text-slate-300 text-xs mt-1">
              Un arqueo de caja diario es el control que se hace al finalizar el día para verificar que el dinero físico coincide con las ventas y movimientos registrados en el sistema.
            </p>
          </div>
          <button
            onClick={() => setShowAddMovimientoModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md text-xs font-bold font-display transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Movimiento Manual</span>
          </button>
        </div>

        {/* Sub-tabs switcher */}
        <div className="flex flex-wrap gap-2 mt-6 bg-white/5 p-1 rounded-xl border border-white/10 max-w-lg">
          <button
            onClick={() => setActiveFinanzasSubTab('arqueo-diario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFinanzasSubTab === 'arqueo-diario'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-300" />
            <span>Arqueo de Caja Diario</span>
          </button>
          <button
            onClick={() => setActiveFinanzasSubTab('historial-arqueos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFinanzasSubTab === 'historial-arqueos'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-300" />
            <span>Historial de Arqueos</span>
          </button>
          <button
            onClick={() => setActiveFinanzasSubTab('libro-mayor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeFinanzasSubTab === 'libro-mayor'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
            <span>Libro Mayor y Cuentas</span>
          </button>
        </div>
      </div>

      {activeFinanzasSubTab === 'arqueo-diario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Account selector and formula */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-display">1. Seleccionar Caja/Cuenta</h3>
                <Calculator className="w-4 h-4 text-emerald-600" />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">Cuenta de Tesorería:</label>
                  <select
                    value={selectedArqueoCuenta}
                    onChange={(e) => {
                      setSelectedArqueoCuenta(e.target.value);
                      setArqueoBilletesMonedas({
                        "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
                      });
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {finanzasCuentas.map((acc: any) => (
                      <option key={acc.id} value={acc.nombre}>{acc.nombre} (Saldo: ${Number(acc.saldo).toLocaleString('es-UY')})</option>
                    ))}
                  </select>
                </div>

                {/* Opening balance override input */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-500 flex items-center justify-between">
                    <span>Monto de Apertura de Caja (UYU):</span>
                    <button
                      type="button"
                      onClick={() => setOpeningBalanceInput(Number(currentAccount.saldo || 0).toString())}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline decoration-dotted bg-transparent border-0 p-0"
                      title="Restablecer al saldo actual registrado en el sistema"
                    >
                      Restablecer al oficial
                    </button>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={openingBalanceInput}
                      onChange={(e) => setOpeningBalanceInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Ajuste este valor libremente si el fondo físico inicial real con el que abre difiere del saldo registrado.
                  </p>
                </div>

                {/* Calculations Formula */}
                <div className="bg-slate-50 border border-slate-105 rounded-xl p-4 mt-2 space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Fórmula de Cuadre Teórico (Hoy)
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Saldo Apertura (Manual):</span>
                      <span className="font-mono font-medium text-slate-700 font-bold">${activeOpeningBalance.toLocaleString('es-UY')}</span>
                    </div>

                    {isCajaChica && (
                      <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/50 pt-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[8px]">+</span>
                          Ventas de Hoy de Mostrador:
                        </span>
                        <span className="font-mono font-medium text-emerald-600">+${salesTodaySum.toLocaleString('es-UY')}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/50 pt-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[8px]">+</span>
                        Ingresos Manuales de Hoy:
                      </span>
                      <span className="font-mono font-medium text-emerald-600">+${ingresosManualesSum.toLocaleString('es-UY')}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/50 pt-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center font-bold text-[8px]">-</span>
                        Egresos de Hoy:
                      </span>
                      <span className="font-mono font-medium text-red-600">-${egresosManualesSum.toLocaleString('es-UY')}</span>
                    </div>

                    <div className="flex justify-between items-center font-bold text-slate-900 border-t-2 border-dashed border-slate-300 pt-2 text-sm">
                      <span>Saldo Teórico Esperado:</span>
                      <span className="font-mono text-indigo-600">${theoreticalVal.toLocaleString('es-UY')}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl text-indigo-950 text-[11px] leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-indigo-900">
                    <Info className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                    ¿Cómo funciona el arqueo?
                  </p>
                  El sistema calcula el saldo en papel que se debería tener (teórico), y usted hace el conteo físico real. Al finalizar, la diferencia quedará registrada para auditorías.
                </div>
              </div>
            </div>

            {/* Results verification card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-display">3. Verificar y Registrar</h3>
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <form onSubmit={handleSaveArqueo} className="space-y-4">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Saldo Teórico en Sistema:</span>
                    <span className="font-mono font-bold">${theoreticalVal.toLocaleString('es-UY')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-200/60 pb-2">
                    <span className="text-slate-600">Efectivo Físico Contado:</span>
                    <span className="font-mono font-bold text-emerald-600 text-sm">${totalPhysical.toLocaleString('es-UY')}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-bold text-slate-900">Diferencia:</span>
                    <span className={`font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-full ${
                      physicalDiff === 0 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50' 
                        : physicalDiff > 0 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200/50' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200/50'
                    }`}>
                      {physicalDiff === 0 ? '$0.00' : (physicalDiff > 0 ? '+' : '') + physicalDiff.toLocaleString('es-UY')}
                    </span>
                  </div>
                </div>

                {physicalDiff === 0 ? (
                  <div className="bg-emerald-50 text-emerald-950 p-3 rounded-xl text-[11px] border border-emerald-100/50 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>¡Caja Cuadrada!</strong> El dinero físico contado coincide perfectamente con las ventas y movimientos del sistema.</span>
                  </div>
                ) : physicalDiff > 0 ? (
                  <div className="bg-amber-50 text-amber-950 p-3 rounded-xl text-[11px] border border-amber-100/50 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Sobrante de caja:</strong> Hay ${physicalDiff.toLocaleString('es-UY')} adicionales en físico.</span>
                  </div>
                ) : (
                  <div className="bg-rose-50 text-rose-950 p-3 rounded-xl text-[11px] border border-rose-100/50 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>Faltante de caja:</strong> Faltan ${Math.abs(physicalDiff).toLocaleString('es-UY')} en efectivo físico.</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Observaciones:</label>
                  <textarea
                    value={arqueoObservaciones}
                    onChange={(e) => setArqueoObservaciones(e.target.value)}
                    placeholder="Escriba comentarios adicionales sobre el cierre diario aquí..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white placeholder-slate-400 h-20 resize-none focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/70 border border-slate-200/50">
                  <input
                    type="checkbox"
                    checked={arqueoAjustarSaldo}
                    onChange={(e) => setArqueoAjustarSaldo(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded mt-0.5 cursor-pointer"
                  />
                  <div className="text-[11px] leading-tight text-slate-700">
                    <strong>Ajustar saldo oficial de la cuenta</strong>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Sincroniza el balance oficial en el ERP para que refleje el valor contado real.
                    </p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isSavingArqueo}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-350 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 font-display"
                >
                  {isSavingArqueo ? 'Guardando...' : 'Cerrar Caja y Guardar Arqueo'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Physical Coin counter sheet */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">2. Declarar Efectivo Físico</h3>
                <p className="text-[10px] text-slate-400">Contabilice las cantidades correspondientes para Pesos Uruguayos.</p>
              </div>
              <Calculator className="w-5 h-5 text-indigo-600 shrink-0" />
            </div>

            <div className="space-y-4">
              {/* Billetes */}
              <div>
                <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Billetes (Pesos Uruguayos)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["2000", "1000", "500", "200", "100", "50", "20"].map((denom) => {
                    const val = arqueoBilletesMonedas[denom] || 0;
                    return (
                      <div key={denom} className="flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-7 bg-indigo-150 border border-indigo-200 rounded flex items-center justify-center text-[10px] font-black text-indigo-900 shadow-3xs">
                            ${denom}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: Math.max(0, val - 1)
                              }));
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={val || ''}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value) || 0;
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: parsed
                              }));
                            }}
                            className="w-12 text-center bg-white text-xs font-bold text-slate-900 border border-slate-300 rounded-md py-0.5 px-1 font-mono"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: val + 1
                              }));
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-20 text-right font-mono text-[11px] font-bold text-slate-600">
                          ${(Number(denom) * val).toLocaleString('es-UY')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monedas */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-2">Monedas (Pesos Uruguayos)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {["10", "5", "2", "1"].map((denom) => {
                    const val = arqueoBilletesMonedas[denom] || 0;
                    return (
                      <div key={denom} className="flex items-center justify-between bg-slate-50 border border-slate-200/60 rounded-xl p-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200/60 flex items-center justify-center text-[10px] font-extrabold text-amber-800 shadow-3xs">
                            ${denom}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: Math.max(0, val - 1)
                              }));
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={val || ''}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value) || 0;
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: parsed
                              }));
                            }}
                            className="w-12 text-center bg-white text-xs font-bold text-slate-900 border border-slate-300 rounded-md py-0.5 px-1 font-mono"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setArqueoBilletesMonedas(prev => ({
                                ...prev,
                                [denom]: val + 1
                              }));
                            }}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-20 text-right font-mono text-[11px] font-bold text-slate-600">
                          ${(Number(denom) * val).toLocaleString('es-UY')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cumulative Total banner */}
              <div className="bg-indigo-600 rounded-xl p-4 text-white flex justify-between items-center mt-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-85">Efectivo Total Declarado</p>
                  <p className="text-[10px] opacity-70">Suma total del conteo de arriba</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-2xl font-black">${totalPhysical.toLocaleString('es-UY')}</span>
                  <span className="text-[10px] block opacity-85 text-indigo-200">UYU</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFinanzasSubTab === 'historial-arqueos' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Historial de Controles y Arqueos</h3>
              <p className="text-[10px] text-slate-400">Revisiones fiscales registradas al finalizar la jornada.</p>
            </div>
            <History className="w-4 h-4 text-indigo-600 font-bold" />
          </div>

          {arqueosList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay arqueos anteriores registrados. Realice su primer control diario hoy.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                    <th className="py-3 px-4 font-bold">Caja / Cuenta</th>
                    <th className="py-3 px-4 font-bold text-right">Saldo Teórico</th>
                    <th className="py-3 px-4 font-bold text-right">Físico Contado</th>
                    <th className="py-3 px-4 font-bold text-center">Diferencia</th>
                    <th className="py-3 px-4 font-bold">Observaciones / Desglose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {arqueosList.map((arq: any) => {
                    const diff = Number(arq.diferencia || 0);
                    const desg = typeof arq.desglose === 'string' ? JSON.parse(arq.desglose) : arq.desglose;
                    return (
                      <tr key={arq.id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                        <td className="py-3 px-4 font-mono font-bold text-[11px] whitespace-nowrap text-slate-900">
                          {new Date(arq.fecha).toLocaleString('es-UY')}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-950">{arq.cuenta}</td>
                        <td className="py-3 px-4 text-right font-mono">${Number(arq.saldo_teorico || 0).toLocaleString('es-UY')}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-800 font-bold">${Number(arq.dinero_fisico || 0).toLocaleString('es-UY')}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
                            diff === 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : diff > 0 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                          }`}>
                            {diff === 0 ? '$0.00' : (diff > 0 ? '+' : '') + diff.toLocaleString('es-UY')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1.5 max-w-xs">
                            <p className="text-[11px] leading-tight text-slate-500 italic block">
                              {arq.observaciones || <span className="opacity-40">Sin comentarios</span>}
                            </p>
                            {desg && Object.values(desg).some(v => Number(v) > 0) && (
                              <div className="flex flex-wrap gap-1 text-[8px]">
                                {Object.entries(desg)
                                  .filter(([_, qty]) => Number(qty) > 0)
                                  .map(([den, qty]) => (
                                    <span key={den} className="bg-indigo-50 text-indigo-700 font-bold px-1 rounded-sm font-mono">
                                      ${den}x{qty as number}
                                    </span>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeFinanzasSubTab === 'libro-mayor' && (
        <div className="space-y-6">
          {/* Card stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-left text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Total Disponible Líquido</span>
              <div className="text-xl font-mono font-black mt-1 text-emerald-400">
                ${totalDisponible.toLocaleString('es-UY')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Efectivo en caja y saldos de cuentas reconciliadas</p>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-left text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">Cobranzas Proyectadas</span>
              <div className="text-xl font-mono font-black mt-1 text-indigo-400">
                +${cobranzasPendientes.toLocaleString('es-UY')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Ventas o deudas activas por cobrar</p>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-left text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-300">Pagos Pendientes</span>
              <div className="text-xl font-mono font-black mt-1 text-rose-400">
                -${pagosPendientes.toLocaleString('es-UY')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Órdenes de compra o liquidaciones de DAC pendientes</p>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-left text-white">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 font-extrabold">Saldo Neto Proyectado</span>
              <div className="text-xl font-mono font-black mt-1 text-indigo-300">
                ${saldoProyectado.toLocaleString('es-UY')}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Proyección disponible sumando créditos y deudas</p>
            </div>
          </div>

          {/* Accounts Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Saldos Desglosados por Cuenta</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {finanzasCuentas.map((acc: any) => (
                <div key={acc.id} className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-200 hover:-translate-y-0.5 transition-all">
                  <div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 font-mono">
                      {acc.tipo === 'banco' ? '🏦 Entidad Bancaria' : '💵 Caja / Efectivo'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 font-display mt-2">{acc.nombre}</h4>
                  </div>
                  <div className="text-right mt-4 border-t border-slate-200/40 pt-2 font-mono">
                    <span className="text-[10px] text-slate-400 block font-bold">Balance Reconciliado</span>
                    <span className="font-mono text-base font-black text-slate-950">${Number(acc.saldo).toLocaleString('es-UY')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table history */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-950 font-display">Historial de Libro Diario y Conciliaciones</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Registre depósitos bancarios, extracciones y movimientos varios.</p>
              </div>
            </div>

            <div className="overflow-x-auto font-medium">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <th className="py-2.5 px-3 font-bold">Fecha / ID</th>
                    <th className="py-2.5 px-3 font-bold">Concepto</th>
                    <th className="py-2.5 px-3 font-bold">Cuentas Relacionadas</th>
                    <th className="py-2.5 px-3 font-bold">Tipo</th>
                    <th className="py-2.5 px-3 font-bold text-right">Importe</th>
                    <th className="py-2.5 px-3 font-bold text-center">Estado</th>
                    <th className="py-2.5 px-3 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finanzasMovimientos.map((mov: any) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-all font-medium text-slate-700">
                      <td className="py-3 px-3 font-mono font-bold text-[10px]">
                        {new Date(mov.fecha).toLocaleDateString('es-UY')}
                      </td>
                      <td className="py-3 px-3 text-slate-900 font-semibold">{mov.concepto}</td>
                      <td className="py-3 px-3 text-[11px]">
                        {mov.origen_cuenta && mov.destino_cuenta ? (
                          <span className="text-slate-500 font-mono flex items-center gap-1">
                            {mov.origen_cuenta} &rarr; {mov.destino_cuenta}
                          </span>
                        ) : mov.origen_cuenta ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1 rounded flex items-center gap-1 max-w-max font-mono">
                            Ingresó en: {mov.origen_cuenta}
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 px-1 rounded flex items-center gap-1 max-w-max font-mono">
                            Egresó de: {mov.destino_cuenta}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`capitalize inline-block px-2 text-[10px] py-0.5 rounded-full ${
                          mov.tipo === 'ingreso' || mov.tipo === 'pendiente_cobro' 
                            ? 'bg-emerald-50 text-emerald-800' 
                            : mov.tipo === 'transferencia'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-rose-50 text-rose-800'
                        }`}>
                          {mov.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                        ${Number(mov.monto).toLocaleString('es-UY')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          mov.estado === 'completado' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/50' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200/50'
                        }`}>
                          {mov.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {mov.estado === 'pendiente' && (
                            <button
                              onClick={() => {
                                setCompletingMovimiento(mov);
                                setFinanzasCompletingCuenta(finanzasCuentas[0]?.nombre || '');
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
                            >
                              Conciliar/Cobrar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteFinancialMovement(mov.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                            title="Quitar de libro diario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
