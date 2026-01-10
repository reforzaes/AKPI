
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell
} from 'recharts';
import { 
  Database, RefreshCw, CheckCircle, Unlock, Lock, Target, ShowerHead, Bath, 
  TreeDeciduous, Utensils, UserCheck, UserPlus, TrendingUp, Award, Calendar, Archive, ArrowRightLeft, DoorClosed, LogIn, DoorOpen, Zap, Flower2, Sun, Wind, Battery, Sprout, Fence, Droplets, Hammer, Gem, Ruler, Users, Trophy
} from 'lucide-react';
// Fixed: Imported shared constants from types.ts
import { 
  MONTHS, CATEGORY_TARGETS, CATEGORY_GROUPS, SECTION_CONFIG 
} from './types';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwJbIg0kW7jJKVK3X7mNwNdbDy2QQISNhR1bO5J8RLO1o_kERmoXuivIOLXtcFBC5nlNw/exec';

const API = {
  async save(action: string, payload: any) {
    localStorage.setItem(`backup_${action}`, JSON.stringify(payload));
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, payload })
      });
      return true;
    } catch (e) {
      return false;
    }
  },
  async load(action: string) {
    try {
      const res = await fetch(`${SCRIPT_URL}?action=${action}`, { method: 'GET' });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      const local = localStorage.getItem(`backup_${action}`);
      return local ? JSON.parse(local) : [];
    }
  }
};

const App: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [sec, setSec] = useState('Sanitario');
  const [cat, setCat] = useState('Mamparas');
  const [grp, setGrp] = useState('SAN_VEND_ESP');
  const [view, setView] = useState<'entry' | 'stats'>('entry');
  const [month, setMonth] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pin, setPin] = useState('');
  const edit = pin === '047';

  useEffect(() => {
    API.load('loadData').then(d => { setData(d); setLoading(false); });
    API.load('loadStatus').then(s => setStatuses(s));
  }, []);

  const onUpdate = useCallback((id: string, m: number, val: number) => {
    if (!edit) return;
    setData(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d.employeeId === id && d.month === m && d.category === cat && d.section === sec);
      if (idx > -1) next[idx].actual = val;
      else next.push({ employeeId: id, month: m, category: cat, section: sec, actual: val });
      setSyncing(true);
      API.save('saveData', next).finally(() => setSyncing(false));
      return next;
    });
  }, [edit, cat, sec]);

  const toggleStatus = useCallback((m: number) => {
    if (!edit || m < 0) return;
    setStatuses(prev => {
      let next = [...prev];
      const idx = next.findIndex(s => s.month === m && s.section === sec);
      if (idx > -1) next[idx].isFilled = !next[idx].isFilled;
      else next.push({ month: m, section: sec, isFilled: true });
      setSyncing(true);
      API.save('saveStatus', next).finally(() => setSyncing(false));
      return next;
    });
  }, [edit, sec]);

  const isLocked = (m: number) => statuses.find(s => s.month === m && s.section === sec)?.isFilled ?? false;
  const closedMonths = useMemo(() => statuses.filter(s => s.isFilled && s.section === sec).map(s => s.month), [statuses, sec]);

  const getCatIcon = (c: string) => {
    const icons: any = { 
      'Mamparas': <ShowerHead size={24}/>, 'Mediciones (Reform, CBxP y CPxP)': <Ruler size={24}/>, 'Muebles de Baño': <Archive size={24}/>,
      'Encimeras de piedra': <Gem size={24}/>, 'Armarios': <DoorClosed size={24}/>, 'Mediciones': <Ruler size={24}/>,
      'Puertas de Entrada': <LogIn size={24}/>, 'Puertas de Paso': <DoorOpen size={24}/>, 'Reforma Cocinas': <Hammer size={24}/>,
      'CBxP + PxP': <ArrowRightLeft size={24}/>, 'Reformas': <Hammer size={24}/>,
      'Placas Solares': <Sun size={24}/>, 'Aerotermia': <Wind size={24}/>, 'Baterías': <Battery size={24}/>, 'Instalación EERR': <Zap size={24}/>,
      'Césped Artificial': <Sprout size={24}/>, 'Cercados': <Fence size={24}/>, 'Riego': <Droplets size={24}/>, 'Reformas Jardín': <Flower2 size={24}/>
    };
    return icons[c] || <Target size={24}/>;
  };

  const currentEmps = useMemo(() => {
    if (sec === 'Madera') return SECTION_CONFIG.Madera.employees;
    return (CATEGORY_GROUPS as any)[grp]?.employees || [];
  }, [sec, grp]);

  const chartEvolutionData = useMemo(() => {
    const cats = SECTION_CONFIG[sec].categories;
    return MONTHS.map((mName, mIdx) => {
      const isMonthClosed = closedMonths.includes(mIdx);
      const monthObj: any = { name: mName.substring(0, 3) };
      
      cats.forEach(c => {
        if (!isMonthClosed) {
          monthObj[c] = null;
          monthObj[`${c}_ud`] = null;
          return;
        }

        const responsibleIds = new Set<string>();
        Object.keys(CATEGORY_GROUPS).forEach(gk => {
          if ((CATEGORY_GROUPS as any)[gk].categories.includes(c)) {
            (CATEGORY_GROUPS as any)[gk].employees.forEach((e: any) => responsibleIds.add(e.id));
          }
        });
        if (sec === 'Madera') SECTION_CONFIG.Madera.employees.forEach((e: any) => responsibleIds.add(e.id));

        let sumActual = 0;
        responsibleIds.forEach(empId => {
          sumActual += data.find(d => d.employeeId === empId && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
        });

        const groupTarget = responsibleIds.size * CATEGORY_TARGETS[c];
        const pct = groupTarget > 0 ? Math.round((sumActual / groupTarget) * 100) : 0;
        
        monthObj[c] = pct; 
        monthObj[`${c}_ud`] = sumActual;
      });
      return monthObj;
    });
  }, [data, sec, closedMonths]);

  // Ranking de empleados para la competición
  const leaderboardData = useMemo(() => {
    if (closedMonths.length === 0) return [];
    
    return currentEmps.map((emp: any) => {
        let empCategories: string[] = [];
        if (sec === 'Madera') {
            empCategories = SECTION_CONFIG.Madera.categories;
        } else {
            Object.keys(CATEGORY_GROUPS).forEach(gk => {
                const g = (CATEGORY_GROUPS as any)[gk];
                if (g.employees.some((e: any) => e.id === emp.id) && g.categories.some((c: string) => SECTION_CONFIG[sec].categories.includes(c))) {
                    empCategories = g.categories;
                }
            });
        }

        let totalActual = 0;
        let totalTarget = 0;
        empCategories.forEach(c => {
            totalActual += closedMonths.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
            totalTarget += CATEGORY_TARGETS[c] * closedMonths.length;
        });

        const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
        return {
            name: emp.name,
            fullName: emp.name,
            firstName: emp.name.split(' ')[0],
            percentage: pct,
            units: totalActual
        };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, sec, currentEmps, closedMonths]);

  const globalSectionPerformance = useMemo(() => {
    let totalActual = 0;
    let totalTarget = 0;
    SECTION_CONFIG[sec].categories.forEach((c: any) => {
      const responsibleIds = new Set<string>();
      Object.keys(CATEGORY_GROUPS).forEach(gk => {
        if ((CATEGORY_GROUPS as any)[gk].categories.includes(c)) {
          (CATEGORY_GROUPS as any)[gk].employees.forEach((e: any) => responsibleIds.add(e.id));
        }
      });
      if (sec === 'Madera') SECTION_CONFIG.Madera.employees.forEach((e: any) => responsibleIds.add(e.id));

      responsibleIds.forEach(empId => {
        closedMonths.forEach(m => {
          totalActual += data.find(d => d.employeeId === empId && d.month === m && d.category === c && d.section === sec)?.actual || 0;
          totalTarget += CATEGORY_TARGETS[c] || 0;
        });
      });
    });
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  }, [data, sec, closedMonths]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const getGroupKey = (section: string, type: string) => {
    const map: any = { Sanitario: { Esp: 'SAN_VEND_ESP', Proj: 'SAN_VEND_PROJ' }, Cocinas: { Esp: 'COC_VEND_ESP', Proj: 'COC_VEND_PROJ' }, EERR: { Esp: 'EERR_VEND_ESP', Proj: 'EERR_VEND_PROJ' }, Jardin: { Esp: 'JARDIN_VEND_ESP', Proj: 'JARDIN_VEND_PROJ' } };
    return map[section]?.[type] || '';
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase text-xs tracking-widest animate-pulse">Cargando...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Database size={20} /></div>
            <h1 className="font-black text-xl tracking-tighter text-slate-800">Animación <span className="text-indigo-600">Monoproducto</span></h1>
            {syncing ? <RefreshCw className="animate-spin text-amber-500 ml-2" size={14} /> : <CheckCircle className="text-green-500 ml-2" size={14} />}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[10px] font-black uppercase outline-none px-4 text-indigo-700">
                    <option value={-1}>Acumulado</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button onClick={() => toggleStatus(month)} disabled={!edit || month === -1} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 ${isLocked(month) ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500'}`}>
                    {isLocked(month) ? <Lock size={12} /> : <Unlock size={12} />}
                    {month === -1 ? '----' : (isLocked(month) ? 'CERRADO' : 'ABIERTO')}
                </button>
            </div>
            <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200">
              <button onClick={() => setView('entry')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'entry' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Registro</button>
              <button onClick={() => setView('stats')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'stats' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>Analítica</button>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${edit ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="w-8 bg-transparent text-center text-[10px] font-black outline-none text-white" maxLength={3} />
              {edit ? <Unlock size={12} /> : <Lock size={12} />}
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 py-4 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-6 space-y-4">
          <div className="flex justify-between gap-2 overflow-x-auto pb-2">
            {['Sanitario', 'Cocinas', 'Madera', 'EERR', 'Jardin'].map(s => (
              <button key={s} onClick={() => { setSec(s); setCat(SECTION_CONFIG[s].categories[0]); setGrp(getGroupKey(s, 'Esp') || grp); }} 
                className={`flex-1 min-w-[140px] py-4 rounded-2xl font-black uppercase text-[11px] border-2 transition-all ${sec === s ? 'bg-indigo-700 border-indigo-700 text-white shadow-xl' : 'bg-white text-slate-400'}`}>
                {s}
              </button>
            ))}
          </div>
          {sec !== 'Madera' && (
            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 w-full">
              {['Esp', 'Proj'].map(type => {
                  const k = getGroupKey(sec, type);
                  if (!(CATEGORY_GROUPS as any)[k]) return null;
                  return <button key={k} onClick={() => { setGrp(k); setCat((CATEGORY_GROUPS as any)[k].categories[0]); }}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase ${grp === k ? 'bg-indigo-700 text-white shadow-lg' : 'text-slate-400'}`}>
                    {(CATEGORY_GROUPS as any)[k].title}
                  </button>
              })}
            </div>
          )}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {(sec === 'Madera' ? SECTION_CONFIG.Madera.categories : ((CATEGORY_GROUPS as any)[grp]?.categories || [])).map((c: any) => (
              <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap flex items-center gap-3 p-3 px-6 rounded-xl border ${cat === c ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}>
                {getCatIcon(c)}
                <span className="text-[10px] font-black uppercase tracking-widest">{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        {view === 'entry' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">{getCatIcon(cat)}</div>
                <div><h2 className="text-2xl font-black tracking-tighter text-slate-800">{cat}</h2><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Objetivo: {CATEGORY_TARGETS[cat]} Ud/Mes</p></div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="p-6 font-black text-slate-600 sticky left-0 bg-slate-50 z-20 border-r uppercase text-[10px]">Colaborador</th>
                    {MONTHS.map((m, i) => <th key={m} className={`p-4 font-bold text-center text-[10px] uppercase ${i === month ? 'text-indigo-600 bg-indigo-100/50' : 'text-slate-400'}`}>{m.substring(0, 3)}</th>)}
                    <th className="p-4 font-black text-indigo-700 text-center bg-indigo-50/50 uppercase text-[10px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmps.map((emp: any) => {
                    const total = MONTHS.reduce((acc, _, i) => acc + (data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0), 0);
                    return <tr key={emp.id} className="border-b hover:bg-slate-50">
                      <td className="p-6 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0;
                        const target = CATEGORY_TARGETS[cat];
                        const color = val === 0 ? 'bg-white' : val >= target ? 'bg-green-50 text-green-700' : val >= target * 0.8 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600';
                        return <td key={i} className={`p-2 border-r text-center ${color} ${i === month ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}>
                          <input type="number" value={val || ''} disabled={isLocked(i) || !edit} placeholder="0" onChange={(e) => onUpdate(emp.id, i, parseInt(e.target.value) || 0)} className="w-12 h-10 text-center bg-transparent font-black outline-none text-lg" />
                          <div className="text-[9px] font-black text-slate-400 uppercase mt-1">OBJ: {target}</div>
                        </td>
                      })}
                      <td className="p-4 text-center font-black text-indigo-800 text-xl">{total}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">CUMPLIMIENTO GLOBAL</p>
                    <h3 className="text-4xl font-black mb-1">{globalSectionPerformance}%</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">Promedio seccional (%)</p>
                </div>
                <div className="bg-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-2">Sección Actual</p>
                    <h3 className="text-3xl font-black mb-1">{sec}</h3>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MESES FINALIZADOS</p>
                    <h3 className="text-3xl font-black text-slate-900 mb-1">{closedMonths.length} / 12</h3>
                </div>
            </div>

            {/* Gráfico de Evolución */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><TrendingUp size={24} /></div>
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800">Evolución por KPI</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Eje Izquierdo: % Cumplimiento | Eje Derecho: Unidades Reales</p>
                    </div>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" domain={[0, 120]} tick={{fill: '#4f46e5', fontSize: 10, fontWeight: 900}} label={{ value: 'CUMPLIMIENTO (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} label={{ value: 'UNIDADES (UD)', angle: 90, position: 'insideRight', offset: 10, fontSize: 10, fontWeight: 900 }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                itemStyle={{fontSize: '11px', fontWeight: 800}}
                                formatter={(value: number, name: string) => {
                                    const entry = chartEvolutionData.find(d => d[name] === value);
                                    const units = entry ? entry[`${name}_ud`] : '-';
                                    return [`${value}% (${units} Ud)`, name];
                                }}
                            />
                            <Legend 
                                wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase'}}
                                iconType="circle"
                            />
                            <ReferenceLine yAxisId="left" y={100} stroke="#10b981" strokeDasharray="10 5" strokeWidth={2} label={{ position: 'right', value: 'META', fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                            {SECTION_CONFIG[sec].categories.map((c: any, i: number) => (
                                <Line 
                                    key={c} 
                                    yAxisId="left" 
                                    type="monotone" 
                                    dataKey={c} 
                                    name={c} 
                                    stroke={COLORS[i % COLORS.length]} 
                                    strokeWidth={4} 
                                    dot={{ r: 5, strokeWidth: 3 }} 
                                    activeDot={{ r: 8 }} 
                                    connectNulls={false} 
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Ranking Competitivo */}
            {closedMonths.length > 0 && (
                <div className="bg-indigo-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20"><Trophy size={24} /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter">Ranking de Rendimiento: Carrera por el Objetivo</h3>
                            <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Basado en el cumplimiento promedio acumulado</p>
                        </div>
                    </div>
                    
                    <div className="h-[300px] relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={leaderboardData} layout="vertical" margin={{ left: 20, right: 60, top: 10, bottom: 10 }}>
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis 
                                    dataKey="firstName" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#fff', fontSize: 11, fontWeight: 900}} 
                                    width={80}
                                />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{backgroundColor: '#1e1b4b', border: 'none', borderRadius: '12px', color: '#fff'}}
                                    formatter={(val) => [`${val}%`, 'Cumplimiento']}
                                />
                                <Bar dataKey="percentage" radius={[0, 20, 20, 0]} barSize={24} label={{ position: 'right', fill: '#fbbf24', fontSize: 14, fontWeight: 900, formatter: (val: any) => `${val}%` }}>
                                    {leaderboardData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index === 0 ? '#fbbf24' : index === 1 ? '#e2e8f0' : index === 2 ? '#cd7f32' : '#6366f1'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex justify-center gap-6 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Oro (1º)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Plata (2º)</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#cd7f32]"></div> Bronce (3º)</div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Users size={24} /></div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Resumen Detallado por Vendedor</h3>
                </div>

                {closedMonths.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 p-12 text-center">
                        <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-400 font-bold uppercase text-xs">No hay meses finalizados para generar el resumen por vendedor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {leaderboardData.map((leaderInfo: any) => {
                            const emp = currentEmps.find((e: any) => e.name === leaderInfo.fullName);
                            // Encontrar a qué grupo de categorías pertenece el empleado
                            let empCategories: string[] = [];
                            if (sec === 'Madera') {
                                empCategories = SECTION_CONFIG.Madera.categories;
                            } else {
                                Object.keys(CATEGORY_GROUPS).forEach(gk => {
                                    const g = (CATEGORY_GROUPS as any)[gk];
                                    if (g.employees.some((e: any) => e.id === emp.id) && g.categories.some((c: string) => SECTION_CONFIG[sec].categories.includes(c))) {
                                        empCategories = g.categories;
                                    }
                                });
                            }

                            return (
                                <div key={emp.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-shadow">
                                    <div className="bg-slate-50 border-b border-slate-200 p-8 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 uppercase text-lg tracking-tighter">{emp.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Colaborador Destacado</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-4xl font-black ${leaderInfo.percentage >= 100 ? 'text-green-600' : leaderInfo.percentage >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                                                {leaderInfo.percentage}%
                                            </p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CUMPLIMIENTO TOTAL</p>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-8 flex-1">
                                        {empCategories.map(c => {
                                            const totalActual = closedMonths.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
                                            const totalTarget = CATEGORY_TARGETS[c] * closedMonths.length;
                                            const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
                                            const colorClass = pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500';
                                            const textColor = pct >= 100 ? 'text-green-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600';

                                            return (
                                                <div key={c} className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-slate-50 rounded-xl text-slate-400">{getCatIcon(c)}</div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{c}</p>
                                                                <p className="text-xs font-bold text-slate-400">{totalActual} / {totalTarget} Ud Instaladas</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-xl font-black ${textColor}`}>{pct}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} 
                                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
          </div>
        )}
      </main>
      <footer className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mt-auto">Animación Monoproducto © 2026</footer>
    </div>
  );
};

export default App;
