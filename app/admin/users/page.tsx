"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";

interface AdminUser {
  id:            number;
  email:         string;
  name:          string;
  isAdmin:       boolean;
  isBlocked:     boolean;
  canCreateGame: boolean;
  createdAt:     string;
}

interface EditState {
  email: string;
  name:  string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users,    setUsers]    = useState<AdminUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [editing,  setEditing]  = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ email: "", name: "" });
  const [saving,   setSaving]   = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [token,    setToken]    = useState<string | null>(null);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) { router.replace("/"); return; }
    setToken(t);
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 403) { router.replace("/"); return; }
    if (res.ok) setUsers(await res.json());
    else setError("Не удалось загрузить список пользователей");
    setLoading(false);
  }, [token, router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function patch(id: number, data: Partial<{ isBlocked: boolean; canCreateGame: boolean; email: string; name: string }>) {
    if (!token) return;
    setSaving(true);
    setEditError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify(data),
    });
    if (res.ok) {
      const updated: AdminUser = await res.json();
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u));
      setEditing(null);
    } else {
      const body = await res.json().catch(() => ({}));
      setEditError(body.message ?? "Ошибка при сохранении");
    }
    setSaving(false);
  }

  function startEdit(user: AdminUser) {
    setEditing(user.id);
    setEditForm({ email: user.email, name: user.name });
    setEditError(null);
  }

  if (loading) return <Shell><p style={mutedStyle}>Загрузка…</p></Shell>;
  if (error)   return <Shell><p style={{ ...mutedStyle, color: "#dc2626" }}>{error}</p></Shell>;

  return (
    <Shell>
      <h1 style={headingStyle}>Управление участниками</h1>
      <p style={mutedStyle}>{users.length} пользователей</p>

      <div style={{ overflowX: "auto", marginTop: "24px" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Дата регистрации", "ID", "Email", "Имя", "Создание игр", "Статус", "Действия"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ background: user.isBlocked ? "#fef2f2" : "transparent" }}>

                {/* Date */}
                <td style={tdStyle}>
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </td>

                {/* ID */}
                <td style={{ ...tdStyle, color: "var(--muted)", fontFamily: "monospace" }}>
                  #{user.id}
                </td>

                {/* Email */}
                <td style={tdStyle}>
                  {editing === user.id
                    ? <input
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        style={inlineInputStyle}
                      />
                    : <span>{user.email}</span>
                  }
                </td>

                {/* Name */}
                <td style={tdStyle}>
                  {editing === user.id
                    ? <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        style={inlineInputStyle}
                      />
                    : <span>{user.name}</span>
                  }
                  {user.isAdmin && <span style={adminBadgeStyle}>admin</span>}
                </td>

                {/* canCreateGame toggle */}
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {user.isAdmin
                    ? <span style={mutedStyle}>—</span>
                    : <Toggle
                        value={user.canCreateGame}
                        onChange={(v) => patch(user.id, { canCreateGame: v })}
                        disabled={saving}
                      />
                  }
                </td>

                {/* Status */}
                <td style={tdStyle}>
                  {user.isAdmin
                    ? <span style={adminBadgeStyle}>superadmin</span>
                    : user.isBlocked
                      ? <span style={{ ...statusBadge, background: "#fef2f2", color: "#dc2626" }}>Заблокирован</span>
                      : <span style={{ ...statusBadge, background: "#f0fdf4", color: "#16a34a" }}>Активен</span>
                  }
                </td>

                {/* Actions */}
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  {user.isAdmin ? null : editing === user.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {editError && <p style={{ color: "#dc2626", fontFamily: "var(--font-ui)", fontSize: "12px", margin: 0 }}>{editError}</p>}
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          disabled={saving}
                          onClick={() => patch(user.id, { email: editForm.email, name: editForm.name })}
                          style={saveBtn}
                        >
                          {saving ? "…" : "Сохранить"}
                        </button>
                        <button onClick={() => setEditing(null)} style={cancelBtn}>Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => startEdit(user)} style={editBtn}>Изменить</button>
                      <button
                        disabled={saving}
                        onClick={() => patch(user.id, { isBlocked: !user.isBlocked })}
                        style={user.isBlocked ? unblockBtn : blockBtn}
                      >
                        {user.isBlocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

/* ─── Toggle ─────────────────────────────────────────────── */

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width:         "40px",
        height:        "22px",
        borderRadius:  "100px",
        border:        "none",
        cursor:        disabled ? "not-allowed" : "pointer",
        background:    value ? "#16a34a" : "#d1d5db",
        position:      "relative",
        transition:    "background 0.2s",
        flexShrink:    0,
      }}
    >
      <span style={{
        position:     "absolute",
        top:          "3px",
        left:         value ? "21px" : "3px",
        width:        "16px",
        height:       "16px",
        borderRadius: "50%",
        background:   "#fff",
        transition:   "left 0.2s",
      }} />
    </button>
  );
}

/* ─── Shell ──────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ flex: 1, background: "var(--surface)", padding: "40px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>{children}</div>
    </main>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: "24px",
  letterSpacing: "-0.4px", color: "var(--foreground)", margin: "0 0 4px",
};

const mutedStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)", margin: 0,
};

const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse",
  background: "#fff", borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-drop)", overflow: "hidden",
  fontFamily: "var(--font-ui)",
};

const thStyle: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left",
  fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.5px", color: "var(--muted)",
  borderBottom: "1px solid #f1f5f9", background: "#f8fafc",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px", fontSize: "14px", color: "var(--foreground)",
  borderBottom: "1px solid #f1f5f9", verticalAlign: "middle",
};

const inlineInputStyle: React.CSSProperties = {
  height: "30px", padding: "0 8px",
  border: "1.5px solid #e5e7eb", borderRadius: "6px",
  fontFamily: "var(--font-ui)", fontSize: "13px",
  color: "var(--foreground)", outline: "none", width: "100%",
};

const statusBadge: React.CSSProperties = {
  padding: "2px 8px", borderRadius: "100px",
  fontSize: "12px", fontWeight: 600,
};

const adminBadgeStyle: React.CSSProperties = {
  marginLeft: "6px", padding: "1px 6px", borderRadius: "100px",
  background: "#eff6ff", color: "#2563eb",
  fontSize: "11px", fontWeight: 700,
};

const baseActionBtn: React.CSSProperties = {
  padding: "5px 10px", borderRadius: "6px", border: "none",
  fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
  cursor: "pointer", transition: "opacity 0.12s",
};

const editBtn:    React.CSSProperties = { ...baseActionBtn, background: "#f1f5f9", color: "var(--foreground)" };
const blockBtn:   React.CSSProperties = { ...baseActionBtn, background: "#fef2f2", color: "#dc2626" };
const unblockBtn: React.CSSProperties = { ...baseActionBtn, background: "#f0fdf4", color: "#16a34a" };
const saveBtn:    React.CSSProperties = { ...baseActionBtn, background: "var(--primary)", color: "#fff" };
const cancelBtn:  React.CSSProperties = { ...baseActionBtn, background: "#f1f5f9", color: "var(--muted)" };
