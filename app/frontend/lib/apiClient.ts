// ============================================================
// lib/apiClient.ts — Client HTTP centralisé
// Lit le token depuis le store Zustand (persist "auth-storage")
// ============================================================
import { useAuthStore } from "../store/useAuthStore";


const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Récupération du token ─────────────────────────────────────
// Zustand persist stocke sous la clé "auth-storage" → { state: { token } }
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

// ── Headers ───────────────────────────────────────────────────
function buildHeaders(withAuth = true): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (withAuth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Gestion des réponses ──────────────────────────────────────
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch { /* ignore */ }

    // 401 → déconnecter via le store Zustand
    if (response.status === 401 && typeof window !== "undefined") {
      // On importe dynamiquement pour éviter les imports circulaires
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }

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
  return handleResponse<T>(res);
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
  return handleResponse<T>(res);
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
  return handleResponse<T>(res);
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
  return handleResponse<T>(res);
}

export async function del<T>(endpoint: string, withAuth = true): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers: buildHeaders(withAuth),
  });
  return handleResponse<T>(res);
}

// Upload multipart (avatar, documents)
export async function uploadFile<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  //PAS de Content-Type : le browser le pose avec le boundary multipart
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<T>(res);
}