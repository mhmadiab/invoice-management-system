import type { Page } from "@/types/context";

export function pagination(page: Page, totalItems: number) {
  return { page: page.page, pageSize: page.pageSize, totalItems, totalPages: Math.ceil(totalItems / page.pageSize) };
}

export function paginate<T>(rows: T[], page: Page) {
  return { data: rows.slice((page.page - 1) * page.pageSize, page.page * page.pageSize), pagination: pagination(page, rows.length) };
}
