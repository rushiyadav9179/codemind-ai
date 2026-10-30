export type AnalysisStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface CodeImport {
  source: string;
  isRelative: boolean;
  specifiers: string[];
  defaultImport?: string;
  isTypeOnly?: boolean;
}

export interface CodeExport {
  name: string;
  isDefault: boolean;
  isTypeOnly?: boolean;
}

export interface FunctionSymbol {
  name: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  line: number;
}

export interface ClassProperty {
  name: string;
  type?: string;
  isStatic?: boolean;
  visibility?: 'public' | 'protected' | 'private';
}

export interface ClassMethod {
  name: string;
  parameters: string[];
  returnType?: string;
  isAsync: boolean;
  isStatic?: boolean;
  visibility?: 'public' | 'protected' | 'private';
}

export interface ClassSymbol {
  name: string;
  extends?: string;
  implements?: string[];
  methods: ClassMethod[];
  properties: ClassProperty[];
  isExported: boolean;
  line: number;
}

export interface TypeSymbol {
  name: string;
  kind: 'interface' | 'type';
  isExported: boolean;
  line: number;
}

export interface FileSymbols {
  functions: FunctionSymbol[];
  classes: ClassSymbol[];
  types: TypeSymbol[];
}

export interface AnalyzedFileSummary {
  id: string;
  analysisRunId: string;
  filePath: string;
  language: string;
  lineCount: number;
  codeLineCount: number;
  importCount: number;
  exportCount: number;
  symbolCount: number;
  hasErrors: boolean;
}

export interface AnalyzedFileDetail extends AnalyzedFileSummary {
  imports: CodeImport[];
  exports: CodeExport[];
  symbols: FileSymbols;
  dependencies: string[];
}

export interface AnalysisSummary {
  totalFiles: number;
  totalLines: number;
  totalCodeLines: number;
  languages: Record<string, number>;
  totalFunctions: number;
  totalClasses: number;
  totalTypes: number;
  internalDependencyCount: number;
  externalDependencyCount: number;
  topExternalDependencies: Array<{ name: string; count: number }>;
}

export interface AnalysisRun {
  id: string;
  repositoryId: string;
  status: AnalysisStatus;
  totalFiles: number;
  totalLines: number;
  summary: AnalysisSummary | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface IngestFileInput {
  filePath: string;
  content: string;
}

export interface IngestBatchInput {
  files: IngestFileInput[];
}

export interface DependencyEdge {
  source: string;
  target: string;
  isExternal: boolean;
}

export interface DependencyGraph {
  nodes: Array<{ id: string; label: string; language?: string; isExternal?: boolean }>;
  edges: DependencyEdge[];
}
