
import React from 'react';
import { 
  ShowerHead, Utensils, TreeDeciduous, Zap, Flower2 
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
}

// Fixed: Added exported constants required by other components
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const CATEGORY_TARGETS: Record<string, number> = {
  'Mamparas': 10, 'Mediciones (Reform, CBxP y CPxP)': 2, 'Muebles de Baño': 10,
  'CBxP + PxP': 10, 'Reformas': 10, 'Encimeras de piedra': 2,
  'Armarios': 4, 'Mediciones': 10, 'Reforma Cocinas': 9,
  'Puertas de Entrada': 10, 'Puertas de Paso': 10,
  'Placas Solares': 5, 'Aerotermia': 3, 'Baterías': 2, 'Instalación EERR': 4,
  'Césped Artificial': 8, 'Cercados': 6, 'Riego': 10, 'Reformas Jardín': 3
};

export const CATEGORY_GROUPS: Record<string, CategoryGroup> = {
  SAN_VEND_ESP: {
    title: 'Vendedor Especialista',
    categories: ['Mamparas', 'Muebles de Baño', 'Mediciones (Reform, CBxP y CPxP)'],
    employees: [
      { id: 's1', name: 'Pablo de Ramos' }, { id: 's2', name: 'Jose Navarro' },
      { id: 's3', name: 'Alexandra Garcia' }, { id: 's4', name: 'Begoña Roig' },
      { id: 's5', name: 'Blanca Malonda' }, { id: 's6', name: 'Andrea Grau' }
    ]
  },
  SAN_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['CBxP + PxP', 'Reformas'],
    employees: [{ id: 'p1', name: 'Miguel Angel' }, { id: 'p2', name: 'Cristina Moreno' }]
  },
  COC_VEND_ESP: {
    title: 'Vendedor Especialista',
    categories: ['Encimeras de piedra', 'Armarios', 'Mediciones'],
    employees: [
      { id: 'ce1', name: 'Laura Llopis' }, { id: 'ce2', name: 'Jorge Castella' },
      { id: 'ce3', name: 'Analía Paredes' }, { id: 'ce4', name: 'Raquel Company' },
      { id: 'ce5', name: 'May Cerezo' }, { id: 'ce6', name: 'Silvia Sanchez' }, { id: 'ce7', name: 'Daniel Villar' }
    ]
  },
  COC_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['Encimeras de piedra', 'Armarios', 'Mediciones', 'Reforma Cocinas'],
    employees: [
      { id: 'cp1', name: 'Raquel Company' }, { id: 'cp2', name: 'Lara Palmira' }, { id: 'cp3', name: 'May Cerezo' }
    ]
  },
  EERR_VEND_ESP: {
    title: 'Vendedor Especialista',
    categories: ['Placas Solares', 'Aerotermia', 'Baterías'],
    employees: [{ id: 'e1', name: 'Carlos Sol' }, { id: 'e2', name: 'Marta Viento' }]
  },
  EERR_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['Instalación EERR'],
    employees: [{ id: 'ep1', name: 'Roberto Voltio' }]
  },
  JARDIN_VEND_ESP: {
    title: 'Vendedor Especialista',
    categories: ['Césped Artificial', 'Cercados', 'Riego'],
    employees: [{ id: 'j1', name: 'Ana Pradera' }, { id: 'j2', name: 'Luis Riego' }]
  },
  JARDIN_VEND_PROJ: {
    title: 'Vendedor Proyecto',
    categories: ['Reformas Jardín'],
    employees: [{ id: 'jp1', name: 'Sofía Paisaje' }]
  }
};

export const SECTION_CONFIG: any = {
  Sanitario: {
    icon: React.createElement(ShowerHead, { size: 18 }),
    categories: [...CATEGORY_GROUPS.SAN_VEND_ESP.categories, ...CATEGORY_GROUPS.SAN_VEND_PROJ.categories],
    employees: [...CATEGORY_GROUPS.SAN_VEND_ESP.employees, ...CATEGORY_GROUPS.SAN_VEND_PROJ.employees]
  },
  Cocinas: {
    icon: React.createElement(Utensils, { size: 18 }),
    categories: ['Encimeras de piedra', 'Armarios', 'Mediciones', 'Reforma Cocinas'],
    employees: [...CATEGORY_GROUPS.COC_VEND_ESP.employees, ...CATEGORY_GROUPS.COC_VEND_PROJ.employees]
  },
  Madera: {
    icon: React.createElement(TreeDeciduous, { size: 18 }),
    categories: ['Puertas de Entrada', 'Puertas de Paso'],
    employees: [
      { id: 'm1', name: 'Colaborador 1' }, { id: 'm2', name: 'Colaborador 2' },
      { id: 'm3', name: 'Colaborador 3' }, { id: 'm4', name: 'Colaborador 4' }
    ]
  },
  EERR: {
    icon: React.createElement(Zap, { size: 18 }),
    categories: [...CATEGORY_GROUPS.EERR_VEND_ESP.categories, ...CATEGORY_GROUPS.EERR_VEND_PROJ.categories],
    employees: [...CATEGORY_GROUPS.EERR_VEND_ESP.employees, ...CATEGORY_GROUPS.EERR_VEND_PROJ.employees]
  },
  Jardin: {
    icon: React.createElement(Flower2, { size: 18 }),
    categories: [...CATEGORY_GROUPS.JARDIN_VEND_ESP.categories, ...CATEGORY_GROUPS.JARDIN_VEND_PROJ.categories],
    employees: [...CATEGORY_GROUPS.JARDIN_VEND_ESP.employees, ...CATEGORY_GROUPS.JARDIN_VEND_PROJ.employees]
  }
};
