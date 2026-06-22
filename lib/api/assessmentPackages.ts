import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/assessmentPackages";
import * as remote from "./adapters/remote/assessmentPackages";

const impl = USE_REMOTE_API ? remote : local;

export const {
  getAssessmentPackages,
  getAssessmentPackageByVerificationRunId,
  getAssessmentPackageById,
  getActiveAssessmentPackageByCandidateId,
  getAssessmentPackagesByCandidateId,
  saveAssessmentPackage,
  buildDefaultAssessmentQuestions,
  buildDefaultCaseText,
  buildDefaultQuestionsForCandidate,
  autoGenerateForCandidate,
} = impl;

export type { SaveAssessmentPackageInput } from "./adapters/local/assessmentPackages";

export {
  mapRunAssessmentToPackage,
  buildSubmissionFromRun,
} from "./adapters/remote/assessmentPackages";
