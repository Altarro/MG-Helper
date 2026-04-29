export interface GeneratorEntryRecord {
  id: string;
  value: string;
  weight: number;
  tags: string[];
  isActive: boolean;
}

export interface GeneratorTableRecord {
  id: string;
  name: string;
  type: string;
  entries: GeneratorEntryRecord[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratorPackRecord {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  isActive: boolean;
  tables: GeneratorTableRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface GeneratorRollLogRecord {
  id: string;
  campaignId: string;
  sessionId?: string | null;
  packId: string;
  kind: string;
  resultText: string;
  sourceTableIds: string[];
  createdAt: string;
}

