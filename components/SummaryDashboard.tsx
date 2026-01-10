import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Employee, MonthlyData, Category, Section, MonthStatus, SECTION_CONFIG, CATEGORY_GROUPS, getTarget } from '../types';
import { Target, TrendingUp, Award } from 'lucide-react';

interface Props {
  selectedSection: Section;
  selectedCategory: Category;
  employees: Employee[];
  data: MonthlyData[];
  monthStatus: MonthStatus[];
}

const SummaryDashboard: React.FC<Props> = ({ selectedSection, selectedCategory, employees, data, monthStatus }) => {
  const filledMonths = monthStatus
    .filter(s => s.isFilled && s.section === selectedSection)
    .map(s => s.month);
  
  // Chart data for the currently selected specific KPI
  const chartData = employees.map(emp => {
    const relevantData = data.filter(d => 
      d.employeeId === emp.id && 
      d.category === selectedCategory && 
      d.section === selectedSection &&
      filledMonths.includes(d.month)
    );
    
    const sum = relevantData.reduce((acc, curr) => acc + curr.actual, 0);
    const avg = filledMonths.length > 0 ? (sum / filledMonths.length) : 0;
    
    return {
      name: emp.name.split(' ')[0],
      fullName: emp.name,
      average: parseFloat(avg.toFixed(1)),
      total: sum
    };
  });

  // Global aggregate data logic
  const getGroupCategories = (empId: string) => {
    if (selectedSection === 'Sanitario') {
      if (CATEGORY_GROUPS.SAN_VEND_PROJ.employees.some(e => e.id === empId)) {
        return CATEGORY_GROUPS.SAN_VEND_PROJ.categories;
      }
      return CATEGORY_GROUPS.SAN_VEND_ESP.categories;
    }
    if (selectedSection === 'Cocinas') {
      if (CATEGORY_GROUPS.COC_VEND_PROJ.employees.some(e => e.id === empId)) {
        return CATEGORY_GROUPS.COC_VEND_PROJ.categories;
      }
      return CATEGORY_GROUPS.COC_VEND_ESP.categories;
    }
    return SECTION_CONFIG[selectedSection].categories;
  };

  const getGroupTitle = (empId: string) => {
    if (selectedSection === 'Sanitario') {
      return CATEGORY_GROUPS.SAN_VEND_PROJ.employees.some(e => e.id === empId) ? 'Vendedor Proyecto' : 'Vendedor Especialista';
    }
    if (selectedSection === 'Cocinas') {
      return CATEGORY_GROUPS.COC_VEND_PROJ.employees.some(e => e.id === empId) ? 'Vendedor Proyecto' : 'Vendedor Especialista';
    }
    return selectedSection;
  };

  const globalPerformanceData = SECTION_CONFIG[selectedSection].employees.map(emp => {
    const groupCategories = getGroupCategories(emp.id);
    const relevantData = data.filter(d => 
      d.employeeId === emp.id && 
      d.section === selectedSection &&
      groupCategories.includes(d.category) &&
      filledMonths.includes(d.month)
    );
    
    // Fixed: Calculate goal using getTarget for each month and category
    let totalGoal = 0;
    filledMonths.forEach(mIdx => {
      groupCategories.forEach(cat => {
        totalGoal += getTarget(cat, mIdx);
      });
    });
    
    const totalActual = relevantData.reduce((acc, curr) => acc + curr.actual, 0);
    const percentage = totalGoal > 0 ? (totalActual / totalGoal) * 100 : 0;
    
    return {
      employeeId: emp.id,
      name: emp.name,
      percentage: Math.round(percentage),
      totalActual,
      totalGoal,
      group: getGroupTitle(emp.id)
    };
  });

  // Fixed: use average target for comparison since val is a per-month average
  const getBarColor = (val: number) => {
    let totalTarget = 0;
    filledMonths.forEach(mIdx => {
      totalTarget += getTarget(selectedCategory, mIdx);
    });
    const avgTarget = filledMonths.length > 0 ? totalTarget / filledMonths.length : 0;
    
    if (val >= avgTarget) return '#22c55e';
    if (val >= avgTarget * 0.8) return '#facc15';
    return '#ef4444';
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 100) return 'text-green-600 bg-green-50 border-green-200';
    if (pct >= 80) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (filledMonths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm text-slate-400">
        <Target size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-bold">No hay datos finalizados para {selectedSection}</p>
        <p className="text-sm">Finaliza al menos un mes de esta sección en el registro.</p>
      </div>
    );
  }

  const groupedPerformance = globalPerformanceData.reduce((acc, curr) => {
    if (!acc[curr.group]) acc[curr.group] = [];
    acc[curr.group].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  // Fixed: Average target for the chart reference line
  const averageTarget = filledMonths.length > 0 
    ? filledMonths.reduce((acc, mIdx) => acc + getTarget(selectedCategory, mIdx), 0) / filledMonths.length 
    : 0;

  return (
    <div className="space-y-8">
      {/* Global Achievement Summary */}
      <div className="bg-indigo-900 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-200">
        <div className="flex items-center gap-3 mb-10">
          <Award className="text-indigo-300" size={32} />
          <div>
            <h3 className="text-2xl font-black tracking-tight">Cumplimiento Global Seccional</h3>
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">Comparativa basada en suma de objetivos por perfil</p>
          </div>
        </div>
        
        <div className="space-y-10">
          {(Object.entries(groupedPerformance) as [string, any[]][]).map(([groupName, groupEmployees]) => (
            <div key={groupName} className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 border-b border-white/10 pb-2">{groupName}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupEmployees.map((emp: any) => (
                  <div key={emp.employeeId} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/10">
                    <div>
                      <p className="text-xs font-black text-indigo-200 uppercase tracking-tighter mb-1">{emp.name}</p>
                      <p className="text-sm font-medium text-white/70">{emp.totalActual} / {emp.totalGoal} Unid.</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-2xl font-black ${emp.percentage >= 100 ? 'text-green-400' : emp.percentage >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                        {emp.percentage}%
                      </span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${emp.percentage >= 100 ? 'bg-green-400' : emp.percentage >= 80 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(emp.percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-indigo-600" size={24} />
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Media: {selectedCategory}</h3>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  itemStyle={{fontWeight: 900, fontSize: '14px'}}
                  labelStyle={{fontWeight: 700, color: '#64748b', marginBottom: '4px'}}
                />
                <ReferenceLine y={averageTarget} stroke="#cbd5e1" strokeDasharray="8 4" label={{ position: 'right', value: 'Obj', fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <Bar dataKey="average" radius={[6, 6, 0, 0]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.average)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Detalle por Colaborador</h3>
          <div className="space-y-3">
            {chartData.map((emp) => {
              const currentAverageTarget = averageTarget;
              return (
                <div key={emp.fullName} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 group-hover:text-indigo-900 transition-colors">{emp.fullName}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total {selectedCategory}: {emp.total}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-black ${emp.average >= currentAverageTarget ? 'text-green-600' : emp.average >= currentAverageTarget * 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
                        {emp.average}
                      </div>
                      <div className="text-[10px] uppercase font-black tracking-tighter text-slate-400">Promedio</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getPercentageColor((emp.average / currentAverageTarget) * 100)}`}>
                      {Math.round((emp.average / currentAverageTarget) * 100)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;