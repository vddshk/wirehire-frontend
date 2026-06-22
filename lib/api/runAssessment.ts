// Assessment, привязанный к verification-run — только remote (новые
// эндпоинты, мокового эквивалента нет). См. adapters/remote/assessments.ts.
export {
  getMyProfileAssessment,
  getMyRunAssessment,
  startTest,
  submitTest,
} from "./adapters/remote/assessments";
