"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logProctoringEvent } from "@/lib/api/proctoring";
import {
  EMPTY_PROCTORING_COUNTS,
  type ProctoringEventType,
  type ProctoringViolationCounts,
} from "@/types/proctoring";

type UseProctoringMonitorOptions = {
  active: boolean;
  sessionId: string;
  packageId?: string;
};

function sumCounts(counts: ProctoringViolationCounts): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

export function useProctoringMonitor({
  active,
  sessionId,
  packageId,
}: UseProctoringMonitorOptions) {
  const [counts, setCounts] = useState<ProctoringViolationCounts>(
    EMPTY_PROCTORING_COUNTS
  );
  const countsRef = useRef(counts);
  countsRef.current = counts;

  const recordEvent = useCallback(
    (eventType: ProctoringEventType) => {
      if (!active) return;

      const nextCounts: ProctoringViolationCounts = {
        ...countsRef.current,
        [eventType]: countsRef.current[eventType] + 1,
      };
      countsRef.current = nextCounts;
      setCounts(nextCounts);

      void logProctoringEvent({
        sessionId,
        packageId,
        eventType,
        occurredAt: new Date().toISOString(),
        counts: nextCounts,
      });
    },
    [active, packageId, sessionId]
  );

  useEffect(() => {
    if (!active) return;

    function handleWindowBlur() {
      recordEvent("window_blur");
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        recordEvent("visibility_hidden");
      }
    }

    function handleMouseLeave(event: MouseEvent) {
      const leftThroughTop = event.clientY <= 0;
      const leftThroughBottom = event.clientY >= window.innerHeight - 1;
      const leftThroughLeft = event.clientX <= 0;
      const leftThroughRight = event.clientX >= window.innerWidth - 1;
      if (
        leftThroughTop ||
        leftThroughBottom ||
        leftThroughLeft ||
        leftThroughRight
      ) {
        recordEvent("pointer_leave_window");
      }
    }

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.documentElement.removeEventListener(
        "mouseleave",
        handleMouseLeave
      );
    };
  }, [active, recordEvent]);

  const recordZoneLeave = useCallback(() => {
    recordEvent("pointer_leave_zone");
  }, [recordEvent]);

  const resetCounts = useCallback(() => {
    countsRef.current = { ...EMPTY_PROCTORING_COUNTS };
    setCounts({ ...EMPTY_PROCTORING_COUNTS });
  }, []);

  return {
    counts,
    totalViolations: sumCounts(counts),
    recordZoneLeave,
    resetCounts,
  };
}
