import React from 'react';
import { MONTHS, MonthlyData, Category, Section, Employee, getTarget } from '../types';

interface Props {
  selectedSection: Section;
  selectedCategory: Category;
  employees: Employee[];
  data: MonthlyData[];
  onUpdateValue: (employeeId: string, month: number, value: number) => void;
  isMonthLocked: (month: number) => boolean;
  isEditMode: boolean;
}

const DataGrid: React.FC<Props> = ({ selectedSection, selectedCategory, employees, data, onUpdateValue, isMonthLocked, isEditMode }) => {
  const getValue = (employeeId: string, month: number) => {
    return data.find(d => 
      d.employeeId === employeeId && 
      d.month === month && 
      d.category === selectedCategory &&
      d.section === selectedSection
    )?.actual ?? 0;
  };

  // Fixed: use getTarget(cat, month, section, empId) instead of static target
  const getCellStyles = (val: number, mIdx: number, empId: string) => {
    const target = getTarget(selectedCategory, mIdx, selectedSection, empId);
    if (val === 0) return 'bg-white text-slate-400';
    if (val >= target) return 'bg-green-50 text-green-700 border-green-200';
    if (val >= target * 0.8) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  // Fixed: use getTarget(cat, month, section, empId) instead of static target
  const getInputStyles = (val: number, mIdx: number, locked: boolean, empId: string) => {
    const target = getTarget(selectedCategory, mIdx, selectedSection, empId);
    if (locked || !isEditMode) return 'bg-transparent text-slate-500 cursor-not-allowed opacity-60';
    if (val === 0) return 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500';
    if (val >= target) return 'bg-green-100/50 border-green-300 text-green-800';
    if (val >= target * 0.8) return 'bg-yellow-100/50 border-yellow-300 text-yellow-800';
    return 'bg-red-100/50 border-red-300 text-red-800';
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 backdrop-blur-sm">
            <th className="p-5 font-bold text-slate-600 sticky left-0 bg-slate-50 z-20 w-56 border-r border-slate-200">
              Colaborador
            </th>
            {MONTHS.map((month) => (
              <th key={month} className="p-4 font-bold text-slate-500 text-center min-w-[100px] border-r border-slate-100">
                {month.substring(0, 3)}
              </th>
            ))}
            <th className="p-4 font-bold text-indigo-700 text-center w-28 bg-indigo-50/50">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const rowTotal = MONTHS.reduce((acc, _, mIdx) => acc + getValue(employee.id, mIdx), 0);
            
            return (
              <tr key={employee.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                <td className="p-5 font-bold text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                  {employee.name}
                </td>
                {MONTHS.map((_, mIdx) => {
                  const val = getValue(employee.id, mIdx);
                  const locked = isMonthLocked(mIdx);
                  // Fixed: Added selectedSection and employee.id to getTarget call
                  const target = getTarget(selectedCategory, mIdx, selectedSection, employee.id);
                  
                  return (
                    <td 
                      key={`${employee.id}-${mIdx}`} 
                      className={`p-3 border-r border-slate-100 transition-all duration-300 ${getCellStyles(val, mIdx, employee.id)}`}
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <input
                          type="number"
                          value={val || ''}
                          disabled={locked || !isEditMode}
                          placeholder="0"
                          onChange={(e) => onUpdateValue(employee.id, mIdx, parseInt(e.target.value) || 0)}
                          className={`w-14 h-10 text-center rounded-lg border-2 transition-all font-black text-lg outline-none ${getInputStyles(val, mIdx, locked, employee.id)}`}
                        />
                        {val > 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">
                            {/* Fixed: Added selectedSection and employee.id to getTarget calls */}
                            {val >= getTarget(selectedCategory, mIdx, selectedSection, employee.id) ? 'Llegado' : val >= getTarget(selectedCategory, mIdx, selectedSection, employee.id) * 0.8 ? 'Cerca' : 'Lejos'}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="p-4 text-center border-l border-slate-100 bg-indigo-50/30 group-hover:bg-indigo-50 transition-colors">
                  <span className="text-xl font-black text-indigo-800">
                    {rowTotal}
                  </span>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase">Acumulado</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DataGrid;