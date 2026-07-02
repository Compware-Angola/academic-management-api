 export type QueryConditions = {
  clauses: string[];
  params: Record<string, any>;
};

 export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}