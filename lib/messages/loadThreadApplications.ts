import { getApplicationsByCandidateId, getApplicationsForVacancy } from "@/lib/api/applications";
import { Application } from "@/types/application";
import { Thread } from "@/types/message";
import { CurrentUser } from "@/types/user";
import { threadApplicationKey } from "@/lib/applications/display";

function isHrRole(user: CurrentUser): boolean {
  return user.role === "hr" || user.role === "hiring_manager";
}

export async function loadApplicationsByThread(
  threads: Thread[],
  user: CurrentUser
): Promise<Map<string, Application>> {
  const map = new Map<string, Application>();

  if (user.role === "candidate" && user.candidateId) {
    const applications = await getApplicationsByCandidateId(user.candidateId);
    for (const application of applications) {
      map.set(
        threadApplicationKey(application.vacancyId, user.candidateId),
        application
      );
    }
    return map;
  }

  if (!isHrRole(user)) {
    return map;
  }

  const vacancyIds = [...new Set(threads.map((thread) => thread.vacancyId))];
  const lists = await Promise.all(
    vacancyIds.map((vacancyId) => getApplicationsForVacancy(vacancyId))
  );

  for (const applications of lists) {
    for (const application of applications) {
      map.set(
        threadApplicationKey(application.vacancyId, application.candidateId),
        application
      );
    }
  }

  return map;
}

export function vacancyHrefForThread(
  thread: Thread,
  user: CurrentUser
): string | null {
  if (!thread.vacancyId) return null;
  if (user.role === "candidate") {
    return `/jobs/${thread.vacancyId}`;
  }
  if (user.role === "hr" || user.role === "hiring_manager") {
    return `/vacancies/${thread.vacancyId}`;
  }
  return null;
}
