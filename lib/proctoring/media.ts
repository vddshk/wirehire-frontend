import type {
  ProctoringMediaStatus,
  ProctoringPermissionsResult,
} from "@/types/proctoring";

function hasMediaDevices(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/** Запрашивает камеру, микрофон и запись экрана через браузерные API. */
export async function requestProctoringPermissions(): Promise<ProctoringPermissionsResult> {
  const status: ProctoringMediaStatus = {
    camera: false,
    microphone: false,
    screen: false,
  };
  const errors: ProctoringPermissionsResult["errors"] = {};

  if (!hasMediaDevices()) {
    return {
      granted: false,
      status,
      cameraStream: null,
      screenStream: null,
      errors: {
        camera: "Браузер не поддерживает доступ к камере",
        microphone: "Браузер не поддерживает доступ к микрофону",
        screen: "Браузер не поддерживает запись экрана",
      },
    };
  }

  let cameraStream: MediaStream | null = null;
  let screenStream: MediaStream | null = null;

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true,
    });
    status.camera = cameraStream.getVideoTracks().some((track) => track.enabled);
    status.microphone = cameraStream
      .getAudioTracks()
      .some((track) => track.enabled);
  } catch (error) {
    errors.camera =
      error instanceof Error ? error.message : "Не удалось получить камеру";
    errors.microphone = errors.camera;
  }

  if (navigator.mediaDevices.getDisplayMedia) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      status.screen = screenStream.getVideoTracks().some((track) => track.enabled);
      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        status.screen = false;
      });
    } catch (error) {
      errors.screen =
        error instanceof Error ? error.message : "Не удалось получить экран";
    }
  } else {
    errors.screen = "Запись экрана не поддерживается в этом браузере";
  }

  const granted = status.camera && status.microphone && status.screen;

  return {
    granted,
    status,
    cameraStream,
    screenStream,
    errors,
  };
}
