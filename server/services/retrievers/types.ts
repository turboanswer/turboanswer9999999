export type Source = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
  provider?: string;
  score?: number;
};

export interface Retriever {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string, limit?: number): Promise<Source[]>;
}
