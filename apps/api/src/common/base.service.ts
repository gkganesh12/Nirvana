import { normalizePagination, PaginationParams } from './pagination';

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const buildPaginatedResult = <T>(
  data: T[],
  total: number,
  params?: PaginationParams,
): PaginatedResult<T> => {
  const { page, pageSize } = normalizePagination(params);
  return { data, page, pageSize, total };
};
