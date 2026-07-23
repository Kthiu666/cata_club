/**
 * Pure utility functions for the Membresías y Pagos admin page.
 *
 * No React dependencies — pure functions for testability. Mirrors the
 * client-side pagination pattern established in members-utils.ts and
 * attendance-utils.ts.
 */

import type { PaymentValidationRequest } from "@/services/api";

/** Requests per page for the payment validation queue table. */
export const PAYMENTS_PAGE_SIZE = 10;

/**
 * Slice a (possibly already filtered) payment requests list to a single page.
 *
 * `page` is 1-indexed. Returns an empty array when `page` is beyond the
 * available data — never throws or wraps around.
 */
export function paginatePaymentRequests(
  requests: PaymentValidationRequest[],
  page: number,
  pageSize: number = PAYMENTS_PAGE_SIZE,
): PaymentValidationRequest[] {
  const start = (page - 1) * pageSize;
  return requests.slice(start, start + pageSize);
}

/**
 * Total number of pages for a given payment request count.
 *
 * Always returns at least 1 (never 0 pages, even for an empty list) so
 * "Página 1 de 1" is a valid state to render.
 */
export function getTotalPages(
  totalRequests: number,
  pageSize: number = PAYMENTS_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(totalRequests / pageSize));
}
