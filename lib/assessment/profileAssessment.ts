import { USE_REMOTE_API } from "@/lib/api/config";
import {
  getAssessmentSubmissionByPackageId,
  saveAssessmentSubmission,
} from "@/lib/api/assessments";
import {
  autoGenerateForCandidate,
  buildSubmissionFromRun,
  getActiveAssessmentPackageByCandidateId,
  getAssessmentPackagesByCandidateId,
  mapRunAssessmentToPackage,
} from "@/lib/api/assessmentPackages";
import { getMyProfileAssessment } from "@/lib/api/runAssessment";
import type { AssessmentPackage, AssessmentSubmission } from "@/types/assessment";
import type { Candidate } from "@/types/candidate";

export type ProfileAssessmentState = {
  pkg: AssessmentPackage | null;
  submission: AssessmentSubmission | null;
  serverSessionStarted: boolean;
  initialStage: "intro" | "running" | "done";
};

export async function loadProfileAssessmentState(
  candidate: Candidate
): Promise<ProfileAssessmentState> {
  if (USE_REMOTE_API) {
    const run = await getMyProfileAssessment();
    const pkg = mapRunAssessmentToPackage(run, candidate.id);
    if (!pkg) {
      return {
        pkg: null,
        submission: null,
        serverSessionStarted: false,
        initialStage: "intro",
      };
    }

    if (pkg.status === "completed") {
      const submission =
        run && buildSubmissionFromRun(run, pkg, candidate.id);
      return {
        pkg,
        submission: submission ?? null,
        serverSessionStarted: false,
        initialStage: submission ? "done" : "intro",
      };
    }

    const sessionActive =
      pkg.status === "in_progress" || run?.result?.status === "in_progress";

    return {
      pkg,
      submission: null,
      serverSessionStarted: sessionActive,
      initialStage: sessionActive ? "running" : "intro",
    };
  }

  let pkg = await getActiveAssessmentPackageByCandidateId(candidate.id);
  if (!pkg) {
    const generated = await autoGenerateForCandidate(candidate);
    if (generated && generated.status !== "completed") {
      pkg = generated;
    }
  }

  if (pkg) {
    return {
      pkg,
      submission: null,
      serverSessionStarted: pkg.status === "in_progress",
      initialStage: pkg.status === "in_progress" ? "running" : "intro",
    };
  }

  const all = await getAssessmentPackagesByCandidateId(candidate.id);
  const completed = all.find((item) => item.status === "completed");
  if (!completed) {
    return {
      pkg: null,
      submission: null,
      serverSessionStarted: false,
      initialStage: "intro",
    };
  }

  const submission = await getAssessmentSubmissionByPackageId(completed.id);
  return {
    pkg: completed,
    submission,
    serverSessionStarted: false,
    initialStage: submission ? "done" : "intro",
  };
}
