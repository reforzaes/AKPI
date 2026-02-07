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

// --- Funciones Auxiliares (Definidas arriba para evitar ReferenceError) ---

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
  // Umbrales solicitados: <50 Rojo, 50-70 Amarillo, >70 Verde
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
      if (!res.ok) {
        throw new Error(`Error HTTP: ${res.status}`);
      }
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
      console.warn("API offline o api.php no encontrado. Cargando desde backup local...");
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
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: mappedPayload })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
    } catch (e) {
      console.error("No se pudo sincronizar con el servidor.");
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
    
    let prefix = '';
    switch(s) {
      case 'Sanitario': prefix = 'SAN'; break;
      case 'Cocinas': prefix = 'COC'; break;
      case 'Madera': prefix = 'MAD'; break;
      case 'EERR': prefix = 'EERR'; break;
      case 'Jardin': prefix = 'JARDIN'; break;
    }
    
    const isEsp = grp.includes('_ESP');
    let newGrp = `${prefix}_VEND_${isEsp ? 'ESP' : 'PROJ'}`;
    
    if (!(CATEGORY_GROUPS as any)[newGrp]) {
      newGrp = (CATEGORY_GROUPS as any)[`${prefix}_VEND_PROJ`] ? `${prefix}_VEND_PROJ` : `${prefix}_VEND_ESP`;
    }
    
    setGrp(newGrp);
    const profileCats = (CATEGORY_GROUPS as any)[newGrp]?.categories || [];
    setCat(profileCats[0] || STRATEGIC_BLOCKS[0]);
  };

  const handleProfileChange = (isEsp: boolean) => {
    let prefix = '';
    switch(sec) {
      case 'Sanitario': prefix = 'SAN'; break;
      case 'Cocinas': prefix = 'COC'; break;
      case 'Madera': prefix = 'MAD'; break;
      case 'EERR': prefix = 'EERR'; break;
      case 'Jardin': prefix = 'JARDIN'; break;
    }
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
        if (!isMonthWithData) {
          row[c] = null;
          return;
        }
        let sumActual = 0;
        let sumTarget = 0;
        empsInGrp.forEach((emp: any) => {
            const val = data.find(d => d.employeeId === emp.id && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
            if (STRATEGIC_BLOCKS.includes(c)) {
              if (c !== 'Instalaciones') row[c] = calculateStrategicAchievement(c, val, 1, sec);
            } else {
              sumActual += val;
              sumTarget += getTarget(c, mIdx, sec, emp.id);
            }
        });
        if (!STRATEGIC_BLOCKS.includes(c)) {
          row[c] = sumTarget > 0 ? Math.round((sumActual / sumTarget) * 100) : 0;
        }
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
        const ventaValues = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Cifra de Venta (%Crec)' && d.section === sec)?.actual || 0);
        const ventaAvg = ventaValues.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'Venta', icon: <ShoppingCart size={14}/>, pct: calculateStrategicAchievement('Cifra de Venta (%Crec)', ventaAvg, monthsActiveCount, sec), raw: ventaAvg.toFixed(1) + '%' });
        
        const formTotal = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Formacion Horas' && d.section === sec)?.actual || 0), 0);
        pillars.push({ name: 'Formación', icon: <BookOpen size={14}/>, pct: calculateStrategicAchievement('Formacion Horas' , formTotal, monthsActiveCount, sec), raw: formTotal + 'h' });
        
        const npsValues = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'NPS' && d.section === sec)?.actual || 0);
        const npsAvg = npsValues.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'NPS', icon: <SmilePlus size={14}/>, pct: calculateStrategicAchievement('NPS', npsAvg, monthsActiveCount, sec), raw: npsAvg.toFixed(1) + '%' });
        
        const subCats = INSTALLATION_SUB_CATEGORIES[sec] || [];
        let totalInstActual = 0, totalInstTarget = 0;
        subCats.forEach(sc => {
          totalInstActual += activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === sc && d.section === sec)?.actual || 0), 0);
          totalInstTarget += activeMonthsWithData.reduce((acc, m) => acc + getTarget(sc, m, sec, emp.id), 0);
        });
        pillars.push({ name: 'Instalaciones', icon: <Hammer size={14}/>, pct: totalInstTarget > 0 ? (totalInstActual / totalInstTarget) * 100 : 0, raw: totalInstActual + ' ud' });
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

  const currentPrefix = sec === 'Madera' ? 'MAD' : sec === 'Sanitario' ? 'SAN' : sec === 'Cocinas' ? 'COC' : sec;
  const hasEsp = !!(CATEGORY_GROUPS as any)[`${currentPrefix}_VEND_ESP`];
  const hasProj = !!(CATEGORY_GROUPS as any)[`${currentPrefix}_VEND_PROJ`];

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
            {hasEsp && hasProj && (
              <div className="bg-slate-50 p-0.5 rounded-xl border border-slate-200 flex items-center w-full lg:w-auto">
                <div className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-200 flex items-center gap-2 whitespace-nowrap"><User size={10} /> PERFIL</div>
                <select value={grp.includes('_ESP') ? 'esp' : 'proj'} onChange={(e) => handleProfileChange(e.target.value === 'esp')} className="bg-transparent text-[9px] font-black uppercase outline-none px-4 py-2 text-indigo-700 flex-1 lg:flex-none cursor-pointer">
                  <option value="esp">Vendedor Especialista</option>
                  <option value="proj">Vendedor Proyecto</option>
                </select>
              </div>
            )}
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
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-slate-800">{cat}</h2>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sección: {sec} | {grp.includes('_ESP') ? 'Perfil Especialista' : 'Perfil Proyecto'}</p>
                    </div>
                  </div>
                  {grp.includes('_ESP') && activeStrategicBlock === 'Instalaciones' && (
                     <button onClick={() => { setActiveStrategicBlock(null); setCat(STRATEGIC_BLOCKS[0]); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <ChevronRight size={14} className="rotate-180" /> Volver a Objetivos globales
                     </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-slate-50 pt-4">
                  {((CATEGORY_GROUPS as any)[grp]?.categories || [])
                    .filter((c: string) => {
                      const isEsp = grp.includes('_ESP');
                      if (isEsp) return STRATEGIC_BLOCKS.includes(c) || (activeStrategicBlock === 'Instalaciones' && INSTALLATION_SUB_CATEGORIES[sec]?.includes(c));
                      return true;
                    })
                    .map((c: any) => {
                      const isActive = cat === c;
                      return (
                        <button key={c} onClick={() => { 
                            setCat(c); 
                            if (grp.includes('_ESP') && c === 'Instalaciones') {
                                setActiveStrategicBlock('Instalaciones');
                                setCat(INSTALLATION_SUB_CATEGORIES[sec][0]);
                            }
                        }} className={`whitespace-nowrap flex items-center gap-3 p-3 px-5 rounded-xl border transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                          {getCatIcon(c, 14)}
                          <span className="text-[9px] font-black uppercase tracking-widest">{c}</span>
                        </button>
                      );
                  })}
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
                    let currentAch = 0;
                    if (STRATEGIC_BLOCKS.includes(cat) && cat !== 'Instalaciones') {
                        const activeCount = monthValues.filter(v => v !== 0).length || 1;
                        currentAch = calculateStrategicAchievement(cat, cat === 'Formacion Horas' ? totalVal : totalVal / activeCount, activeCount, sec);
                    } else {
                        const totalTarget = MONTHS.reduce((acc, _, i) => acc + getTarget(cat, i, sec, emp.id), 0);
                        currentAch = totalTarget > 0 ? (totalVal / totalTarget) * 100 : 0;
                    }
                    return <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-6 font-bold text-slate-700 sticky left-0 bg-[#f8fafc] z-10 border-r text-xs">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = monthValues[i];
                        const target = getTarget(cat, i, sec, emp.id);
                        
                        // Lógica de cumplimiento mensual para el color de la celda
                        let achPct = 0;
                        if (STRATEGIC_BLOCKS.includes(cat) && cat !== 'Instalaciones') {
                          achPct = calculateStrategicAchievement(cat, val, 1, sec);
                        } else {
                          achPct = target > 0 ? (val / target) * 100 : (val !== 0 ? 100 : 0);
                        }

                        let color = 'bg-white';
                        // El usuario pide explícitamente: Valor negativo = Rojo
                        if (val < 0) {
                          color = 'bg-rose-50 text-rose-600';
                        } else if (val > 0) {
                          // Umbrales actualizados: <50 Rojo, 50-70 Amarillo, >70 Verde
                          if (achPct >= 70) {
                            color = 'bg-emerald-50 text-emerald-700';
                          } else if (achPct >= 50) {
                            color = 'bg-amber-50 text-amber-600';
                          } else {
                            color = 'bg-rose-50 text-rose-600';
                          }
                        } else if (target > 0) {
                          // Caso val == 0: Según imagen de referencia, gris neutro (no penalizar si no se ha empezado)
                          color = 'bg-slate-50/30 text-slate-400';
                        }
                        
                        return <td key={i} className={`p-2 border-r border-slate-200/40 text-center ${color} ${i === month ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}>
                          <div className="flex flex-col items-center">
                            <input 
                              type="number" 
                              step="0.1" 
                              value={val || ''} 
                              disabled={isLocked(i) || !isEditMode} 
                              placeholder="0" 
                              onChange={(e) => onUpdate(emp.id, i, parseFloat(e.target.value) || 0)} 
                              className={`w-full max-w-[48px] h-8 text-center bg-transparent font-black outline-none text-base ${val < 0 ? 'text-rose-600' : (val > 0 ? (achPct < 50 ? 'text-rose-600' : achPct >= 70 ? 'text-emerald-600' : 'text-amber-600') : 'text-slate-400')}`} 
                            />
                            <div className="text-[8px] font-black text-slate-400/80 uppercase mt-1 whitespace-nowrap tracking-tighter">
                              OBJ: {target}
                            </div>
                          </div>
                        </td>
                      })}
                      <td className="p-4 text-center border-l border-slate-200 bg-white">
                        <span className={`text-base font-black ${currentAch >= 70 ? 'text-emerald-600' : currentAch >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>{Math.round(currentAch)}%</span>
                      </td>
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
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Evolución Estratégica {sec}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Perfíl: {grp.includes('_ESP') ? 'Especialista' : 'Proyecto'}</span>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">| Meses analizados: {activeMonthsWithData.length}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-4xl lg:text-5xl font-black ${globalSectionPerformance >= 70 ? 'text-emerald-600' : globalSectionPerformance >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>{globalSectionPerformance}%</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GLOBAL SECCIÓN</span>
                    </div>
                </div>
                <div className="h-[350px] lg:h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 125]} tick={{fill: '#4f46e5', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px'}} itemStyle={{fontSize: '11px', fontWeight: 800, textTransform: 'uppercase'}} labelStyle={{fontSize: '10px', fontWeight: 900, marginBottom: '6px', color: '#64748b'}} />
                            <Legend wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'}} iconType="circle" iconSize={8} />
                            <ReferenceLine y={70} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} label={{ position: 'right', value: 'META (70%)', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                            {((CATEGORY_GROUPS as any)[grp]?.categories || []).filter((c: string) => !STRATEGIC_BLOCKS.includes(c) || (c !== 'Instalaciones')).map((c: string, i: number) => (
                                <Line key={c} type="monotone" dataKey={c} name={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} connectNulls={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-3 uppercase"><Users className="text-indigo-600" /> Ranking por Rendimiento</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                    {leaderboardData.map((info, idx) => {
                        const status = getStatusInfo(info.percentage);
                        const isThisEmpInspected = inspectedPillar?.empId === info.id;
                        return (
                            <div key={idx} className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-100 shadow-lg transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center rounded-2xl font-black text-xl shadow-md">{info.fullName.charAt(0)}</div>
                                      <div>
                                          <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{info.fullName}</h4>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{info.profileType}</p>
                                      </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-center flex flex-col items-center ${info.percentage >= 70 ? 'bg-emerald-50 text-emerald-600' : info.percentage >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <span className="text-2xl font-black tracking-tighter">{info.percentage}%</span>
                                        <span className="text-[7px] font-black uppercase">Media</span>
                                    </div>
                                </div>
                                <div className="space-y-4 mb-8">
                                    <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">OBJETIVOS GLOBALES:</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        {info.pillars.map((pillar: any, pIdx: number) => {
                                            const isActiveDetail = inspectedPillar?.empId === info.id && inspectedPillar?.pillarName === pillar.name;
                                            return (
                                              <button key={pIdx} onClick={() => setInspectedPillar(isActiveDetail ? null : { empId: info.id, pillarName: pillar.name })} className={`p-3 rounded-2xl border transition-all text-left ${isActiveDetail ? 'bg-indigo-600 border-indigo-600 scale-105 shadow-md text-white' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'}`}>
                                                  <div className="flex items-center gap-2 mb-1.5"><div className={isActiveDetail ? 'text-indigo-200' : 'text-slate-500'}>{pillar.icon}</div><span className={`text-[8px] font-black uppercase tracking-tight ${isActiveDetail ? 'text-indigo-100' : 'text-slate-600'}`}>{pillar.name}</span></div>
                                                  <div className="flex items-baseline justify-between"><span className={`text-lg font-black ${isActiveDetail ? 'text-white' : 'text-slate-800'}`}>{Math.round(pillar.pct)}%</span></div>
                                                  <div className={`w-full h-1 rounded-full mt-2 overflow-hidden ${isActiveDetail ? 'bg-white/20' : 'bg-slate-200/50'}`}><div className={`h-full rounded-full ${isActiveDetail ? 'bg-white' : (pillar.pct >= 70 ? 'bg-emerald-500' : pillar.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500')}`} style={{ width: `${Math.min(pillar.pct, 100)}%` }}></div></div>
                                              </button>
                                            );
                                        })}
                                    </div>
                                    {isThisEmpInspected && (
                                      <div className="mt-6 p-6 bg-slate-900 rounded-[2rem] border border-slate-700 animate-in fade-in zoom-in-95 shadow-2xl relative">
                                          <button onClick={() => setInspectedPillar(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={16} /></button>
                                          <h6 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">Desglose: {inspectedPillar.pillarName}</h6>
                                          <div className="space-y-4">
                                            {inspectedPillar.pillarName === 'Instalaciones' ? (
                                              INSTALLATION_SUB_CATEGORIES[sec]?.map((subCat: string) => {
                                                const act = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === info.id && d.month === m && d.category === subCat && d.section === sec)?.actual || 0), 0);
                                                const tar = activeMonthsWithData.reduce((acc, m) => acc + getTarget(subCat, m, sec, info.id), 0);
                                                const subPct = tar > 0 ? (act / tar) * 100 : 0;
                                                return (
                                                  <div key={subCat} className="flex flex-col gap-1 border-b border-slate-800 pb-3 last:border-0">
                                                    <div className="flex justify-between items-center"><span className="text-[9px] font-black text-slate-300 uppercase">{subCat}</span><span className={`text-[11px] font-black ${subPct >= 70 ? 'text-emerald-400' : subPct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{Math.round(subPct)}%</span></div>
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              activeMonthsWithData.map(m => {
                                                const targetName = inspectedPillar.pillarName === 'Venta' ? 'Cifra de Venta (%Crec)' : inspectedPillar.pillarName === 'Formación' ? 'Formacion Horas' : inspectedPillar.pillarName === 'NPS' ? 'NPS' : inspectedPillar.pillarName;
                                                const val = data.find(d => d.employeeId === info.id && d.month === m && d.category === targetName && d.section === sec)?.actual || 0;
                                                const ach = STRATEGIC_BLOCKS.includes(targetName) ? calculateStrategicAchievement(targetName, val, 1, sec) : (val / getTarget(targetName, m, sec, info.id)) * 100;
                                                return (
                                                  <div key={m} className="flex justify-between items-center border-b border-slate-800 pb-2 last:border-0"><span className="text-[9px] font-black text-slate-400 uppercase">{MONTHS[m]}</span><span className={`text-[10px] font-black ${ach >= 70 ? 'text-emerald-400' : ach >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{Math.round(ach)}%</span></div>
                                                );
                                              })
                                            )}
                                          </div>
                                      </div>
                                    )}
                                </div>
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