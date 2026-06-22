import { AssessmentSubmission } from "@/types/assessment";
import { getStoredArray, setStoredArray } from "./storage";

const ASSESSMENT_SUBMISSIONS_STORAGE_KEY = "wirehire-assessment-submissions";

export async function getAssessmentSubmissions(): Promise<
  AssessmentSubmission[]
> {
  return getStoredArray<AssessmentSubmission>(
    ASSESSMENT_SUBMISSIONS_STORAGE_KEY
  );
}

export async function getAssessmentSubmissionByVerificationRunId(
  verificationRunId: string
): Promise<AssessmentSubmission | null> {
  const submissions = await getAssessmentSubmissions();

  return (
    submissions.find(
      (submission) => submission.verificationRunId === verificationRunId
    ) ?? null
  );
}

export async function getAssessmentSubmissionByPackageId(
  packageId: string
): Promise<AssessmentSubmission | null> {
  const submissions = await getAssessmentSubmissions();
  return (
    submissions.find(
      (submission) => submission.assessmentPackageId === packageId
    ) ?? null
  );
}

export async function saveAssessmentSubmission(
  submission: AssessmentSubmission
): Promise<AssessmentSubmission> {
  const submissions = await getAssessmentSubmissions();

  const submissionsWithoutCurrent = submissions.filter(
    (item) => item.id !== submission.id
  );

  setStoredArray<AssessmentSubmission>(ASSESSMENT_SUBMISSIONS_STORAGE_KEY, [
    ...submissionsWithoutCurrent,
    submission,
  ]);

  return submission;
}
