"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Crumb, Section } from "@/components/ui/editorial";
import { ReportSnapshotView } from "@/components/ReportSnapshotView";
import { getCandidateById } from "@/lib/api/candidates";
import { fetchProfileReportForCandidate } from "@/lib/api/profileReports";
import { profileReportToSnapshot } from "@/lib/utils/profileReportToSnapshot";
import { describeMissingReportBlocks } from "@/lib/utils/profileReportMessaging";
import type { Candidate } from "@/types/candidate";
import type { ProfileReport } from "@/types/profileReport";

export default function CandidateProfileReportPage() {
  const params = useParams();
  const candidateId = typeof params.id === "string" ? params.id : "";

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [missingBlocks, setMissingBlocks] = useState<string[] | undefined>();
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    let cancelled = false;

    async function load() {
      try {
        const [foundCandidate, reportResult] = await Promise.all([
          getCandidateById(candidateId, "all_visible"),
          fetchProfileReportForCandidate(candidateId),
        ]);
        if (cancelled) return;
        setCandidate(foundCandidate);
        setReport(reportResult.report);
        setMissingBlocks(reportResult.missingBlocks);
        setAccessDenied(reportResult.accessDenied ?? false);
        setAccessDeniedMessage(reportResult.accessDeniedMessage);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const snapshot = report ? profileReportToSnapshot(report) : null;

  return (
    <>
      <Crumb>
        <Link href="/candidates">Кандидаты</Link>
        <span aria-hidden> · </span>
        {candidate ? (
          <Link href={`/candidates/${candidate.id}`}>{candidate.fullName}</Link>
        ) : (
          "Кандидат"
        )}
        <span aria-hidden> · </span>
        Отчет профиля
      </Crumb>

      <Section id="report" label="Отчет профиля">
        {!isLoaded && <p className="caption">Загрузка…</p>}

        {isLoaded && accessDenied && (
          <div className="placeholder">
            <p>
              {accessDeniedMessage ??
                "Отчет профиля недоступен: профиль скрыт или нет согласия на видимость."}
            </p>
            {candidate && (
              <Link href={`/candidates/${candidate.id}`} className="btn-link">
                ← к карточке кандидата
              </Link>
            )}
          </div>
        )}

        {isLoaded && !accessDenied && !report && (
          <div className="placeholder">
            <p>{describeMissingReportBlocks(missingBlocks)}</p>
            {candidate && (
              <Link href={`/candidates/${candidate.id}`} className="btn-link">
                ← к карточке кандидата
              </Link>
            )}
          </div>
        )}

        {snapshot && (
          <>
            {candidate && (
              <p className="caption" style={{ marginBottom: 16 }}>
                {candidate.fullName} · автоматический отчет профиля (не привязан
                к вакансии)
              </p>
            )}
            <ReportSnapshotView snapshot={snapshot} />
          </>
        )}
      </Section>
    </>
  );
}
