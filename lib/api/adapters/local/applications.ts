import { mockApplications } from "@/data/mockApplications";
import { Application, ApplicationStatus } from "@/types/application";
import { getStoredArray, setStoredArray } from "./storage";

const APPLICATIONS_STORAGE_KEY = "wirehire-applications";

export type CreateApplicationInput = {
  candidateId: string;
  vacancyId: string;
  source: Application["source"];
  ownerName: string;
  status?: ApplicationStatus;
};

export async function getApplications(): Promise<Application[]> {
  const savedApplications = getStoredArray<Application>(
    APPLICATIONS_STORAGE_KEY
  );

  if (savedApplications.length > 0) {
    return savedApplications;
  }

  setStoredArray<Application>(APPLICATIONS_STORAGE_KEY, mockApplications);

  return mockApplications;
}

export async function getApplicationsByCandidateId(
  candidateId: string
): Promise<Application[]> {
  const applications = await getApplications();

  return applications.filter(
    (application) => application.candidateId === candidateId
  );
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  const applications = await getApplications();

  const newApplication: Application = {
    id: `app-${Date.now()}`,
    candidateId: input.candidateId,
    vacancyId: input.vacancyId,
    status: input.status ?? "submitted",
    source: input.source,
    appliedAt: new Date().toISOString().slice(0, 10),
    ownerName: input.ownerName,
  };

  setStoredArray<Application>(APPLICATIONS_STORAGE_KEY, [
    ...applications,
    newApplication,
  ]);

  return newApplication;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<Application | null> {
  const applications = await getApplications();

  let updatedApplication: Application | null = null;

  const updatedApplications = applications.map((application) => {
    if (application.id !== applicationId) {
      return application;
    }

    updatedApplication = {
      ...application,
      status,
    };

    return updatedApplication;
  });

  setStoredArray<Application>(APPLICATIONS_STORAGE_KEY, updatedApplications);

  return updatedApplication;
}

export async function withdrawMyApplication(
  applicationId: string
): Promise<Application | null> {
  return updateApplicationStatus(applicationId, "withdrawn");
}
