
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type SimulationRole = 'Abogado Defensor' | 'Fiscal' | 'Juez' | 'Testigo' | 'Perito' | 'Acusado' | 'Acusación' | 'Indefinido';
