import { getMyProfile } from "./profile";
import { getCurrentUser, setCurrentUser } from "./session";

export function greetingFirstName(
  profileFullName?: string | null,
  sessionFullName?: string | null
): string {
  const name = profileFullName?.trim() || sessionFullName?.trim() || "";
  if (!name) return "коллега";
  return name.split(/\s+/)[0] ?? name;
}

/** Подтянуть ФИО из профиля кандидата в localStorage-сессию (шапка, приветствие). */
export async function refreshCurrentUserDisplayName(): Promise<void> {
  const user = getCurrentUser();
  if (!user?.candidateId) return;

  try {
    const profile = await getMyProfile();
    const fullName = profile.fullName.trim();
    if (!fullName || fullName === user.fullName) return;
    setCurrentUser({ ...user, fullName });
  } catch {
    // Профиль недоступен — оставляем имя из сессии.
  }
}
