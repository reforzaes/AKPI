import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { 
  Database, RefreshCw, Unlock, Lock, Target, ShowerHead, 
  TrendingUp, TrendingDown, ArrowRightLeft, 
  DoorClosed, LogIn, DoorOpen, Zap, Flower2, Sun, Wind, Battery, 
  Sprout, Fence, Droplets, Hammer, Gem, Ruler, Users, User, BookOpen, SmilePlus, ShoppingCart, LayoutGrid, ChevronRight, Utensils, TreeDeciduous, X,
  Archive
} from 'lucide-react';
import { 
  Section, MonthlyData, MonthStatus,
  MONTHS, CATEGORY_TARGETS, CATEGORY_GROUPS, SECTION_CONFIG, getTarget, 
  STRATEGIC_BLOCKS, INSTALLATION_SUB_CATEGORIES, calculateStrategicAchievement
} from './types';

const SCRIPT_URL = 'api.php';

// --- Funciones Auxiliares ---

function getCatIcon(c: string, size = 18) {
  const icons: any = { 
    'MAMPARAS': <ShowerHead size={size}/>, 'MUEBLES': <DoorClosed size={size}/>,
    'Armarios': <DoorClosed size={size}/>, 'Mediciones': <Ruler size={size}/>, 'MEDICIONES': <Ruler size={size}/>,
    'CBxP + PxP': <ArrowRightLeft size={size}/>, 'REFORMA': <Hammer size={size}/>,
    'Cifra de Venta (%Crec)': <ShoppingCart size={size}/>, 'Formacion Horas': <BookOpen size={size}/>, 'NPS': <SmilePlus size={size}/>,
    'Instalaciones': <LayoutGrid size={size}/>,
    'SUELO VINILICO': <Archive size={size}/>, 'PUERTAS PASO': <DoorOpen size={size}/>, 'PUERTAS ENTRADA': <LogIn size={size}/>,
    'SUELO LAMINADO': <Archive size={size}/>, 'VENTANAS': <LayoutGrid size={size}/>, 'TOLDOS': <Wind size={size}/>,
    'CONDUCTOS': <Wind size={size}/>, 'ESTUFAS+INSERT': <Hammer size={size}/>, 'SPLIT': <Zap size={size}/>,
    'CESPED': <Sprout size={size}/>, 'PERGOLAS': <Fence size={size}/>, 'SUELO EXT': <Droplets size={size}/>
  };
  return icons[c] || <Target size={size}/>;
}

function getStatusInfo(pct: number) {
  if (pct >= 70) return { label: '¡MÁXIMO NIVEL!', color: 'text-emerald-600', dot: 'bg-emerald-500' };
  if (pct >= 50) return { label: 'IMPULSO GANADOR', color: 'text-amber-600', dot: 'bg-amber-500' };
  return { label: 'MODO GUERRERO', color: 'text-rose-600', dot: 'bg-rose-500' };
}

const App: React.FC = () => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [statuses, setStatuses] = useState<MonthStatus[]>([]);
  const [sec, setSec] = useState<Section>('Sanitario');
  const [cat, setCat] = useState<string>('Cifra de Venta (%Crec)');
  const [grp, setGrp] = useState<string>('SAN_VEND_ESP');
  const [view, setView] = useState<'stats' | 'entry'>('stats');
  const [month, setMonth] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pin, setPin] = useState('');
  
  const [inspectedPillar, setInspectedPillar] = useState<{empId: string, pillarName: string} | null>(null);
  const [activeStrategicBlock, setActiveStrategicBlock] = useState<string | null>(null);

  const isEditMode = pin === '047';

  const init = async () => {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=loadData`);
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) throw new Error("JSON Inválido");
        json = JSON.parse(text.substring(firstBrace, lastBrace + 1));
      }
      if (json.monthly_data) {
        const mappedData = json.monthly_data.map((d: any) => ({
          employeeId: d.employee_id,
          month: parseInt(d.month_idx),
          category: d.category,
          section: d.section,
          actual: parseFloat(d.actual_value)
        }));
        setData(mappedData);
        localStorage.setItem('backup_data', JSON.stringify(mappedData));
      }
      if (json.month_status) {
        const mappedStatus = json.month_status.map((s: any) => ({
          month: parseInt(s.month_idx),
          section: s.section,
          isFilled: s.is_filled === "1" || s.is_filled === 1 || s.is_filled === true
        }));
        setStatuses(mappedStatus);
        localStorage.setItem('backup_status', JSON.stringify(mappedStatus));
      }
    } catch (e) {
      console.warn("Cargando desde backup local...");
      const localData = localStorage.getItem('backup_data');
      const localStatus = localStorage.getItem('backup_status');
      if (localData) setData(JSON.parse(localData));
      if (localStatus) setStatuses(JSON.parse(localStatus));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const saveToServer = async (action: string, payload: any) => {
    setSyncing(true);
    if (action === 'saveData') localStorage.setItem('backup_data', JSON.stringify(payload));
    if (action === 'saveStatus') localStorage.setItem('backup_status', JSON.stringify(payload));
    let mappedPayload = payload;
    if (action === 'saveData') {
      mappedPayload = payload.map((item: any) => ({
        employeeId: item.employeeId, month: item.month, category: item.category, section: item.section, value: item.actual
      }));
    } else if (action === 'saveStatus') {
      mappedPayload = payload.map((item: any) => ({
        month_idx: item.month, section: item.section, is_filled: item.is_filled ? 1 : 0
      }));
    }
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: mappedPayload })
      });
    } catch (e) {
      console.error("Fallo de sincronización.");
    } finally {
      setSyncing(false);
    }
  };

  const onUpdate = useCallback((empId: string, mIdx: number, val: number) => {
    if (!isEditMode) return;
    setData(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d.employeeId === empId && d.month === mIdx && d.category === cat && d.section === sec);
      if (idx > -1) next[idx].actual = val;
      else next.push({ employeeId: empId, month: mIdx, category: cat, section: sec, actual: val });
      saveToServer('saveData', next);
      return next;
    });
  }, [isEditMode, cat, sec]);

  const toggleStatus = useCallback((mIdx: number) => {
    if (!isEditMode || mIdx < 0) return;
    setStatuses(prev => {
      const next = [...prev];
      const idx = next.findIndex(s => s.month === mIdx && s.section === sec);
      if (idx > -1) next[idx].isFilled = !next[idx].isFilled;
      else next.push({ month: mIdx, section: sec, isFilled: true });
      saveToServer('saveStatus', next);
      return next;
    });
  }, [isEditMode, sec]);

  const isLocked = (mIdx: number) => statuses.find(s => s.month === mIdx && s.section === sec)?.isFilled ?? false;
  
  const activeMonthsWithData = useMemo(() => {
    const emps = (CATEGORY_GROUPS as any)[grp]?.employees || [];
    const active = [];
    for (let i = 0; i < 12; i++) {
      const hasData = emps.some((emp: any) => 
        data.some(d => d.employeeId === emp.id && d.month === i && d.section === sec && d.actual !== 0)
      );
      if (hasData) active.push(i);
    }
    return active;
  }, [data, sec, grp]);

  const handleSectionChange = (s: Section) => {
    setSec(s);
    setActiveStrategicBlock(null);
    setInspectedPillar(null);
    let prefix = s === 'Sanitario' ? 'SAN' : s === 'Cocinas' ? 'COC' : s === 'Madera' ? 'MAD' : s === 'EERR' ? 'EERR' : 'JARDIN';
    const isEsp = grp.includes('_ESP');
    let newGrp = `${prefix}_VEND_${isEsp ? 'ESP' : 'PROJ'}`;
    if (!(CATEGORY_GROUPS as any)[newGrp]) newGrp = (CATEGORY_GROUPS as any)[`${prefix}_VEND_PROJ`] ? `${prefix}_VEND_PROJ` : `${prefix}_VEND_ESP`;
    setGrp(newGrp);
    const profileCats = (CATEGORY_GROUPS as any)[newGrp]?.categories || [];
    setCat(profileCats[0] || STRATEGIC_BLOCKS[0]);
  };

  const handleProfileChange = (isEsp: boolean) => {
    let prefix = sec === 'Sanitario' ? 'SAN' : sec === 'Cocinas' ? 'COC' : sec === 'Madera' ? 'MAD' : sec === 'EERR' ? 'EERR' : 'JARDIN';
    const newGrp = `${prefix}_VEND_${isEsp ? 'ESP' : 'PROJ'}`;
    if (!(CATEGORY_GROUPS as any)[newGrp]) return;
    setGrp(newGrp);
    const profileCats = (CATEGORY_GROUPS as any)[newGrp]?.categories || [];
    setCat(profileCats[0] || STRATEGIC_BLOCKS[0]);
    setActiveStrategicBlock(null);
    setInspectedPillar(null);
  };

  const chartEvolutionData = useMemo(() => {
    const groupCategories = (CATEGORY_GROUPS as any)[grp]?.categories || [];
    const empsInGrp = (CATEGORY_GROUPS as any)[grp]?.employees || [];
    return MONTHS.map((mName, mIdx) => {
      const isMonthWithData = activeMonthsWithData.includes(mIdx);
      const row: any = { name: mName.substring(0, 3) };
      groupCategories.forEach((c: string) => {
        if (!isMonthWithData) { row[c] = null; return; }
        let sumActual = 0, sumTarget = 0;
        empsInGrp.forEach((emp: any) => {
          const val = data.find(d => d.employeeId === emp.id && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
          if (STRATEGIC_BLOCKS.includes(c)) {
            if (c !== 'Instalaciones') row[c] = calculateStrategicAchievement(c, val, 1, sec);
          } else {
            sumActual += val;
            sumTarget += getTarget(c, mIdx, sec, emp.id);
          }
        });
        if (!STRATEGIC_BLOCKS.includes(c)) row[c] = sumTarget > 0 ? Math.round((sumActual / sumTarget) * 100) : 0;
      });
      return row;
    });
  }, [data, sec, grp, activeMonthsWithData]);

  const leaderboardData = useMemo(() => {
    if (activeMonthsWithData.length === 0) return [];
    const emps = (CATEGORY_GROUPS as any)[grp]?.employees || [];
    const monthsActiveCount = activeMonthsWithData.length;
    return emps.map((emp: any) => {
      const isSpecialistProfile = (CATEGORY_GROUPS as any)[grp]?.isSpecialist;
      let pillars: any[] = [];
      if (isSpecialistProfile) {
        const vVals = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Cifra de Venta (%Crec)' && d.section === sec)?.actual || 0);
        const vAvg = vVals.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'Venta', icon: <ShoppingCart size={14}/>, pct: calculateStrategicAchievement('Cifra de Venta (%Crec)', vAvg, monthsActiveCount, sec), raw: vAvg.toFixed(1) + '%' });
        const fTotal = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Formacion Horas' && d.section === sec)?.actual || 0), 0);
        pillars.push({ name: 'Formación', icon: <BookOpen size={14}/>, pct: calculateStrategicAchievement('Formacion Horas' , fTotal, monthsActiveCount, sec), raw: fTotal + 'h' });
        const nVals = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'NPS' && d.section === sec)?.actual || 0);
        const nAvg = nVals.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'NPS', icon: <SmilePlus size={14}/>, pct: calculateStrategicAchievement('NPS', nAvg, monthsActiveCount, sec), raw: nAvg.toFixed(1) + '%' });
        const sCats = INSTALLATION_SUB_CATEGORIES[sec] || [];
        let tInstAct = 0, tInstTar = 0;
        sCats.forEach(sc => {
          tInstAct += activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === sc && d.section === sec)?.actual || 0), 0);
          tInstTar += activeMonthsWithData.reduce((acc, m) => acc + getTarget(sc, m, sec, emp.id), 0);
        });
        pillars.push({ name: 'Instalaciones', icon: <Hammer size={14}/>, pct: tInstTar > 0 ? (tInstAct / tInstTar) * 100 : 0, raw: tInstAct + ' ud' });
      } else {
        const empCats = ((CATEGORY_GROUPS as any)[grp]?.categories || []).filter((c: string) => !STRATEGIC_BLOCKS.includes(c));
        pillars = empCats.map((c: string) => {
          const act = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
          const tar = activeMonthsWithData.reduce((acc, m) => acc + getTarget(c, m, sec, emp.id), 0);
          return { name: c, icon: getCatIcon(c, 14), pct: tar > 0 ? (act / tar) * 100 : 0, raw: act + ' ud' };
        });
      }
      return {
        id: emp.id, fullName: emp.name, profileType: isSpecialistProfile ? 'ESPECIALISTA' : 'PROYECTO',
        percentage: Math.round(pillars.reduce((acc, p) => acc + p.pct, 0) / Math.max(1, pillars.length)),
        pillars, isSpecialist: isSpecialistProfile
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, sec, grp, activeMonthsWithData]);

  const globalSectionPerformance = useMemo(() => {
    if (leaderboardData.length === 0) return 0;
    return Math.round(leaderboardData.reduce((acc, l) => acc + l.percentage, 0) / leaderboardData.length);
  }, [leaderboardData]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Iniciando Sistema...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100 hidden sm:block"><Database size={18} /></div>
              <h1 className="font-black text-sm lg:text-lg tracking-tighter text-slate-800 whitespace-nowrap">Objetivos <span className="text-indigo-600">2026</span></h1>
              {syncing && <RefreshCw className="animate-spin text-indigo-500" size={14} />}
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="bg-slate-50 p-0.5 rounded-xl border border-slate-200 flex items-center">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[9px] font-black uppercase outline-none px-2 text-indigo-700 cursor-pointer">
                  <option value={-1}>Acumulado</option>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button onClick={() => toggleStatus(month)} disabled={!isEditMode || month === -1} className={`p-2 rounded-lg transition-all ${isLocked(month) ? 'text-green-600' : 'text-slate-300'}`}>
                  {isLocked(month) ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
              <div className="bg-slate-50 p-0.5 rounded-xl border border-slate-200 flex items-center">
                <button onClick={() => setView('stats')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'stats' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Analisis</button>
                <button onClick={() => setView('entry')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'entry' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>Datos</button>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isEditMode ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="w-6 bg-transparent text-center text-[9px] font-black outline-none text-current placeholder:text-slate-400" maxLength={3} />
                {isEditMode ? <Unlock size={12} /> : <Lock size={12} />}
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-between border-t border-slate-100 py-2 gap-3">
            <div className="bg-slate-50 p-0.5 rounded-xl border border-slate-200 flex items-center w-full lg:w-auto">
              <div className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 flex items-center gap-2 whitespace-nowrap"><LayoutGrid size={10} /> SECCIÓN</div>
              <select value={sec} onChange={(e) => handleSectionChange(e.target.value as Section)} className="bg-transparent text-[9px] font-black uppercase outline-none px-4 py-2 text-indigo-700 flex-1 lg:flex-none cursor-pointer">
                <option value="Sanitario">Sanitario</option>
                <option value="Cocinas">Cocinas</option>
                <option value="Madera">Madera</option>
                <option value="EERR">EERR</option>
                <option value="Jardin">Jardín</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 ${view === 'entry' ? 'w-full' : 'max-w-screen-2xl mx-auto px-4 lg:px-6'} py-6 lg:py-10`}>
        {view === 'entry' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-screen-2xl mx-auto px-4 lg:px-6">
              <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">{getCatIcon(cat, 22)}</div>
                    <div><h2 className="text-xl font-black tracking-tight text-slate-800">{cat}</h2><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Panel de Registro</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto bg-[#f8fafc]">
              <table className="w-full text-sm text-left border-collapse border-y border-slate-200">
                <thead>
                  <tr className="bg-slate-100/50">
                    <th className="p-6 font-black text-slate-600 sticky left-0 bg-slate-100/80 backdrop-blur-md z-20 border-r uppercase text-[10px] tracking-widest min-w-[200px]">Colaborador</th>
                    {MONTHS.map((m, i) => <th key={m} className={`p-3 font-black text-center text-[9px] uppercase tracking-widest ${i === month ? 'text-indigo-600 bg-indigo-100/50' : 'text-slate-400'}`}>{m.substring(0, 3).toUpperCase()}</th>)}
                    <th className="p-3 font-black text-indigo-700 text-center bg-indigo-50/50 uppercase text-[10px] tracking-widest w-24 border-l">Cumpl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {((CATEGORY_GROUPS as any)[grp]?.employees || []).map((emp: any) => {
                    const monthValues = MONTHS.map((_, i) => data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0);
                    const totalVal = monthValues.reduce((acc, v) => acc + v, 0);
                    const totalTarget = MONTHS.reduce((acc, _, i) => acc + getTarget(cat, i, sec, emp.id), 0);
                    const currentAch = totalTarget > 0 ? (totalVal / totalTarget) * 100 : 0;
                    return <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-6 font-bold text-slate-700 sticky left-0 bg-[#f8fafc] z-10 border-r text-xs">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = monthValues[i];
                        const target = getTarget(cat, i, sec, emp.id);
                        let achPct = target > 0 ? (val / target) * 100 : (val !== 0 ? 100 : 0);
                        let color = val < 0 ? 'bg-rose-50 text-rose-600' : val > 0 ? (achPct >= 70 ? 'bg-emerald-50 text-emerald-700' : achPct >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600') : 'bg-slate-50/30 text-slate-400';
                        return <td key={i} className={`p-2 border-r border-slate-200/40 text-center ${color} ${i === month ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}>
                          <div className="flex flex-col items-center">
                            <input type="number" step="0.1" value={val || ''} disabled={isLocked(i) || !isEditMode} placeholder="0" onChange={(e) => onUpdate(emp.id, i, parseFloat(e.target.value) || 0)} className={`w-full max-w-[48px] h-8 text-center bg-transparent font-black outline-none text-base`} />
                            <div className="text-[8px] font-black opacity-50 uppercase mt-1">OBJ: {target}</div>
                          </div>
                        </td>
                      })}
                      <td className="p-4 text-center border-l border-slate-200 bg-white"><span className={`text-base font-black ${currentAch >= 70 ? 'text-emerald-600' : currentAch >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>{Math.round(currentAch)}%</span></td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><TrendingUp size={24} /></div>
                        <div><h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Evolución Estratégica {sec}</h3></div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-4xl lg:text-5xl font-black ${globalSectionPerformance >= 70 ? 'text-emerald-600' : globalSectionPerformance >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>{globalSectionPerformance}%</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">CUMPLIMIENTO GLOBAL</span>
                    </div>
                </div>
                <div className="h-[350px] lg:h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 125]} tick={{fill: '#4f46e5', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} label={{ value: 'CONSECUCIÓN (%)', angle: -90, position: 'insideLeft', style: {fontWeight: 900, fontSize: 10, fill: '#6366f1'} }} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px'}} />
                            <Legend wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase'}} iconType="circle" />
                            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} label={{ position: 'right', value: 'META (70%)', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                            {((CATEGORY_GROUPS as any)[grp]?.categories || []).filter((c: string) => !STRATEGIC_BLOCKS.includes(c) || (c !== 'Instalaciones')).map((c: string, i: number) => (
                                <Line key={c} type="monotone" dataKey={c} name={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} connectNulls={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                    {leaderboardData.map((info, idx) => {
                        const status = getStatusInfo(info.percentage);
                        const isThisEmpInspected = inspectedPillar?.empId === info.id;
                        return (
                            <div key={idx} className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-100 shadow-lg transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center rounded-2xl font-black text-xl shadow-md">{info.fullName.charAt(0)}</div>
                                      <div><h4 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{info.fullName}</h4><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{info.profileType}</p></div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-center flex flex-col items-center ${info.percentage >= 70 ? 'bg-emerald-50 text-emerald-600' : info.percentage >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <span className="text-2xl font-black tracking-tighter">{info.percentage}%</span>
                                        <span className="text-[7px] font-black uppercase tracking-tighter">Media</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    {info.pillars.map((pillar: any, pIdx: number) => {
                                        const isActiveDetail = inspectedPillar?.empId === info.id && inspectedPillar?.pillarName === pillar.name;
                                        return (
                                          <button key={pIdx} onClick={() => setInspectedPillar(isActiveDetail ? null : { empId: info.id, pillarName: pillar.name })} className={`p-4 rounded-2xl border transition-all text-left ${isActiveDetail ? 'bg-indigo-600 border-indigo-600 scale-105 shadow-md text-white' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'}`}>
                                              <div className="flex items-center gap-2 mb-2"><div className={isActiveDetail ? 'text-indigo-200' : 'text-slate-500'}>{pillar.icon}</div><span className={`text-[8px] font-black uppercase tracking-tight ${isActiveDetail ? 'text-indigo-100' : 'text-slate-600'}`}>{pillar.name}</span></div>
                                              <div className="text-xl font-black">{Math.round(pillar.pct)}%</div>
                                              <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${isActiveDetail ? 'bg-white/20' : 'bg-slate-200/50'}`}><div className={`h-full rounded-full ${isActiveDetail ? 'bg-white' : (pillar.pct >= 70 ? 'bg-emerald-500' : pillar.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(pillar.pct, 100)}%` }}></div></div>
                                          </button>
                                        );
                                    })}
                                </div>
                                {isThisEmpInspected && (
                                  <div className="mb-6 p-6 bg-slate-900 rounded-[2rem] border border-slate-700 animate-in fade-in zoom-in-95 shadow-2xl relative">
                                      <button onClick={() => setInspectedPillar(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16} /></button>
                                      <h6 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">Desglose: {inspectedPillar.pillarName}</h6>
                                      <div className="space-y-4">
                                        {activeMonthsWithData.map(m => {
                                          let targetName = inspectedPillar.pillarName === 'Venta' ? 'Cifra de Venta (%Crec)' : inspectedPillar.pillarName === 'Formación' ? 'Formacion Horas' : inspectedPillar.pillarName === 'NPS' ? 'NPS' : inspectedPillar.pillarName;
                                          let unit = inspectedPillar.pillarName === 'Venta' ? '%' : inspectedPillar.pillarName === 'Formación' ? 'h' : inspectedPillar.pillarName === 'NPS' ? '%' : ' ud';
                                          
                                          let subItems = [];
                                          if (inspectedPillar.pillarName === 'Instalaciones') {
                                            subItems = INSTALLATION_SUB_CATEGORIES[sec].map(sc => {
                                              const v = data.find(d => d.employeeId === info.id && d.month === m && d.category === sc && d.section === sec)?.actual || 0;
                                              const t = getTarget(sc, m, sec, info.id);
                                              const a = t > 0 ? (v / t) * 100 : (v > 0 ? 100 : 0);
                                              return { name: sc, val: v, ach: a, unit: ' ud' };
                                            });
                                          } else {
                                            const v = data.find(d => d.employeeId === info.id && d.month === m && d.category === targetName && d.section === sec)?.actual || 0;
                                            const ach = STRATEGIC_BLOCKS.includes(targetName) ? calculateStrategicAchievement(targetName, v, 1, sec) : (v / getTarget(targetName, m, sec, info.id)) * 100;
                                            subItems = [{ name: MONTHS[m], val: v, ach: ach, unit: unit }];
                                          }

                                          return subItems.map((item, si) => (
                                            <div key={`${m}-${si}`} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0">
                                              <span className="text-[9px] font-black text-slate-400 uppercase">{item.name} {inspectedPillar.pillarName === 'Instalaciones' ? `(${MONTHS[m]})` : ''}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 tracking-tighter">{item.val}{item.unit}</span>
                                                <span className={`text-[11px] font-black ${item.ach >= 70 ? 'text-emerald-400' : item.ach >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                  {Math.round(item.ach)}%
                                                </span>
                                              </div>
                                            </div>
                                          ));
                                        })}
                                      </div>
                                  </div>
                                )}
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div><span className={`text-[9px] font-black uppercase tracking-[0.1em] ${status.color}`}>{status.label}</span></div>
                                    {info.percentage >= 70 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}
      </main>
      <footer className="py-12 text-center border-t border-slate-100 bg-white"><p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">Objetivos 2026 | By Javier González</p></footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);