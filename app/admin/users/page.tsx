"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAdminUsers, updateAdminUserStatus } from "@/lib/api/admin";
import { UserAccount, UserAccountStatus } from "@/types/admin";
import { UserRole } from "@/types/user";
import {
  PageHeader,
  Status,
  Crumb,
  EditorialTable,
  Placeholder,
} from "@/components/ui/editorial";
import { FormDropdown } from "@/components/FormDropdown";

const roleLabels: Record<UserRole, string> = {
  candidate: "Кандидат",
  hr: "HR",
  hiring_manager: "Hiring Manager",
  admin: "Admin",
  reference_provider: "Referee",
};

const statusLabels: Record<UserAccountStatus, string> = {
  active: "активен",
  invited: "приглашен",
  suspended: "приостановлен",
  deleted: "удален",
};

const statusTones: Record<
  UserAccountStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  active: "good",
  invited: "warn",
  suspended: "muted",
  deleted: "risk",
};

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | UserAccountStatus;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminUsers();
        setUsers(data);
      } catch {
        setLoadError("Не удалось загрузить пользователей.");
      } finally {
        setIsLoaded(true);
      }
    }
    void load();
  }, []);

  async function toggleBlock(user: UserAccount) {
    if (user.status === "invited" || user.status === "deleted") {
      return;
    }
    const nextStatus: "active" | "suspended" =
      user.status === "suspended" ? "active" : "suspended";
    setBusyId(user.id);
    try {
      const updated = await updateAdminUserStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setLoadError("Не удалось обновить статус пользователя.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !s ||
        user.fullName.toLowerCase().includes(s) ||
        user.email.toLowerCase().includes(s) ||
        user.companyName?.toLowerCase().includes(s);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем пользователей." />;
  }

  return (
    <div data-screen-label="Admin · Пользователи">
      <Crumb>
        <Link href="/admin/candidates">← Платформа</Link>
        {" · "}Пользователи
      </Crumb>
      <PageHeader
        eyebrow="Платформа"
        title="Пользователи платформы"
        lead={`${users.length} аккаунтов из базы. Блокировка через API.`}
      />

      {loadError ? <Placeholder>{loadError}</Placeholder> : null}

      <div style={{ marginBottom: 32 }}>
        <input
          className="input search"
          placeholder="Имя, email, компания…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="filters" style={{ marginTop: 24 }}>
          <FormDropdown
            value={roleFilter}
            onChange={(v) => setRoleFilter(v as RoleFilter)}
            options={[
              { value: "all", label: "Роль: все" },
              { value: "candidate", label: "кандидаты" },
              { value: "hr", label: "HR" },
              { value: "hiring_manager", label: "hiring managers" },
              { value: "admin", label: "admin" },
            ]}
            placeholder="Роль: все"
            inactiveValue="all"
            hideClearOption
            className="form-dropdown--filter"
          />
          <FormDropdown
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "Статус: все" },
              { value: "active", label: "активные" },
              { value: "invited", label: "приглашенные" },
              { value: "suspended", label: "приостановлены" },
            ]}
            placeholder="Статус: все"
            inactiveValue="all"
            hideClearOption
            className="form-dropdown--filter"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Placeholder>Пользователи под фильтр не найдены</Placeholder>
      ) : (
        <EditorialTable>
          <thead>
            <tr>
              <th>Имя</th>
              <th className="mobile-hide">Email</th>
              <th>Роль</th>
              <th>Компания</th>
              <th>Статус</th>
              <th className="mobile-hide">Регистрация</th>
              <th aria-label="Действия">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td className="mobile-hide mono">{user.email}</td>
                <td className="muted">{roleLabels[user.role]}</td>
                <td className="muted">{user.companyName ?? "—"}</td>
                <td>
                  <Status tone={statusTones[user.status]}>
                    {statusLabels[user.status]}
                  </Status>
                </td>
                <td className="mono muted mobile-hide">{user.createdAt}</td>
                <td className="text-right">
                  {user.status === "active" || user.status === "suspended" ? (
                    <button
                      type="button"
                      className="btn-link mono"
                      style={{
                        fontSize: 12,
                        color:
                          user.status === "suspended"
                            ? "var(--ink)"
                            : "var(--risk)",
                      }}
                      disabled={busyId === user.id}
                      onClick={() => void toggleBlock(user)}
                    >
                      {busyId === user.id
                        ? "…"
                        : user.status === "suspended"
                          ? "разблокировать"
                          : "заблокировать"}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </EditorialTable>
      )}
    </div>
  );
}
