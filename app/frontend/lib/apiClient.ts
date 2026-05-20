// ============================================================
// lib/apiClient.ts — Client HTTP centralisé
// Refresh automatique du JWT sur 401
// ============================================================

import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Tokens ────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch { return null; }
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.refreshToken ?? null;
  } catch { return null; }
}

// ── Refresh ───────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  console.log("tentative de refrsh ", !!refreshToken);
  
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) throw new Error("Refresh échoué");

    const data = await res.json();
     // Format 1: { success: true, accessToken, refreshToken }
    // Format 2: { accessToken, refreshToken }
    const accessToken = data.accessToken ?? data.data?.accessToken;
    const newRefreshToken = data.refreshToken ?? data.data?.refreshToken ?? refreshToken;

    if (!accessToken) {
      throw new Error("Format de réponse invalide");
    }

    // Mettre à jour le store avec les nouveaux tokens
    useAuthStore.getState().setTokens(accessToken, newRefreshToken);

    return accessToken;
  } catch {
    // Refresh échoué → déconnexion
    useAuthStore.getState().logout();
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }
}

// ── Headers ───────────────────────────────────────────────────

function buildHeaders(withAuth = true, token?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (withAuth) {
    const t = token ?? getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  return headers;
}

// ── Gestion des réponses ──────────────────────────────────────

async function handleResponse<T>(
  response: Response,
  retry?: () => Promise<T>
): Promise<T> {
  if (!response.ok) {
    // 401 → tenter le refresh
    if (response.status === 401 && retry && typeof window !== "undefined") {
      if (isRefreshing) {
        // Attendre que le refresh en cours se termine
        return new Promise((resolve) => {
          refreshQueue.push(async (newToken) => {
            resolve(await retry());
          });
        });
      }

      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      // Débloquer la queue
      refreshQueue.forEach((cb) => cb(newToken ?? ""));
      refreshQueue = [];

      if (newToken) return retry();
    }

    let message = `Erreur ${response.status}`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch { /* ignore */ }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ── Méthodes HTTP ─────────────────────────────────────────────

export async function get<T>(endpoint: string, withAuth = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: buildHeaders(withAuth),
  });
  return handleResponse<T>(res, () => get<T>(endpoint, withAuth));
}

export async function post<T>(
  endpoint: string,
  body: unknown,
  withAuth = true
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: buildHeaders(withAuth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, () => post<T>(endpoint, body, withAuth));
}

export async function put<T>(
  endpoint: string,
  body: unknown,
  withAuth = true
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: buildHeaders(withAuth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, () => put<T>(endpoint, body, withAuth));
}

export async function patch<T>(
  endpoint: string,
  body: unknown,
  withAuth = true
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers: buildHeaders(withAuth),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res, () => patch<T>(endpoint, body, withAuth));
}

export async function del<T>(endpoint: string, withAuth = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: buildHeaders(withAuth),
  });
  return handleResponse<T>(res, () => del<T>(endpoint, withAuth));
}

export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<T>(res, () => uploadFile<T>(endpoint, formData));
}