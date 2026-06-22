export type ProctoringEventType =
  | "pointer_leave_zone"
  | "pointer_leave_window"
  | "window_blur"
  | "visibility_hidden";

export type ProctoringViolationCounts = Record<ProctoringEventType, number>;

export const EMPTY_PROCTORING_COUNTS: ProctoringViolationCounts = {
  pointer_leave_zone: 0,
  pointer_leave_window: 0,
  window_blur: 0,
  visibility_hidden: 0,
};

export type ProctoringMediaStatus = {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
};

export type ProctoringPermissionsResult = {
  granted: boolean;
  status: ProctoringMediaStatus;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  errors: Partial<Record<keyof ProctoringMediaStatus, string>>;
};

export type ProctoringEventPayload = {
  sessionId: string;
  eventType: ProctoringEventType;
  occurredAt: string;
  counts: ProctoringViolationCounts;
  packageId?: string;
};
