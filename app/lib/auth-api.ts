export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: number; email: string; name: string; isAdmin: boolean; canCreateGame: boolean };
}

export interface ApiError {
  error: string;
  message: string;
}

async function request<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw data as ApiError;
  }

  return data as T;
}

export async function apiRegister(email: string, password: string, name: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", { email, password, name });
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", { email, password });
}

export function saveTokens(data: AuthResponse): void {
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("refresh_token", data.refresh_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  window.dispatchEvent(new Event("authchange"));
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.dispatchEvent(new Event("authchange"));
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}
