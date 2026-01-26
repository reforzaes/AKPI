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
  Sprout, Fence, Droplets, Hammer, Gem, Ruler, Users, User, BookOpen, SmilePlus, ShoppingCart, LayoutGrid, ChevronRight, Utensils, TreeDeciduous
} from 'lucide-react';
import { 
  Section, MonthlyData, MonthStatus,
  MONTHS, CATEGORY_TARGETS, CATEGORY_GROUPS, SECTION_CONFIG, getTarget, 
  STRATEGIC_BLOCKS, INSTALLATION_SUB_CATEGORIES, calculateStrategicAchievement
} from './types';

const SCRIPT_URL = 'api.php';

const App: React.FC = () => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [statuses, setStatuses] = useState<MonthStatus[]>([]);
  const [sec, setSec] = useState<Section>('Sanitario');
  const [cat, setCat] = useState<string>('Cifra de Venta (%)');
  const [grp, setGrp] = useState<string>('SAN_VEND_ESP');
  const [view, setView] = useState<'stats' | 'entry'>('stats');
  const [month, setMonth] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pin, setPin] = useState('');
  
  const [activeStrategicBlock, setActiveStrategicBlock] = useState<string | null>(null);

  const isEditMode = pin === '047';

  const init = async () => {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=loadData`);
      const text = await res.text();
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const json = JSON.parse(cleanJson);
      
      if (json.monthly_data) {
        const mappedData = json.monthly_data.map((d: any) => ({
          employeeId: d.employee_id,
          month: parseInt(d.month_idx),
          category: d.category,
          section: d.section,
          actual: parseFloat(d.actual_value)
        }));
        setData(mappedData);
      }
      
      if (json.month_status) {
        const mappedStatus = json.month_status.map((s: any) => ({
          month: parseInt(s.month_idx),
          section: s.section,
          isFilled: s.is_filled === "1" || s.is_filled === 1 || s.is_filled === true
        }));
        setStatuses(mappedStatus);
      }
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  const saveToServer = async (action: string, payload: any) => {
    setSyncing(true);
    let mappedPayload = payload;
    
    if (action === 'saveData') {
      mappedPayload = payload.map((item: any) => ({
        employeeId: item.employeeId,
        month: item.month,
        category: item.category,
        section: item.section,
        value: item.actual
      }));
    } else if (action === 'saveStatus') {
      mappedPayload = payload.map((item: any) => ({
        month_idx: item.month,
        section: item.section,
        is_filled: item.isFilled ? 1 : 0
      }));
    }

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: mappedPayload })
      });
    } catch (e) {
      console.error("Error sync:", e);
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
  
  // Meses que tienen al menos un dato > 0 para el grupo seleccionado
  const activeMonthsWithData = useMemo(() => {
    const emps = sec === 'Madera' ? SECTION_CONFIG.Madera.employees : (CATEGORY_GROUPS as any)[grp]?.employees || [];
    const active = [];
    for (let i = 0; i < 12; i++) {
      const hasData = emps.some((emp: any) => 
        data.some(d => d.employeeId === emp.id && d.month === i && d.section === sec && d.actual > 0)
      );
      if (hasData) active.push(i);
    }
    return active;
  }, [data, sec, grp]);

  const handleSectionChange = (s: Section) => {
    setSec(s);
    setActiveStrategicBlock(null);
    const prefix = s === 'Sanitario' ? 'SAN' : s === 'Cocinas' ? 'COC' : s === 'EERR' ? 'EERR' : s === 'Jardin' ? 'JARDIN' : 'MADERA';
    if (s === 'Madera') {
      setCat(SECTION_CONFIG.Madera.categories[0]);
    } else {
      const isEsp = grp.includes('_ESP');
      const newGrp = `${prefix}_VEND_${isEsp ? 'ESP' : 'PROJ'}`;
      setGrp(newGrp);
      setCat((CATEGORY_GROUPS as any)[newGrp]?.categories[0] || STRATEGIC_BLOCKS[0]);
    }
  };

  const handleProfileChange = (isEsp: boolean) => {
    const prefix = sec === 'Sanitario' ? 'SAN' : sec === 'Cocinas' ? 'COC' : sec === 'EERR' ? 'EERR' : sec === 'Jardin' ? 'JARDIN' : 'MADERA';
    if (sec === 'Madera') return;
    const newGrp = `${prefix}_VEND_${isEsp ? 'ESP' : 'PROJ'}`;
    setGrp(newGrp);
    setCat((CATEGORY_GROUPS as any)[newGrp]?.categories[0] || STRATEGIC_BLOCKS[0]);
    setActiveStrategicBlock(null);
  };

  const chartEvolutionData = useMemo(() => {
    const groupCategories = sec === 'Madera' ? SECTION_CONFIG.Madera.categories : (CATEGORY_GROUPS as any)[grp]?.categories || [];
    const empsInGrp = sec === 'Madera' ? SECTION_CONFIG.Madera.employees : (CATEGORY_GROUPS as any)[grp]?.employees || [];

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
              if (c === 'Instalaciones') {
                row[c] = null; 
              } else {
                row[c] = calculateStrategicAchievement(c, val, 1);
              }
            } else {
              sumActual += val;
              sumTarget += getTarget(c, mIdx, emp.id);
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
    const emps = sec === 'Madera' ? SECTION_CONFIG.Madera.employees : (CATEGORY_GROUPS as any)[grp]?.employees || [];
    const monthsActiveCount = activeMonthsWithData.length;
    
    return emps.map((emp: any) => {
      let isSpecialistProfile = false;
      let currentEmpCats: string[] = [];

      Object.keys(CATEGORY_GROUPS).forEach(gk => {
        const g = (CATEGORY_GROUPS as any)[gk];
        if (g.employees.some((e: any) => e.id === emp.id) && g.categories.some((c: string) => SECTION_CONFIG[sec].categories.includes(c))) {
          isSpecialistProfile = !!g.isSpecialist;
          currentEmpCats = g.categories;
        }
      });

      let pillars: any[] = [];

      if (isSpecialistProfile) {
        // KPIs Estratégicos
        const ventaValues = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Cifra de Venta (%)' && d.section === sec)?.actual || 0);
        const ventaAvg = ventaValues.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'Venta', icon: <ShoppingCart size={14}/>, pct: calculateStrategicAchievement('Cifra de Venta (%)', ventaAvg, monthsActiveCount), raw: ventaAvg.toFixed(1) + '%' });

        const formTotal = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'Formación (h)' && d.section === sec)?.actual || 0), 0);
        pillars.push({ name: 'Formación', icon: <BookOpen size={14}/>, pct: calculateStrategicAchievement('Formación (h)', formTotal, monthsActiveCount), raw: formTotal + 'h' });

        const npsValues = activeMonthsWithData.map(m => data.find(d => d.employeeId === emp.id && d.month === m && d.category === 'NPS (%)' && d.section === sec)?.actual || 0);
        const npsAvg = npsValues.reduce((a, b) => a + b, 0) / monthsActiveCount;
        pillars.push({ name: 'NPS', icon: <SmilePlus size={14}/>, pct: calculateStrategicAchievement('NPS (%)', npsAvg, monthsActiveCount), raw: npsAvg.toFixed(1) + '%' });

        // Instalaciones (Agregado de subcategorías)
        const subCats = INSTALLATION_SUB_CATEGORIES[sec] || [];
        let totalInstActual = 0, totalInstTarget = 0;
        subCats.forEach(sc => {
          totalInstActual += activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === sc && d.section === sec)?.actual || 0), 0);
          totalInstTarget += activeMonthsWithData.reduce((acc, m) => acc + getTarget(sc, m, emp.id), 0);
        });
        const instPct = totalInstTarget > 0 ? (totalInstActual / totalInstTarget) * 100 : 0;
        pillars.push({ name: 'Instalaciones', icon: <Hammer size={14}/>, pct: instPct, raw: totalInstActual + ' ud' });
      } else {
        const empCats = (sec === 'Madera' ? SECTION_CONFIG.Madera.categories : (CATEGORY_GROUPS as any)[grp]?.categories || []).filter((c: string) => !STRATEGIC_BLOCKS.includes(c));
        pillars = empCats.map((c: string) => {
          const act = activeMonthsWithData.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
          const tar = activeMonthsWithData.reduce((acc, m) => acc + getTarget(c, m, emp.id), 0);
          return { name: c, icon: getCatIcon(c, 14), pct: tar > 0 ? (act / tar) * 100 : 0, raw: act + ' ud' };
        });
      }

      const globalPercentage = Math.round(pillars.reduce((acc, p) => acc + p.pct, 0) / Math.max(1, pillars.length));
      
      return {
        id: emp.id,
        fullName: emp.name,
        profileType: isSpecialistProfile ? 'ESPECIALISTA' : 'PROYECTO',
        percentage: globalPercentage,
        pillars,
        isSpecialist: isSpecialistProfile
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, sec, grp, activeMonthsWithData]);

  const globalSectionPerformance = useMemo(() => {
    if (leaderboardData.length === 0) return 0;
    return Math.round(leaderboardData.reduce((acc, l) => acc + l.percentage, 0) / leaderboardData.length);
  }, [leaderboardData]);

  const getCatIcon = (c: string, size = 18) => {
    const icons: any = { 
      'Mamparas': <ShowerHead size={size}/>, 'Mediciones (Reform, CBxP y CPxP)': <Ruler size={size}/>, 'Muebles de Baño': <DoorClosed size={size}/>,
      'Encimeras de piedra': <Gem size={size}/>, 'Armarios': <DoorClosed size={size}/>, 'Mediciones': <Ruler size={size}/>,
      'Puertas de Entrada': <LogIn size={size}/>, 'Puertas de Paso': <DoorOpen size={size}/>, 'Reforma Cocinas': <Hammer size={size}/>,
      'CBxP + PxP': <ArrowRightLeft size={size}/>, 'Reformas': <Hammer size={size}/>,
      'Placas Solares': <Sun size={size}/>, 'Aerotermia': <Wind size={size}/>, 'Baterías': <Battery size={size}/>, 'Instalación EERR': <Zap size={size}/>,
      'Césped Artificial': <Sprout size={size}/>, 'Cercados': <Fence size={size}/>, 'Riego': <Droplets size={size}/>, 'Reformas Jardín': <Flower2 size={size}/>,
      'Cifra de Venta (%)': <ShoppingCart size={size}/>, 'Formación (h)': <BookOpen size={size}/>, 'NPS (%)': <SmilePlus size={size}/>,
      'Instalaciones': <LayoutGrid size={size}/>
    };
    return icons[c] || <Target size={size}/>;
  };

  const getStatusInfo = (pct: number) => {
    if (pct >= 100) return { label: '¡MÁXIMO NIVEL!', color: 'text-emerald-600', dot: 'bg-emerald-500' };
    if (pct >= 80) return { label: 'IMPULSO GANADOR', color: 'text-amber-600', dot: 'bg-amber-500' };
    return { label: 'MODO GUERRERO', color: 'text-rose-600', dot: 'bg-rose-500' };
  };

  const COLORS = ['#ef4444', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

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
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[9px] font-black uppercase outline-none px-2 text-indigo-700">
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
            <div className="flex gap-1 overflow-x-auto scrollbar-hide w-full lg:w-auto">
              {(['Sanitario', 'Cocinas', 'Madera', 'EERR', 'Jardin'] as Section[]).map(s => {
                const isActive = sec === s;
                return (
                  <button key={s} onClick={() => handleSectionChange(s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? 'bg-indigo-700 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                    {s === 'Sanitario' && <ShowerHead size={12} />}
                    {s === 'Cocinas' && <Utensils size={12} />}
                    {s === 'Madera' && <TreeDeciduous size={12} />}
                    {s === 'EERR' && <Zap size={12} />}
                    {s === 'Jardin' && <Flower2 size={12} />}
                    {s}
                  </button>
                );
              })}
            </div>

            {sec !== 'Madera' && (
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
                <button onClick={() => handleProfileChange(true)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${grp.includes('_ESP') ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-400'}`}>
                  <User size={10} /> Especialista
                </button>
                <button onClick={() => handleProfileChange(false)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2 ${grp.includes('_PROJ') ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-400'}`}>
                  <Target size={10} /> Proyecto
                </button>
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
                  
                  {activeStrategicBlock === 'Instalaciones' ? (
                     <button onClick={() => setActiveStrategicBlock(null)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                        <ChevronRight size={14} className="rotate-180" /> Volver a Objetivos globales
                     </button>
                  ) : (
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RETO ACTUAL</span>
                      <p className="text-sm font-black text-indigo-600">
                        {cat === 'Formación (h)' ? '35h Anuales' : cat === 'NPS (%)' ? '70% NPS' : cat === 'Cifra de Venta (%)' ? '+10.6% Crec.' : 'Reto Operativo'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-slate-50 pt-4">
                  {(sec === 'Madera' ? SECTION_CONFIG.Madera.categories : ((CATEGORY_GROUPS as any)[grp]?.categories || []))
                    .filter(c => STRATEGIC_BLOCKS.includes(c) || activeStrategicBlock === 'Instalaciones')
                    .map((c: any) => {
                      const isSub = INSTALLATION_SUB_CATEGORIES[sec]?.includes(c);
                      if (activeStrategicBlock === 'Instalaciones' && !isSub && c !== 'Instalaciones') return null;
                      if (!activeStrategicBlock && isSub) return null;
                      
                      const isActive = cat === c;
                      return (
                        <button key={c} onClick={() => { 
                            setCat(c); 
                            if (c === 'Instalaciones') {
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
                    {MONTHS.map((m, i) => <th key={m} className={`p-3 font-black text-center text-[9px] uppercase tracking-widest ${i === month ? 'text-indigo-600 bg-indigo-100/50' : 'text-slate-400'}`}>{m.substring(0, 3)}</th>)}
                    <th className="p-3 font-black text-indigo-700 text-center bg-indigo-50/50 uppercase text-[10px] tracking-widest w-24 border-l">Cumpl.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(sec === 'Madera' ? SECTION_CONFIG.Madera.employees : (CATEGORY_GROUPS as any)[grp]?.employees || []).map((emp: any) => {
                    const monthValues = MONTHS.map((_, i) => data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0);
                    const totalVal = monthValues.reduce((acc, v) => acc + v, 0);
                    
                    let currentAch = 0;
                    if (STRATEGIC_BLOCKS.includes(cat) && cat !== 'Instalaciones') {
                        const activeMonthsCountInGroup = monthValues.filter(v => v !== 0).length || 1;
                        const avg = totalVal / activeMonthsCountInGroup;
                        currentAch = calculateStrategicAchievement(cat, cat === 'Formación (h)' ? totalVal : avg, activeMonthsCountInGroup);
                    } else {
                        const totalTarget = MONTHS.reduce((acc, _, i) => acc + getTarget(cat, i, emp.id), 0);
                        currentAch = totalTarget > 0 ? (totalVal / totalTarget) * 100 : 0;
                    }

                    return <tr key={emp.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-6 font-bold text-slate-700 sticky left-0 bg-[#f8fafc] z-10 border-r text-xs">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = monthValues[i];
                        const target = getTarget(cat, i, emp.id);
                        
                        let color = 'bg-transparent';
                        if (val !== 0) {
                          if (STRATEGIC_BLOCKS.includes(cat) && cat !== 'Instalaciones') {
                             const ach = calculateStrategicAchievement(cat, val, 1);
                             color = ach >= 100 ? 'bg-emerald-500/10 text-emerald-700' : ach >= 80 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600';
                          } else {
                             color = val >= target ? 'bg-emerald-500/10 text-emerald-700' : val >= target * 0.8 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600';
                          }
                        }

                        return <td key={i} className={`p-2 border-r border-slate-200/40 text-center ${color} ${i === month ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}>
                          <div className="flex flex-col items-center">
                            <input type="number" step="0.1" value={val || ''} disabled={isLocked(i) || !isEditMode} placeholder="0" onChange={(e) => onUpdate(emp.id, i, parseFloat(e.target.value) || 0)} className="w-full max-w-[48px] h-8 text-center bg-transparent font-black outline-none text-base" />
                            {!STRATEGIC_BLOCKS.includes(cat) && <div className="text-[7px] font-black text-slate-400 uppercase mt-0.5 whitespace-nowrap">Obj: {target}</div>}
                            {cat === 'Formación (h)' && <div className="text-[7px] font-black text-slate-400 uppercase mt-0.5 whitespace-nowrap">Reto: {target}h</div>}
                          </div>
                        </td>
                      })}
                      <td className="p-4 text-center border-l border-slate-200 bg-white">
                        <span className={`text-base font-black ${currentAch >= 100 ? 'text-emerald-600' : currentAch >= 80 ? 'text-amber-500' : 'text-rose-600'}`}>
                            {Math.round(currentAch)}%
                        </span>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Gráfico de Evolución */}
            <div className="bg-white p-8 lg:p-12 rounded-[3rem] border border-slate-100 shadow-xl relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm"><TrendingUp size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Evolución Estratégica {sec}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Perfíl: {grp.includes('_ESP') ? 'Especialista' : 'Proyecto'}</span>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">| Meses analizados: {activeMonthsWithData.length > 0 ? activeMonthsWithData.map(m => MONTHS[m].substring(0,3)).join(', ') : 'Ninguno'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl lg:text-5xl font-black ${globalSectionPerformance >= 100 ? 'text-emerald-600' : globalSectionPerformance >= 80 ? 'text-amber-500' : 'text-rose-600'}`}>
                          {globalSectionPerformance}%
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">GLOBAL SECCIÓN ({grp.includes('_ESP') ? 'ESP' : 'PROJ'})</span>
                    </div>
                </div>
                <div className="h-[350px] lg:h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} padding={{ left: 20, right: 20 }} />
                            <YAxis domain={[0, 125]} tick={{fill: '#4f46e5', fontSize: 10, fontWeight: 900}} ticks={[0, 25, 50, 75, 100, 125]} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px'}} 
                                itemStyle={{fontSize: '11px', fontWeight: 800, textTransform: 'uppercase'}} 
                                labelStyle={{fontSize: '10px', fontWeight: 900, marginBottom: '6px', color: '#64748b'}} 
                                formatter={(val: any, name: string) => [`${val}%`, name]} 
                            />
                            <Legend wrapperStyle={{paddingTop: '30px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'}} iconType="circle" iconSize={8} />
                            <ReferenceLine y={100} stroke="#10b981" strokeDasharray="8 4" strokeWidth={2} label={{ position: 'right', value: 'META', fill: '#10b981', fontSize: 9, fontWeight: 900 }} />
                            {(sec === 'Madera' ? SECTION_CONFIG.Madera.categories : (CATEGORY_GROUPS as any)[grp]?.categories || []).filter((c: string) => !STRATEGIC_BLOCKS.includes(c) || (c !== 'Instalaciones')).map((c: string, i: number) => (
                                <Line key={c} type="monotone" dataKey={c} name={c} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} connectNulls={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Ranking de Rendimiento */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-3 uppercase">
                        <Users className="text-indigo-600" /> Ranking por Rendimiento ({grp.includes('_ESP') ? 'ESPECIALISTAS' : 'PROYECTO'})
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                    {leaderboardData.map((info, idx) => {
                        const status = getStatusInfo(info.percentage);
                        const isUp = info.percentage >= 80;
                        return (
                            <div key={idx} className="bg-white rounded-[2.5rem] p-8 lg:p-10 border border-slate-100 shadow-lg hover:shadow-indigo-100/50 transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center rounded-2xl font-black text-xl shadow-md">
                                        {info.fullName.charAt(0)}
                                      </div>
                                      <div>
                                          <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{info.fullName}</h4>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{info.profileType}</p>
                                      </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-xl text-center flex flex-col items-center ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        <span className="text-2xl font-black tracking-tighter">{info.percentage}%</span>
                                        <span className="text-[7px] font-black uppercase">Media</span>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <h5 className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">OBJETIVOS GLOBALES:</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        {info.pillars.map((pillar: any, pIdx: number) => (
                                            <div key={pIdx} className={`p-3 rounded-2xl border transition-all hover:scale-105 ${pillar.pct >= 100 ? 'bg-emerald-50/30 border-emerald-100/40' : pillar.pct >= 80 ? 'bg-amber-50/30 border-amber-100/40' : 'bg-rose-50/30 border-rose-100/40'}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <div className="text-slate-500">{pillar.icon}</div>
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">{pillar.name}</span>
                                                </div>
                                                <div className="flex items-baseline justify-between">
                                                  <span className="text-lg font-black text-slate-800">{Math.round(pillar.pct)}%</span>
                                                  <span className="text-[8px] font-bold text-slate-400">{pillar.raw}</span>
                                                </div>
                                                <div className="w-full h-1 bg-slate-200/50 rounded-full mt-2 overflow-hidden">
                                                  <div className={`h-full rounded-full ${pillar.pct >= 100 ? 'bg-emerald-500' : pillar.pct >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(pillar.pct, 100)}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`}></div>
                                      <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${status.color}`}>{status.label}</span>
                                    </div>
                                    {isUp ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center border-t border-slate-100 bg-white">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
              Objetivos 2026 | By Javier González
          </p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
