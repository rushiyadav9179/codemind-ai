export interface IndexStatus {
  repositoryId: string;
  analysisRunId: string | null;
  indexedUnits: number;
  skippedUnits: number;
  embeddingModel: string | null;
  status: 'indexed' | 'not_indexed' | 'indexing';
}

export interface SearchResult {
  id: string;
  repositoryId: string;
  analysisRunId: string;
  analyzedFileId: string;
  filePath: string;
  unitKind: string;
  unitName: string;
  startLine: number;
  endLine: number;
  contentPreview: string;
  embeddingModel: string;
  score: number;
}
