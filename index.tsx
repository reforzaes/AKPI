import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend, Cell 
} from 'recharts';
import { 
  Database, RefreshCw, CheckCircle, Unlock, Lock, Target, ShowerHead, 
  TreeDeciduous, Utensils, TrendingUp, TrendingDown, Calendar, ArrowRightLeft, 
  DoorClosed, LogIn, DoorOpen, Zap, Flower2, Sun, Wind, Battery, 
  Sprout, Fence, Droplets, Hammer, Gem, Ruler, Users, Trophy, AlertCircle, BarChart3
} from 'lucide-react';
import { 
  Section, Category, Employee, MonthlyData, MonthStatus, CategoryGroup,
  MONTHS, CATEGORY_TARGETS, CATEGORY_GROUPS, SECTION_CONFIG 
} from './types';

const SCRIPT_URL = 'api.php';

const App: React.FC = () => {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [statuses, setStatuses] = useState<MonthStatus[]>([]);
  const [sec, setSec] = useState<Section>('Sanitario');
  const [cat, setCat] = useState<string>('Mamparas');
  const [grp, setGrp] = useState<string>('SAN_VEND_ESP');
  const [view, setView] = useState<'entry' | 'stats'>('entry');
  const [month, setMonth] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pin, setPin] = useState('');
  
  const isEditMode = pin === '047';

  // Sincronización con el formato de api.php para CARGAR datos
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`${SCRIPT_URL}?action=loadData`);
        const json = await res.json();
        
        if (json.monthly_data) {
          const mappedData = json.monthly_data.map((d: any) => ({
            employeeId: d.employee_id,
            month: parseInt(d.month_idx),
            category: d.category,
            section: d.section,
            actual: parseInt(d.actual_value)
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
        console.error("Error loading data:", e);
        const ld = localStorage.getItem('backup_data');
        const ls = localStorage.getItem('backup_status');
        if (ld) setData(JSON.parse(ld));
        if (ls) setStatuses(JSON.parse(ls));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Sincronización con el formato de api.php para GUARDAR datos
  const saveToServer = async (action: string, payload: any) => {
    setSyncing(true);
    
    let mappedPayload = payload;
    
    // Mapeo específico para que api.php reconozca las llaves
    if (action === 'saveData') {
      mappedPayload = payload.map((item: any) => ({
        employeeId: item.employeeId,
        month: item.month,
        category: item.category,
        section: item.section,
        value: item.actual // api.php espera 'value' para mapear a 'actual_value'
      }));
    } else if (action === 'saveStatus') {
      mappedPayload = payload.map((item: any) => ({
        month_idx: item.month, // api.php espera 'month_idx'
        section: item.section,
        is_filled: item.isFilled ? 1 : 0 // api.php espera 'is_filled'
      }));
    }

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload: mappedPayload })
      });
      const result = await response.json();
      if (result.status === 'success') {
        localStorage.setItem(`backup_${action === 'saveData' ? 'data' : 'status'}`, JSON.stringify(payload));
      }
    } catch (e) {
      console.error("Error sync:", e);
      localStorage.setItem(`backup_${action === 'saveData' ? 'data' : 'status'}`, JSON.stringify(payload));
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
  const closedMonths = useMemo(() => statuses.filter(s => s.isFilled && s.section === sec).map(s => s.month), [statuses, sec]);

  const globalSectionPerformance = useMemo(() => {
    if (closedMonths.length === 0) return 0;
    let totalActual = 0;
    let totalTarget = 0;
    const cats = SECTION_CONFIG[sec].categories;
    const emps = SECTION_CONFIG[sec].employees;

    cats.forEach((c: string) => {
      emps.forEach((emp: any) => {
        closedMonths.forEach(mIdx => {
          totalActual += data.find(d => d.employeeId === emp.id && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
          totalTarget += CATEGORY_TARGETS[c] || 0;
        });
      });
    });
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  }, [data, sec, closedMonths]);

  const chartEvolutionData = useMemo(() => {
    const cats = SECTION_CONFIG[sec].categories;
    return MONTHS.map((mName, mIdx) => {
      const isMonthClosed = closedMonths.includes(mIdx);
      const row: any = { name: mName.substring(0, 3) };
      
      cats.forEach((c: string) => {
        if (!isMonthClosed) {
          row[c] = null;
          return;
        }

        let sumActual = 0;
        let sumTarget = 0;
        SECTION_CONFIG[sec].employees.forEach((emp: any) => {
            sumActual += data.find(d => d.employeeId === emp.id && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
            sumTarget += CATEGORY_TARGETS[c] || 0;
        });

        row[c] = sumTarget > 0 ? Math.round((sumActual / sumTarget) * 100) : 0;
      });
      return row;
    });
  }, [data, sec, closedMonths]);

  const leaderboardData = useMemo(() => {
    if (closedMonths.length === 0) return [];
    const emps = SECTION_CONFIG[sec].employees;
    
    return emps.map((emp: any) => {
      let empCats: string[] = [];
      let profileType = "VEND ESPECIALISTA";

      if (sec === 'Madera') empCats = SECTION_CONFIG.Madera.categories;
      else {
        Object.keys(CATEGORY_GROUPS).forEach(gk => {
          const g = CATEGORY_GROUPS[gk];
          if (g.employees.some(e => e.id === emp.id) && g.categories.some(c => SECTION_CONFIG[sec].categories.includes(c))) {
            empCats = g.categories;
            profileType = g.title.toUpperCase();
          }
        });
      }

      let totalActual = 0, totalTarget = 0;
      const kpis = empCats.map(c => {
        const act = closedMonths.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
        const tar = CATEGORY_TARGETS[c] * closedMonths.length;
        totalActual += act;
        totalTarget += tar;
        return {
          category: c,
          percentage: tar > 0 ? Math.round((act / tar) * 100) : 0,
          actual: act,
          target: tar
        };
      });

      const globalPercentage = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
      
      return {
        id: emp.id,
        fullName: emp.name,
        profileType,
        percentage: globalPercentage,
        units: totalActual,
        kpiBreakdown: kpis
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, sec, closedMonths]);

  const getCatIcon = (c: string, size = 18) => {
    const icons: any = { 
      'Mamparas': <ShowerHead size={size}/>, 'Mediciones (Reform, CBxP y CPxP)': <Ruler size={size}/>, 'Muebles de Baño': <DoorClosed size={size}/>,
      'Encimeras de piedra': <Gem size={size}/>, 'Armarios': <DoorClosed size={size}/>, 'Mediciones': <Ruler size={size}/>,
      'Puertas de Entrada': <LogIn size={size}/>, 'Puertas de Paso': <DoorOpen size={size}/>, 'Reforma Cocinas': <Hammer size={size}/>,
      'CBxP + PxP': <ArrowRightLeft size={size}/>, 'Reformas': <Hammer size={size}/>,
      'Placas Solares': <Sun size={size}/>, 'Aerotermia': <Wind size={size}/>, 'Baterías': <Battery size={size}/>, 'Instalación EERR': <Zap size={size}/>,
      'Césped Artificial': <Sprout size={size}/>, 'Cercados': <Fence size={size}/>, 'Riego': <Droplets size={size}/>, 'Reformas Jardín': <Flower2 size={size}/>
    };
    return icons[c] || <Target size={size}/>;
  };

  const getStatusInfo = (pct: number) => {
    if (pct >= 100) return { label: 'DESTACADO', color: 'text-emerald-600', dot: 'bg-emerald-500' };
    if (pct >= 80) return { label: 'EN PROGRESIÓN', color: 'text-amber-600', dot: 'bg-amber-500' };
    return { label: 'CRÍTICO', color: 'text-rose-600', dot: 'bg-rose-500' };
  };

  const COLORS = ['#ef4444', '#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.4em] animate-pulse">Sincronizando Base de Datos...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-100"><Database size={22} /></div>
            <h1 className="font-black text-xl tracking-tighter text-slate-800">Performance <span className="text-indigo-600">2026</span></h1>
            {syncing && <RefreshCw className="animate-spin text-indigo-500 ml-2" size={16} />}
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black uppercase outline-none px-4 text-indigo-700">
                    <option value={-1}>Acumulado</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button onClick={() => toggleStatus(month)} disabled={!isEditMode || month === -1} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${isLocked(month) ? 'bg-green-600 text-white shadow-md' : 'text-slate-400'}`}>
                    {isLocked(month) ? <Lock size={14} /> : <Unlock size={14} />}
                    {month === -1 ? '----' : (isLocked(month) ? 'CERRADO' : 'ABIERTO')}
                </button>
            </div>
            
            <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200">
              <button onClick={() => setView('entry')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${view === 'entry' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Registro</button>
              <button onClick={() => setView('stats')} className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${view === 'stats' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Analítica</button>
            </div>

            <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all ${isEditMode ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="w-10 bg-transparent text-center text-xs font-black outline-none text-white placeholder:text-slate-500" maxLength={3} />
              {isEditMode ? <Unlock size={14} /> : <Lock size={14} />}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 py-6 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-6">
           <div className="flex justify-between gap-3 overflow-x-auto scrollbar-hide">
            {(['Sanitario', 'Cocinas', 'Madera', 'EERR', 'Jardin'] as Section[]).map(s => (
              <button key={s} onClick={() => { setSec(s); setCat(SECTION_CONFIG[s].categories[0]); }} 
                className={`flex-1 min-w-[150px] py-4 rounded-2xl font-black uppercase text-[12px] border-2 transition-all flex items-center justify-center gap-3 ${sec === s ? 'bg-indigo-700 border-indigo-700 text-white shadow-xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                {SECTION_CONFIG[s].icon}
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {view === 'entry' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem] shadow-inner">{getCatIcon(cat, 26)}</div>
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-800">{cat}</h2>
                    <p className="text-[11px] font-black text-indigo-500 uppercase mt-2 tracking-widest">
                        Objetivo Mensual: {CATEGORY_TARGETS[cat]} Unidades
                    </p>
                </div>
              </div>
              <div className="flex gap-2">
                {SECTION_CONFIG[sec].categories.map((c: string) => (
                  <button key={c} onClick={() => setCat(c)} className={`p-4 rounded-2xl border-2 transition-all ${cat === c ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm' : 'bg-white border-slate-50 text-slate-300'}`}>
                    {getCatIcon(c, 20)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-[3rem] border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-8 font-black text-slate-600 sticky left-0 bg-slate-50 z-20 border-r uppercase text-[11px] tracking-widest min-w-[220px]">Colaborador</th>
                    {MONTHS.map((m, i) => <th key={m} className={`p-4 font-black text-center text-[10px] uppercase tracking-widest ${i === month ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400'}`}>{m.substring(0, 3)}</th>)}
                    <th className="p-4 font-black text-indigo-700 text-center bg-indigo-50/50 uppercase text-[11px] tracking-widest w-32 border-l">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SECTION_CONFIG[sec].employees.map((emp: any) => {
                    const total = MONTHS.reduce((acc, _, i) => acc + (data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0), 0);
                    return <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-8 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0;
                        const target = CATEGORY_TARGETS[cat];
                        const color = val === 0 ? 'bg-white' : val >= target ? 'bg-emerald-50 text-emerald-700 font-black' : val >= target * 0.8 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600';
                        return <td key={i} className={`p-3 border-r text-center ${color} ${i === month ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}>
                          <input type="number" value={val || ''} disabled={isLocked(i) || !isEditMode} placeholder="0" onChange={(e) => onUpdate(emp.id, i, parseInt(e.target.value) || 0)} className="w-12 h-10 text-center bg-transparent font-black outline-none text-xl" />
                        </td>
                      })}
                      <td className="p-6 text-center font-black text-indigo-900 text-2xl border-l bg-slate-50/50">{total}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.2rem] shadow-sm"><TrendingUp size={28} /></div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Evolución de KPIs ({sec.toUpperCase()})</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Métricas porcentuales vs Objetivos Unitarios</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${globalSectionPerformance >= 100 ? 'text-emerald-600' : globalSectionPerformance >= 80 ? 'text-amber-500' : 'text-rose-600'}`}>
                          {globalSectionPerformance}%
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CUMPLIMIENTO GLOBAL SECCIÓN</span>
                    </div>
                </div>

                <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="name" 
                              tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}} 
                              axisLine={false} 
                              tickLine={false} 
                              padding={{ left: 20, right: 20 }}
                            />
                            <YAxis 
                              domain={[0, 125]} 
                              tick={{fill: '#4f46e5', fontSize: 11, fontWeight: 900}} 
                              ticks={[0, 35, 70, 105, 125]}
                              axisLine={false} 
                              tickLine={false} 
                              label={{ value: 'CUMPLIMIENTO %', angle: -90, position: 'insideLeft', offset: 0, fontSize: 10, fontWeight: 900, fill: '#6366f1' }}
                            />
                            <Tooltip 
                                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                                itemStyle={{fontSize: '12px', fontWeight: 800, textTransform: 'uppercase'}}
                                labelStyle={{fontSize: '11px', fontWeight: 900, marginBottom: '8px', color: '#64748b'}}
                                formatter={(val: any, name: string) => [`${val}%`, name]}
                            />
                            <Legend 
                                wrapperStyle={{paddingTop: '30px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'}}
                                iconType="circle"
                                iconSize={10}
                            />
                            <ReferenceLine 
                              y={100} 
                              stroke="#10b981" 
                              strokeDasharray="12 6" 
                              strokeWidth={2.5} 
                              label={{ position: 'right', value: 'META', fill: '#10b981', fontSize: 11, fontWeight: 900 }} 
                            />
                            {SECTION_CONFIG[sec].categories.map((c: string, i: number) => (
                                <Line 
                                    key={c} 
                                    type="monotone" 
                                    dataKey={c} 
                                    name={c} 
                                    stroke={COLORS[i % COLORS.length]} 
                                    strokeWidth={4} 
                                    dot={{ r: 6, strokeWidth: 4, fill: '#fff' }} 
                                    activeDot={{ r: 9, strokeWidth: 0 }} 
                                    connectNulls={false} 
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-3 uppercase">
                        <Users className="text-indigo-600" /> Rendimiento por Vendedor
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {leaderboardData.map((info, idx) => {
                        const status = getStatusInfo(info.percentage);
                        const isUp = info.percentage >= 80;

                        return (
                            <div key={idx} className="bg-white rounded-[3.5rem] p-12 border border-slate-100 shadow-2xl hover:shadow-indigo-100/50 transition-all flex flex-col group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h4 className="text-3xl font-black text-slate-800 tracking-tighter mb-1">{info.fullName}</h4>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">PERFIL: {info.profileType}</p>
                                    </div>
                                    <div className={`p-4 rounded-2xl ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} border border-slate-50 shadow-sm`}>
                                        {isUp ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <span className={`text-6xl font-black tracking-tighter ${info.percentage >= 100 ? 'text-emerald-600' : info.percentage >= 80 ? 'text-amber-500' : 'text-rose-600'}`}>
                                            {info.percentage}%
                                        </span>
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">TOTAL GLOBAL</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xl font-black text-slate-800">{info.units} UNID.</span>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">INSTALADAS</p>
                                    </div>
                                </div>

                                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-10 border border-slate-50">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${info.percentage >= 100 ? 'bg-emerald-500' : info.percentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                        style={{ width: `${Math.min(info.percentage, 100)}%` }}
                                    ></div>
                                </div>

                                <div className="h-px bg-slate-100 w-full mb-10 opacity-50"></div>

                                <div className="space-y-4 mb-10">
                                    <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">DESGLOSE POR KPI:</h5>
                                    {info.kpiBreakdown.map((kpi, kIdx) => (
                                        <div key={kIdx} className={`p-5 rounded-2xl flex items-center justify-between border ${kpi.percentage >= 100 ? 'bg-emerald-50/40 border-emerald-100/50' : 'bg-rose-50/40 border-rose-100/50'} transition-all hover:scale-[1.01]`}>
                                            <div className="flex items-center gap-4">
                                                <div className="text-slate-400 bg-white p-2 rounded-xl border border-slate-50 shadow-sm">{getCatIcon(kpi.category, 16)}</div>
                                                <span className="text-[13px] font-black text-slate-700 uppercase tracking-tight">{kpi.category}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[15px] font-black ${kpi.percentage >= 100 ? 'text-emerald-600' : kpi.percentage >= 80 ? 'text-amber-500' : 'text-rose-600'}`}>
                                                    {kpi.percentage}%
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-400 italic">({kpi.actual} ud)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${status.dot} animate-pulse`}></div>
                                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${status.color}`}>{status.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-20 text-center border-t border-slate-100 bg-white">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
              Animación Monoproducto © 2026 | Sistema de Inteligencia de Rendimiento
          </p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);