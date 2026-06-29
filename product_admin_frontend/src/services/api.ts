/**
 * API Client — Product Admin Frontend
 *
 * Centralised HTTP client that switches between local mock Route Handlers
 * and the real Python backend based on environment variables.
 *
 * Environment variables (NEXT_PUBLIC_*):
 *   NEXT_PUBLIC_USE_MOCKS  — "true" to use local /api/* Route Handlers
 *   NEXT_PUBLIC_API_URL    — Base URL of the real backend (used when mocks are off)
 *
 * ⚠️ IMPORTANT: NEXT_PUBLIC_* values are baked into the client bundle at
 *    build time. Changing them requires restarting the dev server or
 *    rebuilding for production. They are NOT read at runtime on the client.
 *
 * Timeout: every request aborts after 10 seconds by default (see `request`).
 *          If the caller provides their own `signal`, the caller manages
 *          timeout instead — so provide one if you need timeout guarantees.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: string;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}

export interface ApiError {
  message: string;
  status: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolve the API base URL at call time.
 *
 * Using a function instead of a module-level constant makes the behaviour
 * predictable in test environments where env vars may be set per-test.
 *
 * NEXT_PUBLIC_* values are replaced at build time by Next.js. Changing
 * .env.local requires restarting `pnpm dev` or rebuilding for production.
 */
function getBaseUrl(): string {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  return useMocks ? "" : apiUrl;
}

/**
 * Resolve the correct endpoint for the current mode.
 *
 * In mock mode, Next.js Route Handlers live under /api/ so the full path
 * must start with /api/... In real backend mode, NEXT_PUBLIC_API_URL
 * already includes the /api/v1 prefix, so the resource path is appended
 * directly (e.g. "/products").
 *
 * @param resource — the resource path, e.g. "/products" or "/products/:id"
 */
function apiEndpoint(resource: string): string {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
  return useMocks ? `/api${resource}` : resource;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Merge one or more HeadersInit sources into a plain object.
 *
 * Handles every valid HeadersInit type:
 *  - Record<string, string>
 *  - [string, string][]   (tuples)
 *  - Headers instance
 *  - undefined (skipped)
 */
function toPlainHeaders(...sources: (HeadersInit | undefined)[]): Record<string, string> {
  const merged = new Headers();
  for (const source of sources) {
    if (!source) continue;
    const headers = new Headers(source);
    for (const [key, value] of headers.entries()) {
      merged.set(key, value);
    }
  }
  const result: Record<string, string> = {};
  merged.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`;

  // Timeout handling: if the caller provides their own AbortSignal they are
  // responsible for timeout; otherwise we set a default 10 s timeout.
  let controller: AbortController | undefined;
  let signal: AbortSignal;

  if (options.signal) {
    signal = options.signal;
  } else {
    controller = new AbortController();
    signal = controller.signal;
  }

  const timeoutId = controller !== undefined ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  const headers = toPlainHeaders(
    { "Content-Type": "application/json" },
    options.headers,
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal,
      headers,
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      try {
        const errorBody = await response.json();
        message = errorBody.message || message;
      } catch {
        // ignore parse errors — use default message
      }
      throw new ApiClientError(message, response.status);
    }

    return response.json() as Promise<T>;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

/**
 * Fetch all products.
 */
export async function fetchProducts(): Promise<Product[]> {
  return request<Product[]>(apiEndpoint("/products"));
}

/**
 * Fetch a single product by ID.
 */
export async function fetchProductById(id: string): Promise<Product> {
  return request<Product>(apiEndpoint(`/products/${id}`));
}

/**
 * Create a new product.
 */
export async function createProduct(
  data: CreateProductDTO,
): Promise<Product> {
  return request<Product>(apiEndpoint("/products"), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing product.
 */
export async function updateProduct(
  id: string,
  data: UpdateProductDTO,
): Promise<Product> {
  return request<Product>(apiEndpoint(`/products/${id}`), {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a product.
 */
export async function deleteProduct(
  id: string,
): Promise<{ message: string }> {
  return request<{ message: string }>(apiEndpoint(`/products/${id}`), {
    method: "DELETE",
  });
}
