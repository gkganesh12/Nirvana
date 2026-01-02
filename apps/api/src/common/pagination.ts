export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export const normalizePagination = (params?: PaginationParams) => {
  const page = Math.max(params?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params?.pageSize ?? 25, 1), 100);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
};
