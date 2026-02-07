import React from 'react';
import { 
  ShowerHead, Utensils, Ruler, Archive, ArrowRightLeft, Hammer, Gem, DoorClosed, ShoppingCart, BookOpen, SmilePlus, Target, TreeDeciduous, Zap, Flower2
} from 'lucide-react';

export type Section = 'Sanitario' | 'Cocinas' | 'Madera' | 'EERR' | 'Jardin';

export type Category = string;

export interface Employee {
  id: string;
  name: string;
}

export interface MonthlyData {
  employeeId: string;
  month: number;
  category: string;
  section: Section;
  actual: number;
}

export interface MonthStatus {
  month: number;
  section: Section;
  isFilled: boolean;
}

export interface CategoryGroup {
  title: string;
  categories: string[];
  employees: Employee[];
  isSpecialist?: boolean;
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Definición de bloques estratégicos principales para perfiles especialistas
export const STRATEGIC_BLOCKS = ['Cifra de Venta (%Crec)', 'Formacion Horas', 'NPS', 'Instalaciones'];

// Sub-categorías para el bloque de Instalaciones (Solo para Especialistas)
export const INSTALLATION_SUB_CATEGORIES: Record<string, string[]> = {
  'Sanitario': ['MAMPARAS', 'MUEBLES', 'MEDICIONES'],
  'Cocinas': ['Mediciones', 'Armarios'],
  'EERR': ['SPLIT'],
  'Madera': [],
  'Jardin': []
};

// Objetivos generales (valor_max del CSV)
export const CATEGORY_TARGETS: Record<string, number | number[]> = {
  // Sanitario
  'MAMPARAS': [3, 3, 4, 4, 5, 5, 5, 6, 4, 6, 3, 4], 
  'MUEBLES': [4, 3, 4, 4, 4, 5, 5, 4, 4, 4, 4, 3],
  'MEDICIONES': [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  'REFORMA': [4, 4, 5, 6, 6, 5, 5, 4, 6, 6, 5, 4],
  'CBxP + PxP': [8, 9, 9, 10, 10, 9, 9, 9, 9, 9, 8, 6],
  // Cocinas
  'Mediciones': 10,
  'Armarios': 4,
  'Muebles': [12, 12, 14, 13, 15, 10, 11, 5, 8, 6, 3, 3],
  'Encimeras de Piedra': [9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 9],
  // Madera
  'SUELO VINILICO': [4, 4, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
  'PUERTAS PASO': [16, 12, 16, 12, 17, 13, 28, 15, 8, 10, 10, 16],
  'SUELO LAMINADO': [1, 1, 1, 1, 2, 2, 2, 3, 2, 2, 2, 2],
  'VENTANAS': [8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9],
  'TOLDOS': [0, 0, 0, 0, 0, 6, 7, 7, 3, 2, 2, 2],
  // EERR
  'CONDUCTOS': 3,
  'ESTUFAS+INSERT': [2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
  'SPLIT': [14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  // Jardin
  'CESPED': [2, 2, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4],
  'PERGOLAS': [2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3],
  'SUELO EXT': [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  // Estratégicos (Base)
  'Cifra de Venta (%Crec)': 7.0, 
  'Formacion Horas': 3.0, 
  'NPS': 70
};

// Objetivos específicos por empleado (Cargados desde CSV)
export const EMPLOYEE_SPECIFIC_TARGETS: Record<string, Record<string, number[]>> = {
  'p1': { // Miguel Herrera
    'MAMPARAS': [10, 15, 14, 16, 15, 17, 20, 18, 16, 18, 9, 8],
    'REFORMA': [4, 4, 5, 6, 6, 5, 5, 4, 6, 6, 5, 4],
    'CBxP + PxP': [8, 9, 9, 10, 10, 9, 9, 9, 9, 9, 8, 6]
  },
  'p2': { // Cristina Moreno
    'MAMPARAS': [10, 10, 10, 11, 14, 15, 16, 12, 9, 8, 7, 6],
    'REFORMA': [4, 4, 5, 6, 6, 5, 5, 4, 6, 6, 5, 4],
    'CBxP + PxP': [8, 9, 9, 10, 10, 9, 9, 9, 9, 9, 8, 6]
  },
  'mp1': { // Jorge Fuster
    'PUERTAS ENTRADA': [9, 9, 8, 8, 10, 11, 11, 11, 10, 8, 8, 8]
  },
  'mp2': { // Frank Femenía
    'PUERTAS ENTRADA': [7, 7, 8, 8, 8, 9, 9, 9, 9, 7, 7, 7]
  }
};

export const getTarget = (cat: string, mIdx: number, section: Section, empId?: string): number => {
  if (empId && EMPLOYEE_SPECIFIC_TARGETS[empId] && EMPLOYEE_SPECIFIC_TARGETS[empId][cat]) {
    return EMPLOYEE_SPECIFIC_TARGETS[empId][cat][mIdx] ?? 0;
  }
  
  if (cat === 'Cifra de Venta (%Crec)') {
    return section === 'Cocinas' ? 11.0 : 7.0;
  }
  
  const target = CATEGORY_TARGETS[cat];
  if (Array.isArray(target)) return target[mIdx] ?? 0;
  return (target as number) ?? 0;
};

export const calculateStrategicAchievement = (cat: string, value: number, monthsCount: number = 1, section: string = 'Sanitario'): number => {
  if (cat === 'Cifra de Venta (%Crec)') {
    const goal = section === 'Cocinas' ? 11.0 : 7.0;
    // Si el valor es negativo, devolvemos 0% de cumplimiento visual
    if (value < 0) return 0;
    return Math.min(100, (value / goal) * 100);
  }
  if (cat === 'Formacion Horas') {
    const annualGoal = 3.0 * 12; 
    const annualThreshold = 1.5 * 12; 
    const currentGoal = (annualGoal / 12) * monthsCount;
    const currentThreshold = (annualThreshold / 12) * monthsCount;
    if (value < currentThreshold) return 0;
    if (value >= currentGoal) return 100;
    return Math.min(100, Math.max(0, ((value - currentThreshold) / (currentGoal - currentThreshold)) * 100));
  }
  if (cat === 'NPS') {
    if (value < 60) return 0; 
    if (value >= 70) return 100; 
    return Math.min(100, Math.max(0, ((value - 60) / (70 - 60)) * 100));
  }
  return 0;
};

export const CATEGORY_GROUPS: Record<string, CategoryGroup> = {
  SAN_VEND_ESP: {
    title: 'Vendedor Especialista',
    isSpecialist: true,
    categories: [...STRATEGIC_BLOCKS, 'MAMPARAS', 'MUEBLES', 'MEDICIONES'],
    employees: [
      { id: 's1', name: 'Andrea Grau' }, { id: 's2', name: 'Pablo de Ramos' },
      { id: 's3', name: 'Jose Navarro' }, { id: 's4', name: 'Alexandra Garcia' },
      { id: 's5', name: 'Begoña Roig' }, { id: 's6', name: 'Blanca Malonda' }
    ]
  },
  SAN_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['MAMPARAS', 'REFORMA', 'CBxP + PxP'],
    employees: [
      { id: 'p1', name: 'Miguel Herrera' }, { id: 'p2', name: 'Cristina Moreno' }
    ]
  },
  COC_VEND_ESP: {
    title: 'Vendedor Especialista',
    isSpecialist: true,
    categories: [...STRATEGIC_BLOCKS, 'Mediciones', 'Armarios'],
    employees: [
      { id: 'ce1', name: 'Laura Llopis' }, { id: 'ce2', name: 'Jorge Castella' },
      { id: 'ce3', name: 'Analía Paredes' }, { id: 'ce4', name: 'Silvia Sanchez' },
      { id: 'ce5', name: 'Daniel Villar' }
    ]
  },
  COC_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['Muebles', 'Encimeras de Piedra', 'Armarios', 'Mediciones'],
    employees: [
      { id: 'cp1', name: 'Raquel Company' }, { id: 'cp2', name: 'May Cerezo' }, { id: 'cp3', name: 'Lara Palmira' }
    ]
  },
  MAD_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['SUELO VINILICO', 'PUERTAS PASO', 'PUERTAS ENTRADA', 'SUELO LAMINADO', 'VENTANAS', 'TOLDOS'],
    employees: [
      { id: 'mp1', name: 'Jorge Fuster' }, { id: 'mp2', name: 'Frank Femenía' }
    ]
  },
  EERR_VEND_ESP: {
    title: 'Vendedor Especialista',
    isSpecialist: true,
    categories: [...STRATEGIC_BLOCKS, 'SPLIT'],
    employees: [
      { id: 'ee1', name: 'Edgar Martinez' }, { id: 'ee2', name: 'Christian Perez' }
    ]
  },
  EERR_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['CONDUCTOS', 'ESTUFAS+INSERT', 'SPLIT'],
    employees: [
      { id: 'ep1', name: 'Raquel Hernandez' }, { id: 'ep2', name: 'Natasha' }
    ]
  },
  JARDIN_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['CESPED', 'PERGOLAS', 'SUELO EXT'],
    employees: [
      { id: 'jp1', name: 'Alberto' }
    ]
  }
};

export const SECTION_CONFIG: any = {
  Sanitario: {
    icon: React.createElement(ShowerHead, { size: 18 }),
    categories: Array.from(new Set([...CATEGORY_GROUPS.SAN_VEND_ESP.categories, ...CATEGORY_GROUPS.SAN_VEND_PROJ.categories])),
    employees: [...CATEGORY_GROUPS.SAN_VEND_ESP.employees, ...CATEGORY_GROUPS.SAN_VEND_PROJ.employees]
  },
  Cocinas: {
    icon: React.createElement(Utensils, { size: 18 }),
    categories: Array.from(new Set([...CATEGORY_GROUPS.COC_VEND_ESP.categories, ...CATEGORY_GROUPS.COC_VEND_PROJ.categories])),
    employees: [...CATEGORY_GROUPS.COC_VEND_ESP.employees, ...CATEGORY_GROUPS.COC_VEND_PROJ.employees]
  },
  Madera: {
    icon: React.createElement(TreeDeciduous, { size: 18 }),
    categories: CATEGORY_GROUPS.MAD_VEND_PROJ.categories,
    employees: CATEGORY_GROUPS.MAD_VEND_PROJ.employees
  },
  EERR: {
    icon: React.createElement(Zap, { size: 18 }),
    categories: Array.from(new Set([...CATEGORY_GROUPS.EERR_VEND_ESP.categories, ...CATEGORY_GROUPS.EERR_VEND_PROJ.categories])),
    employees: [...CATEGORY_GROUPS.EERR_VEND_ESP.employees, ...CATEGORY_GROUPS.EERR_VEND_PROJ.employees]
  },
  Jardin: {
    icon: React.createElement(Flower2, { size: 18 }),
    categories: CATEGORY_GROUPS.JARDIN_VEND_PROJ.categories,
    employees: CATEGORY_GROUPS.JARDIN_VEND_PROJ.employees
  }
};