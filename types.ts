
export type Section = 'Sanitario' | 'Cocinas' | 'Madera' | 'EERR' | 'Jardin';

export type Category = 
  | 'Mamparas' | 'Mediciones (Reform, CBxP y CPxP)' | 'Muebles de Baño' // Sanitario Esp
  | 'CBxP + PxP' | 'Reformas'                         // Sanitario Proy
  | 'Encimeras de piedra' | 'Armarios' | 'Mediciones'   // Cocinas All
  | 'Reforma Cocinas'                                  // Cocinas Proy
  | 'Puertas de Entrada' | 'Puertas de Paso'          // Madera
  | 'Placas Solares' | 'Aerotermia' | 'Baterías'       // EERR Esp
  | 'Instalación EERR'                                 // EERR Proy
  | 'Césped Artificial' | 'Cercados' | 'Riego'         // Jardin Esp
  | 'Reformas Jardín';                                // Jardin Proy

export interface Employee {
  id: string;
  name: string;
}

export interface MonthlyData {
  employeeId: string;
  month: number; // 0-11
  category: Category;
  section: Section;
  actual: number;
}

export interface MonthStatus {
  month: number;
  section: Section;
  isFilled: boolean;
}

export const CATEGORY_TARGETS: Record<Category, number> = {
  'Mamparas': 10,
  'Mediciones (Reform, CBxP y CPxP)': 2,
  'Muebles de Baño': 10,
  'CBxP + PxP': 10,
  'Reformas': 10,
  'Encimeras de piedra': 2,
  'Armarios': 4,
  'Mediciones': 10,
  'Reforma Cocinas': 9,
  'Puertas de Entrada': 10,
  'Puertas de Paso': 10,
  'Placas Solares': 5,
  'Aerotermia': 3,
  'Baterías': 2,
  'Instalación EERR': 4,
  'Césped Artificial': 8,
  'Cercados': 6,
  'Riego': 10,
  'Reformas Jardín': 3
};

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const CATEGORY_GROUPS = {
  SAN_VEND_ESP: {
    title: 'Vend Especialista',
    categories: ['Mamparas', 'Muebles de Baño', 'Mediciones (Reform, CBxP y CPxP)'] as Category[],
    employees: [
      { id: 's1', name: 'Pablo de Ramos' },
      { id: 's2', name: 'Jose Navarro' },
      { id: 's3', name: 'Alexandra Garcia' },
      { id: 's4', name: 'Begoña Roig' },
      { id: 's5', name: 'Blanca Malonda' },
      { id: 's6', name: 'Andrea Grau' }
    ]
  },
  SAN_VEND_PROJ: {
    title: 'Vend Proyecto',
    categories: ['CBxP + PxP', 'Reformas'] as Category[],
    employees: [
      { id: 'p1', name: 'Miguel Angel' },
      { id: 'p2', name: 'Cristina Moreno' }
    ]
  },
  COC_VEND_ESP: {
    title: 'Vend Especialista',
    categories: ['Encimeras de piedra', 'Armarios', 'Mediciones'] as Category[],
    employees: [
      { id: 'ce1', name: 'Laura Llopis' },
      { id: 'ce2', name: 'Jorge Castella' },
      { id: 'ce3', name: 'Analía Paredes' },
      { id: 'ce4', name: 'Raquel Company' },
      { id: 'ce5', name: 'May Cerezo' },
      { id: 'ce6', name: 'Silvia Sanchez' },
      { id: 'ce7', name: 'Daniel Villar' }
    ]
  },
  COC_VEND_PROJ: {
    title: 'Vend Proyecto',
    categories: ['Encimeras de piedra', 'Armarios', 'Mediciones', 'Reforma Cocinas'] as Category[],
    employees: [
      { id: 'cp1', name: 'Raquel Company' },
      { id: 'cp2', name: 'Lara Palmira' },
      { id: 'cp3', name: 'May Cerezo' }
    ]
  },
  EERR_VEND_ESP: {
    title: 'Vend Especialista',
    categories: ['Placas Solares', 'Aerotermia', 'Baterías'] as Category[],
    employees: [
      { id: 'e1', name: 'Carlos Sol' },
      { id: 'e2', name: 'Marta Viento' }
    ]
  },
  EERR_VEND_PROJ: {
    title: 'Vend Proyecto',
    categories: ['Instalación EERR'] as Category[],
    employees: [
      { id: 'ep1', name: 'Roberto Voltio' }
    ]
  },
  JARDIN_VEND_ESP: {
    title: 'Vend Especialista',
    categories: ['Césped Artificial', 'Cercados', 'Riego'] as Category[],
    employees: [
      { id: 'j1', name: 'Ana Pradera' },
      { id: 'j2', name: 'Luis Riego' }
    ]
  },
  JARDIN_VEND_PROJ: {
    title: 'Vend Proyecto',
    categories: ['Reformas Jardín'] as Category[],
    employees: [
      { id: 'jp1', name: 'Sofía Paisaje' }
    ]
  }
};

export const SECTION_CONFIG: Record<Section, { categories: Category[], employees: Employee[] }> = {
  Sanitario: {
    categories: [
      ...CATEGORY_GROUPS.SAN_VEND_ESP.categories,
      ...CATEGORY_GROUPS.SAN_VEND_PROJ.categories
    ],
    employees: [
      ...CATEGORY_GROUPS.SAN_VEND_ESP.employees,
      ...CATEGORY_GROUPS.SAN_VEND_PROJ.employees
    ]
  },
  Cocinas: {
    categories: [
      'Encimeras de piedra', 'Armarios', 'Mediciones', 'Reforma Cocinas'
    ],
    employees: [
      ...CATEGORY_GROUPS.COC_VEND_ESP.employees,
      ...CATEGORY_GROUPS.COC_VEND_PROJ.employees
    ]
  },
  Madera: {
    categories: ['Puertas de Entrada', 'Puertas de Paso'],
    employees: [
      { id: 'm1', name: 'Colaborador 1' },
      { id: 'm2', name: 'Colaborador 2' },
      { id: 'm3', name: 'Colaborador 3' },
      { id: 'm4', name: 'Colaborador 4' }
    ]
  },
  EERR: {
    categories: [...CATEGORY_GROUPS.EERR_VEND_ESP.categories, ...CATEGORY_GROUPS.EERR_VEND_PROJ.categories],
    employees: [...CATEGORY_GROUPS.EERR_VEND_ESP.employees, ...CATEGORY_GROUPS.EERR_VEND_PROJ.employees]
  },
  Jardin: {
    categories: [...CATEGORY_GROUPS.JARDIN_VEND_ESP.categories, ...CATEGORY_GROUPS.JARDIN_VEND_PROJ.categories],
    employees: [...CATEGORY_GROUPS.JARDIN_VEND_ESP.employees, ...CATEGORY_GROUPS.JARDIN_VEND_PROJ.employees]
  }
};

export const SECTIONS: Section[] = ['Sanitario', 'Cocinas', 'Madera', 'EERR', 'Jardin'];
