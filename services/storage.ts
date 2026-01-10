
import { MonthlyData, MonthStatus } from '../types';

const DATA_KEY = 'monoproducto_performance_data';
const STATUS_KEY = 'monoproducto_month_status';

export const storage = {
  saveData: (data: MonthlyData[]) => {
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
  },
  loadData: (): MonthlyData[] => {
    const data = localStorage.getItem(DATA_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveStatus: (status: MonthStatus[]) => {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  },
  loadStatus: (): MonthStatus[] => {
    const status = localStorage.getItem(STATUS_KEY);
    return status ? JSON.parse(status) : [];
  }
};
