import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend, Cell 
} from 'recharts';
import { 
  Database, RefreshCw, CheckCircle, Unlock, Lock, Target, ShowerHead, 
  TreeDeciduous, Utensils, TrendingUp, Calendar, ArrowRightLeft, 
  DoorClosed, LogIn, DoorOpen, Zap, Flower2, Sun, Wind, Battery, 
  Sprout, Fence, Droplets, Hammer, Gem, Ruler, Users, Trophy 
} from 'lucide-react';
import { 
  Section, Category, Employee, MonthlyData, MonthStatus, CategoryGroup,
  MONTHS, CATEGORY_TARGETS, CATEGORY_GROUPS, SECTION_CONFIG 
} from './types';
import { GoogleGenAI } from "@google/genai";

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
  const [aiAnalysis, setAiAnalysis] = useState('');
  
  const isEditMode = pin === '047';

  // Carga inicial de datos
  useEffect(() => {
    const init = async () => {
      try {
        const [dRes, sRes] = await Promise.all([
          fetch(`${SCRIPT_URL}?action=loadData`),
          fetch(`${SCRIPT_URL}?action=loadStatus`)
        ]);
        const d = await dRes.json();
        const s = await sRes.json();
        setData(Array.isArray(d) ? d : []);
        setStatuses(Array.isArray(s) ? s : []);
      } catch (e) {
        console.warn("Utilizando respaldo local por fallo de conexión");
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

  // Guardado persistente
  const saveToServer = async (action: string, payload: any) => {
    setSyncing(true);
    localStorage.setItem(`backup_${action === 'saveData' ? 'data' : 'status'}`, JSON.stringify(payload));
    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
    } catch (e) {
      console.error("Error de sincronización con MySQL");
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

  // Generación de Gráfico de Evolución
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

        const responsibleIds = new Set<string>();
        Object.keys(CATEGORY_GROUPS).forEach(gk => {
          if (CATEGORY_GROUPS[gk].categories.includes(c)) {
            CATEGORY_GROUPS[gk].employees.forEach(e => responsibleIds.add(e.id));
          }
        });
        if (sec === 'Madera') SECTION_CONFIG.Madera.employees.forEach((e: any) => responsibleIds.add(e.id));

        let sumActual = 0;
        responsibleIds.forEach(id => {
          sumActual += data.find(d => d.employeeId === id && d.month === mIdx && d.category === c && d.section === sec)?.actual || 0;
        });

        const target = responsibleIds.size * CATEGORY_TARGETS[c];
        row[c] = target > 0 ? Math.round((sumActual / target) * 100) : 0;
        row[`${c}_ud`] = sumActual;
      });
      return row;
    });
  }, [data, sec, closedMonths]);

  // Leaderboard
  const leaderboardData = useMemo(() => {
    if (closedMonths.length === 0) return [];
    const emps = SECTION_CONFIG[sec].employees;
    
    return emps.map((emp: any) => {
      let empCats: string[] = [];
      if (sec === 'Madera') empCats = SECTION_CONFIG.Madera.categories;
      else {
        Object.keys(CATEGORY_GROUPS).forEach(gk => {
          const g = CATEGORY_GROUPS[gk];
          if (g.employees.some(e => e.id === emp.id) && g.categories.some(c => SECTION_CONFIG[sec].categories.includes(c))) {
            empCats = g.categories;
          }
        });
      }

      let tAct = 0, tTar = 0;
      empCats.forEach(c => {
        tAct += closedMonths.reduce((acc, m) => acc + (data.find(d => d.employeeId === emp.id && d.month === m && d.category === c && d.section === sec)?.actual || 0), 0);
        tTar += CATEGORY_TARGETS[c] * closedMonths.length;
      });

      return {
        name: emp.name.split(' ')[0],
        fullName: emp.name,
        percentage: tTar > 0 ? Math.round((tAct / tTar) * 100) : 0,
        units: tAct
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [data, sec, closedMonths]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const getCatIcon = (c: string) => {
    const icons: any = { 
      'Mamparas': <ShowerHead size={22}/>, 'Mediciones (Reform, CBxP y CPxP)': <Ruler size={22}/>, 'Muebles de Baño': <DoorClosed size={22}/>,
      'Encimeras de piedra': <Gem size={22}/>, 'Armarios': <DoorClosed size={22}/>, 'Mediciones': <Ruler size={22}/>,
      'Puertas de Entrada': <LogIn size={22}/>, 'Puertas de Paso': <DoorOpen size={22}/>, 'Reforma Cocinas': <Hammer size={22}/>,
      'CBxP + PxP': <ArrowRightLeft size={22}/>, 'Reformas': <Hammer size={22}/>,
      'Placas Solares': <Sun size={22}/>, 'Aerotermia': <Wind size={22}/>, 'Baterías': <Battery size={22}/>, 'Instalación EERR': <Zap size={22}/>,
      'Césped Artificial': <Sprout size={22}/>, 'Cercados': <Fence size={22}/>, 'Riego': <Droplets size={22}/>, 'Reformas Jardín': <Flower2 size={22}/>
    };
    return icons[c] || <Target size={22}/>;
  };

  const currentEmps = useMemo(() => {
    if (sec === 'Madera') return SECTION_CONFIG.Madera.employees;
    return CATEGORY_GROUPS[grp]?.employees || [];
  }, [sec, grp]);

  const runAiAudit = async () => {
    setAiAnalysis("Analizando datos con IA...");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza el rendimiento del equipo de ${sec} con estos datos de cumplimiento: ${JSON.stringify(leaderboardData)}. Da consejos estratégicos breves.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text);
    } catch (e) {
      setAiAnalysis("No se pudo conectar con la IA.");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase text-xs tracking-widest animate-pulse">Cargando Sistema...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER ESTRATÉGICO */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-20 flex items-center shadow-sm">
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg"><Database size={22} /></div>
            <h1 className="font-black text-xl tracking-tighter text-slate-800">Performance <span className="text-indigo-600">2026</span></h1>
            {syncing && <RefreshCw className="animate-spin text-amber-500 ml-2" size={16} />}
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200">
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="bg-transparent text-[11px] font-black uppercase outline-none px-4 text-indigo-700">
                    <option value={-1}>Acumulado Anual</option>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <button onClick={() => toggleStatus(month)} disabled={!isEditMode || month === -1} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${isLocked(month) ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                    {isLocked(month) ? <Lock size={14} /> : <Unlock size={14} />}
                    {month === -1 ? '----' : (isLocked(month) ? 'MES CERRADO' : 'MES ABIERTO')}
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

      {/* SELECTORES DE SECCIÓN Y CATEGORÍA */}
      <div className="bg-white border-b border-slate-200 py-6 shadow-sm z-40">
        <div className="max-w-7xl mx-auto px-6 space-y-5">
          <div className="flex justify-between gap-3 overflow-x-auto scrollbar-hide">
            {(['Sanitario', 'Cocinas', 'Madera', 'EERR', 'Jardin'] as Section[]).map(s => (
              <button key={s} onClick={() => { setSec(s); setCat(SECTION_CONFIG[s].categories[0]); }} 
                className={`flex-1 min-w-[150px] py-4 rounded-2xl font-black uppercase text-[12px] border-2 transition-all flex items-center justify-center gap-3 ${sec === s ? 'bg-indigo-700 border-indigo-700 text-white shadow-xl scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}>
                {SECTION_CONFIG[s].icon}
                {s}
              </button>
            ))}
          </div>

          {sec !== 'Madera' && (
            <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 w-full">
              {(['Esp', 'Proj'] as const).map(type => {
                  const k = sec === 'Sanitario' ? `SAN_VEND_${type.toUpperCase()}` : 
                            sec === 'Cocinas' ? `COC_VEND_${type.toUpperCase()}` :
                            sec === 'EERR' ? `EERR_VEND_${type.toUpperCase()}` :
                            sec === 'Jardin' ? `JARDIN_VEND_${type.toUpperCase()}` : '';
                  if (!CATEGORY_GROUPS[k]) return null;
                  return <button key={k} onClick={() => { setGrp(k); setCat(CATEGORY_GROUPS[k].categories[0]); }}
                    className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${grp === k ? 'bg-indigo-700 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                    {CATEGORY_GROUPS[k].title}
                  </button>
              })}
            </div>
          )}

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {SECTION_CONFIG[sec].categories.filter((c: string) => {
                if (sec === 'Madera') return true;
                return CATEGORY_GROUPS[grp]?.categories.includes(c);
            }).map((c: string) => (
              <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap flex items-center gap-3 p-3.5 px-7 rounded-2xl border-2 transition-all ${cat === c ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-md font-black' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 font-bold'}`}>
                {getCatIcon(c)}
                <span className="text-[11px] uppercase tracking-wider">{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full">
        {view === 'entry' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem] shadow-inner">{getCatIcon(cat)}</div>
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-slate-800">{cat}</h2>
                    <p className="text-[11px] font-black text-indigo-500 uppercase mt-2 flex items-center gap-2 tracking-widest">
                        <Target size={14}/> Objetivo de Equipo: {CATEGORY_TARGETS[cat]} Unidades / Mes
                    </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-8 font-black text-slate-600 sticky left-0 bg-slate-50 z-20 border-r uppercase text-[11px] tracking-widest min-w-[220px]">Colaborador</th>
                    {MONTHS.map((m, i) => (
                        <th key={m} className={`p-4 font-black text-center text-[10px] uppercase tracking-widest ${i === month ? 'text-indigo-600 bg-indigo-100/30' : 'text-slate-400'}`}>
                            {m.substring(0, 3)}
                        </th>
                    ))}
                    <th className="p-4 font-black text-indigo-700 text-center bg-indigo-50/50 uppercase text-[11px] tracking-widest w-32 border-l border-slate-200">Total Anual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEmps.map((emp: any) => {
                    const annualTotal = MONTHS.reduce((acc, _, i) => acc + (data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0), 0);
                    return <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-8 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100">{emp.name}</td>
                      {MONTHS.map((_, i) => {
                        const val = data.find(d => d.employeeId === emp.id && d.month === i && d.category === cat && d.section === sec)?.actual || 0;
                        const target = CATEGORY_TARGETS[cat];
                        const statusColor = val === 0 ? 'bg-white' : 
                                            val >= target ? 'bg-emerald-50 text-emerald-700 font-black' : 
                                            val >= target * 0.8 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600';
                        
                        return <td key={i} className={`p-3 border-r border-slate-100 text-center transition-all ${statusColor} ${i === month ? 'ring-2 ring-indigo-200 ring-inset z-10' : ''}`}>
                          <input 
                            type="number" 
                            value={val || ''} 
                            disabled={isLocked(i) || !isEditMode} 
                            placeholder="0" 
                            onChange={(e) => onUpdate(emp.id, i, parseInt(e.target.value) || 0)} 
                            className="w-12 h-10 text-center bg-transparent font-black outline-none text-xl placeholder:text-slate-300" 
                          />
                          <div className="text-[8px] font-black text-slate-400 uppercase mt-1 opacity-50">OBJ {target}</div>
                        </td>
                      })}
                      <td className="p-6 text-center font-black text-indigo-900 text-2xl border-l border-slate-200 bg-slate-50/30 group-hover:bg-indigo-50/30">{annualTotal}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 bg-indigo-500/10 w-32 h-32 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Eficiencia Seccional</p>
                    <h3 className="text-5xl font-black mb-2 tracking-tighter">
                        {Math.round(leaderboardData.reduce((acc, curr) => acc + curr.percentage, 0) / (leaderboardData.length || 1))}%
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Promedio de Cumplimiento</p>
                </div>
                <div className="bg-indigo-700 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col justify-center group overflow-hidden relative">
                    <div className="absolute -right-4 -bottom-4 bg-white/5 w-32 h-32 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.3em] mb-3">Sector Foco</p>
                    <h3 className="text-3xl font-black mb-2 tracking-tighter uppercase">{sec}</h3>
                    <div className="flex gap-2 mt-2">
                        {SECTION_CONFIG[sec].icon}
                        <span className="text-indigo-200 text-xs font-bold uppercase">{SECTION_CONFIG[sec].categories.length} Categorías</span>
                    </div>
                </div>
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-xl flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Ciclo de Datos</p>
                    <h3 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">{closedMonths.length} / 12</h3>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Meses Auditados</p>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl flex flex-col justify-center items-center gap-4">
                    <button onClick={runAiAudit} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                        <Zap size={16}/> Auditoría IA
                    </button>
                    <p className="text-[9px] text-slate-400 font-bold uppercase text-center leading-relaxed italic">Genera informes automáticos basados en el rendimiento real</p>
                </div>
            </div>

            {aiAnalysis && (
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[2.5rem] animate-in zoom-in duration-300">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="text-indigo-600" size={20}/>
                        <h4 className="font-black uppercase text-[11px] text-indigo-900 tracking-widest">Informe Estratégico de IA</h4>
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-line">{aiAnalysis}</p>
                </div>
            )}

            {/* GRÁFICO DE EVOLUCIÓN */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative">
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.2rem] shadow-sm"><TrendingUp size={26} /></div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Evolución de KPIs ({sec})</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Métricas porcentuales vs Objetivos Unitarios</p>
                        </div>
                    </div>
                </div>
                
                <div className="h-[450px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartEvolutionData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 900}} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 125]} tick={{fill: '#4f46e5', fontSize: 11, fontWeight: 900}} label={{ value: 'CUMPLIMIENTO %', angle: -90, position: 'insideLeft', offset: 0, fontSize: 10, fontWeight: 900, fill: '#6366f1' }} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px'}}
                                itemStyle={{fontSize: '12px', fontWeight: 800, textTransform: 'uppercase'}}
                                labelStyle={{fontSize: '11px', fontWeight: 900, marginBottom: '8px', color: '#64748b'}}
                                formatter={(val: any, name: string) => {
                                    const entry = chartEvolutionData.find(d => d[name] === val);
                                    const units = entry ? entry[`${name}_ud`] : '-';
                                    return [`${val}% (${units} Ud)`, name];
                                }}
                            />
                            <Legend 
                                wrapperStyle={{paddingTop: '30px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em'}}
                                iconType="circle"
                                iconSize={10}
                            />
                            <ReferenceLine y={100} stroke="#10b981" strokeDasharray="12 6" strokeWidth={2.5} label={{ position: 'right', value: 'META 100%', fill: '#10b981', fontSize: 11, fontWeight: 900 }} />
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

            {/* LEADERBOARD Y RANKING */}
            {closedMonths.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 bg-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
                        <div className="flex items-center gap-4 mb-10 relative z-10">
                            <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/30"><Trophy size={26} /></div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter">Hall of Fame</h3>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.25em]">Ranking Acumulado Anual</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 relative z-10 flex flex-col justify-center">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={leaderboardData} layout="vertical" margin={{ left: 20, right: 60, top: 0, bottom: 0 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#e2e8f0', fontSize: 12, fontWeight: 900}} 
                                        width={80}
                                    />
                                    <Bar dataKey="percentage" radius={[0, 20, 20, 0]} barSize={26} label={{ position: 'right', fill: '#fbbf24', fontSize: 16, fontWeight: 900, formatter: (val: any) => `${val}%` }}>
                                        {leaderboardData.map((_, idx) => (
                                            <Cell key={`cell-${idx}`} fill={idx === 0 ? '#fbbf24' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#cd7f32' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.2rem] shadow-sm"><Users size={24} /></div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800">Rendimiento por Especialista</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {leaderboardData.map((info, idx) => {
                                const emp = SECTION_CONFIG[sec].employees.find((e: any) => e.name === info.fullName);
                                return (
                                    <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg text-white ${idx === 0 ? 'bg-amber-500' : 'bg-slate-800'}`}>
                                                    {emp?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800 uppercase tracking-tighter">{emp?.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acumulado: {info.units} Unid.</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-3xl font-black leading-none ${info.percentage >= 100 ? 'text-emerald-600' : info.percentage >= 80 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                    {info.percentage}%
                                                </p>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Global</span>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-auto">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${info.percentage >= 100 ? 'bg-emerald-500' : info.percentage >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(info.percentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-14 text-center border-t border-slate-100 bg-white">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
              Animación Monoproducto © 2026 | Sistema de Inteligencia de Rendimiento
          </p>
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);