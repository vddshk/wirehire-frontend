"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCandidateById } from "@/lib/api/candidates";
import { getCandidateResume } from "@/lib/api/resume";
import { USE_REMOTE_API } from "@/lib/api/config";
import {
  Candidate,
  CandidateExperience,
  CandidateStatus,
  EvidenceMaterial,
  EvidenceType,
  ExperienceStatus,
  ProfileStatus,
} from "@/types/candidate";
import { Reference, ReferenceStatus } from "@/types/reference";
import { getReferencesByCandidateId } from "@/lib/api/references";
import { fetchProfileReportForCandidate } from "@/lib/api/profileReports";
import { profileReportToSnapshot } from "@/lib/utils/profileReportToSnapshot";
import { describeMissingReportBlocks } from "@/lib/utils/profileReportMessaging";
import type { ProfileReport } from "@/types/profileReport";
import { ReportOverallStatus } from "@/types/report";
import { Vacancy } from "@/types/vacancy";
import { formatVacancyLocation as getVacancyLocation } from "@/lib/utils/vacancy";
import {
  ConsentStatus,
  VerificationRun,
  VerificationRunStatus,
  VerificationScope,
} from "@/types/verification";
import { addAuditEvent } from "@/lib/api/audit";
import { createVerificationRunForVacancy } from "@/lib/api/verification";
import { getMyVacancies } from "@/lib/api/vacancies";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FormDropdown } from "@/components/FormDropdown";
import { FormSheet } from "@/components/ui/FormSheet";
import { ReportSnapshotView } from "@/components/ReportSnapshotView";
import {
  PageHeader,
  Section,
  Status,
  Crumb,
  Placeholder,
} from "@/components/ui/editorial";
import { getCurrentRole, getCurrentUser } from "@/lib/api/session";
import {
  createApplication,
  getApplications,
} from "@/lib/api/applications";
import {
  createThreadForInvite,
  findThreadForCandidateVacancy,
} from "@/lib/api/messages";
import {
  Application,
  ApplicationStatus,
  APPLICATION_STATUS_LABEL,
} from "@/types/application";
import {
  getSavedCandidates,
  createSavedCandidate,
  deleteSavedCandidate,
} from "@/lib/api/savedCandidates";
import { getErrorText } from "@/lib/api/adapters/remote/client";

const candidateStatusLabels: Record<CandidateStatus, string> = {
  not_verified: "не проверен",
  pending: "в проверке",
  verified: "подтвержден",
  questionable: "под вопросом",
};

const candidateStatusTones: Record<
  CandidateStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  not_verified: "muted",
  pending: "warn",
  verified: "good",
  questionable: "risk",
};

const experienceStatusLabels: Record<ExperienceStatus, string> = {
  not_checked: "не проверено",
  awaiting_reference: "ждет референта",
  verified: "подтверждено",
  partially_verified: "частично",
  questionable: "под вопросом",
};

const experienceStatusTones: Record<
  ExperienceStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  not_checked: "muted",
  awaiting_reference: "warn",
  verified: "good",
  partially_verified: "warn",
  questionable: "risk",
};

const evidenceTypeLabels: Record<EvidenceType, string> = {
  portfolio: "Портфолио",
  repository: "Репозиторий",
  certificate: "Сертификат",
  document: "Документ",
  other: "Другое",
};

const scopeLabels: Record<VerificationScope, string> = {
  trust_only: "только опыт",
  skills_only: "только навыки",
  full: "полная",
};

const consentLabels: Record<ConsentStatus, string> = {
  not_requested: "не запрошено",
  requested: "запрошено",
  active: "активно",
  revoked: "отозвано",
};

const verificationStatusLabels: Record<VerificationRunStatus, string> = {
  created: "создана",
  waiting_consent: "ждет согласие",
  active: "активна",
  completed: "завершена",
  cancelled: "отменена",
};

const verificationStatusTones: Record<
  VerificationRunStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  created: "muted",
  waiting_consent: "warn",
  active: "good",
  completed: "good",
  cancelled: "risk",
};

const workFormatLabels: Record<Candidate["workFormat"], string> = {
  remote: "Удаленно",
  office: "Офис",
  hybrid: "Гибрид",
};

const profileStatusLabels: Record<ProfileStatus, string> = {
  draft: "черновик",
  active: "активен",
  pending_threshold: "ожидает порог",
  admitted: "допущен",
};

const profileStatusTones: Record<
  ProfileStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  draft: "muted",
  active: "muted",
  pending_threshold: "warn",
  admitted: "good",
};

const referenceStatusLabels: Record<ReferenceStatus, string> = {
  pending: "референт ожидает",
  delivered: "доставлено",
  opened: "просмотрено",
  answered_positive: "подтверждено",
  answered_partial: "частично",
  answered_negative: "не подтверждено",
  expired: "истек срок",
};

const referenceStatusTones: Record<
  ReferenceStatus,
  "good" | "warn" | "muted" | "risk"
> = {
  pending: "muted",
  delivered: "muted",
  opened: "warn",
  answered_positive: "good",
  answered_partial: "warn",
  answered_negative: "risk",
  expired: "risk",
};

function saveCandidateToStorage(updatedCandidate: Candidate) {
  const savedCandidatesRaw = localStorage.getItem("wirehire-candidates");
  const savedCandidates: Candidate[] = savedCandidatesRaw
    ? JSON.parse(savedCandidatesRaw)
    : [];

  const savedCandidatesWithoutCurrent = savedCandidates.filter(
    (candidate) => candidate.id !== updatedCandidate.id
  );

  localStorage.setItem(
    "wirehire-candidates",
    JSON.stringify([...savedCandidatesWithoutCurrent, updatedCandidate])
  );
}

export default function CandidateProfileHRPage() {
  const params = useParams();
  const candidateId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidateReferences, setCandidateReferences] = useState<Reference[]>([]);
  const [candidateReport, setCandidateReport] = useState<ProfileReport | null>(
    null
  );
  const [reportMissingBlocks, setReportMissingBlocks] = useState<
    string[] | undefined
  >();
  const [reportAccessDenied, setReportAccessDenied] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isHrLike, setIsHrLike] = useState(false);
  const [savedShortlistId, setSavedShortlistId] = useState<string | null>(null);
  const [shortlistBusy, setShortlistBusy] = useState(false);

  const [hrApplications, setHrApplications] = useState<Application[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteVacancyId, setInviteVacancyId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState("");
  const [scope, setScope] = useState<VerificationScope>("full");
  const [verificationExperienceId, setVerificationExperienceId] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [consentStatus, setConsentStatus] =
    useState<ConsentStatus>("not_requested");
  const [dueAt, setDueAt] = useState("");
  const [proctoringEnabled, setProctoringEnabled] = useState(false);
  const [verificationRun, setVerificationRun] =
    useState<VerificationRun | null>(null);

  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [experienceCompany, setExperienceCompany] = useState("");
  const [experienceRole, setExperienceRole] = useState("");
  const [experiencePeriod, setExperiencePeriod] = useState("");
  const [experienceEmploymentType, setExperienceEmploymentType] =
    useState("Full-time");
  const [experienceResponsibilities, setExperienceResponsibilities] =
    useState("");
  const [experienceStackText, setExperienceStackText] = useState("");
  const [experienceStatusValue, setExperienceStatusValue] =
    useState<ExperienceStatus>("not_checked");
  const [experienceFormError, setExperienceFormError] = useState("");

  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("portfolio");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceComment, setEvidenceComment] = useState("");
  const [evidenceFormError, setEvidenceFormError] = useState("");

  const router = useRouter();

  const [shareNotice, setShareNotice] = useState<"copied" | "fail" | null>(
    null
  );
  const [resumeBusy, setResumeBusy] = useState(false);

  async function handleOpenResume() {
    if (!candidate || resumeBusy) return;
    setResumeBusy(true);
    try {
      const resume = await getCandidateResume(candidate.id);
      if (!resume?.fileUrl) {
        window.alert("Резюме недоступно или не загружено.");
        return;
      }
      window.open(resume.fileUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.alert("Не удалось открыть резюме. Попробуйте позже.");
    } finally {
      setResumeBusy(false);
    }
  }

  async function handleShareCandidate() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareNotice("copied");
    } catch {
      setShareNotice("fail");
    } finally {
      window.setTimeout(() => setShareNotice(null), 2400);
    }
  }

  // Структурированные навыки кандидата приходят в детальной карточке как
  // `skills_preview` (бэк, `candidate_skills`). Для устаревших моков еще
  // может прилететь только candidate.skills (string[]) — рисуем тогда без
  // подробностей про время.
  function formatYearsUsed(years: number): string {
    const rounded = Math.round(years * 10) / 10;
    const intPart = Math.floor(rounded);
    const mod100 = intPart % 100;
    const mod10 = intPart % 10;
    let word = "лет";
    if (mod100 < 11 || mod100 > 14) {
      if (mod10 === 1) word = "год";
      else if (mod10 >= 2 && mod10 <= 4) word = "года";
    }
    const number = rounded % 1 === 0 ? String(intPart) : String(rounded);
    return `${number} ${word}`;
  }

  useEffect(() => {
    async function load() {
      // Вакансии HR — только с API (GET /me/vacancies).
      let allVacancies: Vacancy[] = [];
      try {
        allVacancies = await getMyVacancies();
      } catch {
        allVacancies = [];
      }

      let foundCandidate: Candidate | null = null;
      if (candidateId) {
        try {
          foundCandidate = await getCandidateById(candidateId, "all_visible");
        } catch {
          foundCandidate = null;
        }
      }

      setCandidate(foundCandidate);
      setVacancies(allVacancies);

      if (allVacancies.length > 0) {
        setSelectedVacancyId(allVacancies[0].id);
      }

      if (foundCandidate) {
        const [refs, reportResult, allApplications] = await Promise.all([
          getReferencesByCandidateId(foundCandidate.id),
          fetchProfileReportForCandidate(foundCandidate.id),
          getApplications(),
        ]);
        setCandidateReferences(refs);
        setCandidateReport(reportResult.report);
        setReportMissingBlocks(reportResult.missingBlocks);
        setReportAccessDenied(reportResult.accessDenied ?? false);
        setHrApplications(
          allApplications.filter(
            (application) => application.candidateId === foundCandidate.id
          )
        );
      }

      setIsLoaded(true);
    }

    load();
  }, [candidateId]);

  useEffect(() => {
    const role = getCurrentRole();
    const hrLike =
      role === "hr" || role === "hiring_manager" || role === "admin";
    setIsHrLike(hrLike);
    if (!hrLike || !candidateId) return;

    let cancelled = false;
    getSavedCandidates()
      .then((items) => {
        if (cancelled) return;
        const found = items.find((s) => s.candidateId === candidateId);
        setSavedShortlistId(found?.id ?? null);
      })
      .catch(() => {
        // Тихо: кнопка останется в режиме «добавить», POST расскажет о проблеме явно.
      });
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  const CLOSED_APPLICATION_STATUSES: ApplicationStatus[] = [
    "hired",
    "rejected",
    "withdrawn",
    "archived",
  ];

  const activeHrApplications = hrApplications.filter(
    (application) => !CLOSED_APPLICATION_STATUSES.includes(application.status)
  );
  const canMessage = activeHrApplications.length > 0;
  const primaryApplication = activeHrApplications[0] ?? null;
  const primaryVacancy = primaryApplication
    ? vacancies.find((vacancy) => vacancy.id === primaryApplication.vacancyId)
    : null;

  const applicationSourceLabels: Record<Application["source"], string> = {
    job_apply: "отклик",
    invited: "приглашение",
    manual: "вручную",
  };

  function openInviteModal() {
    if (!candidate) return;
    const firstName = candidate.fullName.split(" ")[0];
    const publishedVacancies = vacancies.filter(
      (vacancy) => vacancy.status === "published"
    );
    const defaultVacancy = publishedVacancies[0] ?? vacancies[0];
    setInviteError("");
    setInviteVacancyId(defaultVacancy?.id ?? "");
    setInviteMessage(
      `Здравствуйте, ${firstName}! Мы изучили ваш профиль и хотели бы пригласить вас рассмотреть нашу вакансию.`
    );
    setIsInviteModalOpen(true);
  }

  async function handleInviteCandidate() {
    if (!candidate || !inviteVacancyId) return;

    const duplicate = hrApplications.find(
      (application) =>
        application.vacancyId === inviteVacancyId &&
        !CLOSED_APPLICATION_STATUSES.includes(application.status)
    );
    if (duplicate) {
      setInviteError(
        "По этой вакансии уже есть активный отклик или приглашение"
      );
      return;
    }

    const vacancy = vacancies.find((item) => item.id === inviteVacancyId);
    if (!vacancy) return;

    const user = getCurrentUser();
    const messageBody =
      inviteMessage.trim() ||
      `Приглашение на вакансию «${vacancy.title}» в ${vacancy.companyName}.`;

    setInviteBusy(true);
    setInviteError("");
    try {
      const application = await createApplication({
        candidateId: candidate.id,
        vacancyId: inviteVacancyId,
        source: "invited",
        ownerName: user?.fullName ?? "HR",
        status: "reviewed",
      });

      await createThreadForInvite({
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        vacancyId: vacancy.id,
        vacancyTitle: vacancy.title,
        companyName: vacancy.companyName,
        hrUserId: user?.id ?? "user-hr-1",
        hrName: user?.fullName ?? "HR",
        initialMessage: messageBody,
      });

      setHrApplications((previous) => [...previous, application]);
      setIsInviteModalOpen(false);

      addAuditEvent({
        type: "application_moved",
        title: "Кандидат приглашен",
        description: `HR пригласил ${candidate.fullName} на вакансию «${vacancy.title}».`,
        actorRole: "HR",
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        vacancyId: vacancy.id,
        vacancyTitle: vacancy.title,
      });
    } catch (err) {
      setInviteError(getErrorText(err, "Не удалось отправить приглашение"));
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleOpenMessages() {
    if (!candidate || !canMessage || !primaryApplication) return;

    const vacancy =
      primaryVacancy ??
      vacancies.find((item) => item.id === primaryApplication.vacancyId);
    const user = getCurrentUser();

    let thread = await findThreadForCandidateVacancy(
      candidate.id,
      primaryApplication.vacancyId
    );

    if (!thread && vacancy) {
      thread = await createThreadForInvite({
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        vacancyId: vacancy.id,
        vacancyTitle: vacancy.title,
        companyName: vacancy.companyName,
        hrUserId: user?.id ?? "user-hr-1",
        hrName: user?.fullName ?? "HR",
        initialMessage: `Переписка по вакансии «${vacancy.title}».`,
      });
    }

    router.push(thread ? `/messages?thread=${thread.id}` : "/messages");
  }

  async function handleToggleShortlist() {
    if (!candidateId) return;
    setShortlistBusy(true);
    try {
      if (savedShortlistId) {
        await deleteSavedCandidate(savedShortlistId);
        setSavedShortlistId(null);
      } else {
        const created = await createSavedCandidate({ candidateId });
        setSavedShortlistId(created.id);
      }
    } catch (err) {
      alert(getErrorText(err, "Не удалось обновить список сохраненных"));
    } finally {
      setShortlistBusy(false);
    }
  }

  if (!isLoaded) {
    return <PageHeader title="Загрузка..." lead="Подгружаем кандидата." />;
  }

  if (!candidate) {
    return (
      <>
        <Crumb>
          <Link href="/candidates">← Кандидаты</Link>
        </Crumb>
        <PageHeader
          eyebrow="Не найдено"
          title="Кандидат не найден"
          lead="Такого кандидата нет в базе."
          actions={
            <Link href="/candidates" className="btn btn-primary">
              К списку →
            </Link>
          }
        />
      </>
    );
  }

  const candidateExperience = candidate.experience ?? [];
  const selectedVacancy = vacancies.find(
    (vacancy) => vacancy.id === selectedVacancyId
  );
  const verificationVacancy = verificationRun
    ? vacancies.find((vacancy) => vacancy.id === verificationRun.vacancyId)
    : null;
  const selectedExperience = candidateExperience.find(
    (experience) => experience.id === selectedExperienceId
  );

  const evidenceCount = candidateExperience.reduce(
    (total, experience) => total + (experience.evidence?.length ?? 0),
    0
  );

  function resetExperienceForm() {
    setExperienceCompany("");
    setExperienceRole("");
    setExperiencePeriod("");
    setExperienceEmploymentType("Full-time");
    setExperienceResponsibilities("");
    setExperienceStackText("");
    setExperienceStatusValue("not_checked");
    setExperienceFormError("");
  }

  function resetEvidenceForm() {
    setSelectedExperienceId("");
    setEvidenceTitle("");
    setEvidenceType("portfolio");
    setEvidenceUrl("");
    setEvidenceComment("");
    setEvidenceFormError("");
  }

  function openEvidenceModal(experienceId: string) {
    setSelectedExperienceId(experienceId);
    setEvidenceTitle("");
    setEvidenceType("portfolio");
    setEvidenceUrl("");
    setEvidenceComment("");
    setEvidenceFormError("");
    setIsEvidenceModalOpen(true);
  }

  function openVerificationModal() {
    setVerificationError("");
    setVerificationExperienceId("");
    setScope("full");
    setDueAt("");
    setIsVerificationModalOpen(true);
  }

  async function handleCreateVerification() {
    if (!candidate || !selectedVacancyId || !dueAt) {
      return;
    }

    // Правило бэка: для проверки опыта (trust_only) обязательна карточка опыта.
    if (scope === "trust_only" && !verificationExperienceId) {
      setVerificationError("Для проверки опыта выберите карточку опыта");
      return;
    }

    if (USE_REMOTE_API) {
      setVerificationBusy(true);
      setVerificationError("");
      try {
        const created = await createVerificationRunForVacancy(
          selectedVacancyId,
          {
            candidateId: candidate.id,
            runType: scope,
            experienceId: verificationExperienceId || undefined,
            dueAt: dueAt || undefined,
          }
        );
        setVerificationRun(created);
        setIsVerificationModalOpen(false);
      } catch (err) {
        setVerificationError(getErrorText(err, "Не удалось запустить проверку"));
      } finally {
        setVerificationBusy(false);
      }
      return;
    }

    // Локальный мок-режим — прежняя логика через localStorage.
    if (!selectedVacancy) return;
    const newVerificationRun: VerificationRun = {
      id: `vr-${Date.now()}`,
      candidateId: candidate.id,
      vacancyId: selectedVacancyId,
      scope,
      status: consentStatus === "active" ? "active" : "waiting_consent",
      consentStatus,
      dueAt,
      proctoringEnabled,
      createdAt: new Date().toLocaleDateString("ru-RU"),
    };

    const savedRunsRaw = localStorage.getItem("wirehire-verification-runs");
    const savedRuns: VerificationRun[] = savedRunsRaw
      ? JSON.parse(savedRunsRaw)
      : [];

    localStorage.setItem(
      "wirehire-verification-runs",
      JSON.stringify([...savedRuns, newVerificationRun])
    );

    setVerificationRun(newVerificationRun);
    setIsVerificationModalOpen(false);

    addAuditEvent({
      type: "verification_created",
      title: "Создана проверка кандидата",
      description: `HR создал проверку кандидата ${candidate.fullName} под вакансию ${selectedVacancy.title}.`,
      actorRole: "HR",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      vacancyId: selectedVacancy.id,
      vacancyTitle: selectedVacancy.title,
      verificationRunId: newVerificationRun.id,
    });
  }

  function handleAddExperience() {
    if (!candidate) {
      return;
    }

    const stack = experienceStackText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!experienceCompany.trim()) {
      setExperienceFormError("Укажите компанию или проект");
      return;
    }
    if (!experienceRole.trim()) {
      setExperienceFormError("Укажите должность");
      return;
    }
    if (!experiencePeriod.trim()) {
      setExperienceFormError("Укажите период");
      return;
    }
    if (!experienceResponsibilities.trim()) {
      setExperienceFormError("Опишите обязанности");
      return;
    }
    if (stack.length === 0) {
      setExperienceFormError("Добавьте хотя бы один навык");
      return;
    }

    const newExperience: CandidateExperience = {
      id: `exp-${Date.now()}`,
      company: experienceCompany.trim(),
      role: experienceRole.trim(),
      period: experiencePeriod.trim(),
      employmentType: experienceEmploymentType,
      responsibilities: experienceResponsibilities.trim(),
      stack,
      status: experienceStatusValue,
      evidence: [],
    };

    const updatedCandidate: Candidate = {
      ...candidate,
      experience: [...candidateExperience, newExperience],
    };

    saveCandidateToStorage(updatedCandidate);
    setCandidate(updatedCandidate);
    setIsExperienceModalOpen(false);
    resetExperienceForm();

    addAuditEvent({
      type: "experience_added",
      title: "Добавлен опыт кандидата",
      description: `К кандидату ${candidate.fullName} добавлен опыт: ${newExperience.role} в ${newExperience.company}.`,
      actorRole: "HR",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
    });
  }

  function handleAddEvidence() {
    if (!candidate || !selectedExperienceId) {
      return;
    }

    if (!evidenceTitle.trim()) {
      setEvidenceFormError("Укажите название.");
      return;
    }
    if (!evidenceUrl.trim()) {
      setEvidenceFormError("Укажите ссылку.");
      return;
    }

    const newEvidence: EvidenceMaterial = {
      id: `evidence-${Date.now()}`,
      title: evidenceTitle.trim(),
      type: evidenceType,
      url: evidenceUrl.trim(),
      comment: evidenceComment.trim(),
      createdAt: new Date().toLocaleDateString("ru-RU"),
    };

    const updatedExperience = candidateExperience.map((experience) => {
      if (experience.id !== selectedExperienceId) {
        return experience;
      }
      const currentEvidence = experience.evidence ?? [];
      return { ...experience, evidence: [...currentEvidence, newEvidence] };
    });

    const updatedCandidate: Candidate = {
      ...candidate,
      experience: updatedExperience,
    };

    saveCandidateToStorage(updatedCandidate);
    setCandidate(updatedCandidate);
    setIsEvidenceModalOpen(false);
    resetEvidenceForm();

    addAuditEvent({
      type: "evidence_added",
      title: "Добавлен evidence",
      description: `К кандидату ${candidate.fullName} добавлен evidence: ${newEvidence.title}.`,
      actorRole: "HR",
      candidateId: candidate.id,
      candidateName: candidate.fullName,
    });
  }

  const verifiedExperience = candidateExperience.filter(
    (e) => e.status === "verified"
  ).length;
  const totalExperience = candidateExperience.length;

  const trustScore = candidateReport
    ? profileReportToSnapshot(candidateReport).weightedScore ?? 0
    : 0;

  const proctoringFlag =
    candidateReport?.proctoringScore != null
      ? String(Math.round(candidateReport.proctoringScore))
      : "—";

  const funnelHref = primaryVacancy
    ? `/applications?vacancy=${primaryVacancy.id}`
    : "/applications";

  return (
    <>
      <Crumb>
        <Link href="/candidates">Кандидаты</Link>
        <span aria-hidden> · </span>
        {candidate.fullName}
      </Crumb>

      <div className="hr-profile">
        <div className="hr-profile__layout">
          <div className="hr-profile__main">
            <header className="hr-profile__head">
              <div className="eyebrow">Публичный профиль</div>
              <h1 className="hr-profile__title">{candidate.fullName}</h1>
              <p className="hr-profile__meta">
                {candidate.headline} · {candidate.location} ·{" "}
                {workFormatLabels[candidate.workFormat]}
              </p>
              {candidate.summary && (
                <p className="hr-profile__summary">«{candidate.summary}»</p>
              )}
              {isHrLike && candidate.hasResume && (
                <button
                  type="button"
                  className="btn btn-sm hr-profile__resume"
                  onClick={handleOpenResume}
                  disabled={resumeBusy}
                >
                  {resumeBusy ? "Открываем…" : "Резюме (PDF) →"}
                </button>
              )}
            </header>

            <div className="hr-profile__stats">
              <div className="hr-profile__stat">
                <span className="hr-profile__stat-val">{trustScore}</span>
                <span className="hr-profile__stat-lbl">доверие</span>
              </div>
              <div className="hr-profile__stat">
                <span className="hr-profile__stat-val">
                  {verifiedExperience}/{totalExperience}
                </span>
                <span className="hr-profile__stat-lbl">опыт подтвержден</span>
              </div>
              <div className="hr-profile__stat">
                <span className="hr-profile__stat-val">{proctoringFlag}</span>
                <span className="hr-profile__stat-lbl">прокторинг</span>
              </div>
            </div>

      <Section num="01" label="Опыт">
        {candidateExperience.length === 0 ? (
          <Placeholder>Кандидат пока не добавил опыт</Placeholder>
        ) : (
          <div>
            {candidateExperience.map((experience) => {
              const tone = experienceStatusTones[experience.status];
              const label = experienceStatusLabels[experience.status];
              const note =
                experience.status === "verified"
                  ? "Подтверждено референтом"
                  : experience.status === "awaiting_reference"
                    ? "Запрос ушел референту"
                    : experience.status === "partially_verified"
                      ? "Частичное подтверждение"
                      : experience.status === "questionable"
                        ? "Требуется уточнение"
                        : "Не проверено";
              return (
                <div className="entry hr-profile-exp" key={experience.id}>
                  <div className="when">{experience.period}</div>
                  <div className="what">
                    <div className="role">{experience.role}</div>
                    <div className="co">
                      {experience.company} · {experience.employmentType}
                    </div>
                    {experience.responsibilities && (
                      <div className="scope">{experience.responsibilities}</div>
                    )}
                    {experience.stack && experience.stack.length > 0 && (
                      <div className="chips" style={{ marginTop: 14 }}>
                        {experience.stack.map((tech) => (
                          <span key={tech} className="chip">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="hr-profile-exp__status">
                    <Status tone={tone}>{label}</Status>
                    <span className="hr-profile-exp__note">{note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section num="02" label="Навыки">
        {(() => {
          const structured = candidate.skillsPreview ?? [];
          const fallback = structured.length === 0 ? candidate.skills : [];
          if (structured.length === 0 && fallback.length === 0) {
            return <Placeholder>Навыки не указаны</Placeholder>;
          }
          return (
            <div className="hr-profile-skills">
              {structured.length > 0
                ? structured.map((skill) => (
                    <div className="hr-profile-skill" key={skill.id}>
                      <span className="hr-profile-skill__name">
                        {skill.label}
                      </span>
                      {skill.yearsUsed !== undefined && (
                        <span className="hr-profile-skill__years">
                          {formatYearsUsed(skill.yearsUsed)}
                        </span>
                      )}
                    </div>
                  ))
                : fallback.map((skillName) => (
                    <div className="hr-profile-skill" key={skillName}>
                      <span className="hr-profile-skill__name">{skillName}</span>
                    </div>
                  ))}
            </div>
          );
        })()}
      </Section>

      {isHrLike && (
        <Section num="03" label="Отчет">
          {candidateReport ? (
            <>
              <ReportSnapshotView
                snapshot={profileReportToSnapshot(candidateReport)}
                variant="summary"
                showPdfAction={false}
              />
              <div style={{ marginTop: 20 }}>
                <Link
                  href={`/candidates/${candidate.id}/report`}
                  className="btn-link mono"
                >
                  полный отчет и PDF →
                </Link>
              </div>
            </>
          ) : (
            <Placeholder>
              {reportAccessDenied
                ? "Отчет профиля недоступен: нет согласия на видимость или кандидат не в вашей воронке."
                : describeMissingReportBlocks(reportMissingBlocks)}
            </Placeholder>
          )}
        </Section>
      )}
          </div>

          {isHrLike && (
            <aside className="hr-profile__aside">
              <div className="hr-profile-panel">
                {canMessage && primaryApplication ? (
                  <div className="hr-profile-panel__context">
                    <Status tone="good" dot>
                      {APPLICATION_STATUS_LABEL[primaryApplication.status]}
                    </Status>
                    <p className="hr-profile-panel__vacancy">
                      {primaryVacancy?.title ?? "Вакансия"}
                    </p>
                    <p className="hr-profile-panel__source">
                      {applicationSourceLabels[primaryApplication.source]}
                    </p>
                    <Link href={funnelHref} className="btn-link mono">
                      открыть воронку →
                    </Link>
                  </div>
                ) : (
                  <p className="hr-profile-panel__hint">
                    Пригласите на вакансию — после этого откроется переписка.
                  </p>
                )}

                <div className="hr-profile-panel__cta">
                  {canMessage ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleOpenMessages}
                    >
                      Написать кандидату
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openInviteModal}
                    >
                      Пригласить на вакансию
                    </button>
                  )}
                  {candidateReport ? (
                    <Link
                      href={`/candidates/${candidate.id}/report`}
                      className="btn"
                    >
                      Открыть отчет
                      {trustScore > 0 ? ` · ${trustScore}` : ""} →
                    </Link>
                  ) : reportAccessDenied ? (
                    <button
                      type="button"
                      className="btn"
                      disabled
                      title="Нет доступа к отчету профиля"
                    >
                      Отчет недоступен
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      disabled
                      title={describeMissingReportBlocks(reportMissingBlocks)}
                    >
                      Отчет формируется
                    </button>
                  )}
                </div>

                <ol className="hr-profile-panel__steps">
                  <li
                    className={
                      canMessage
                        ? "hr-profile-panel__step is-done"
                        : "hr-profile-panel__step is-active"
                    }
                  >
                    Приглашение
                  </li>
                  <li
                    className={
                      canMessage
                        ? "hr-profile-panel__step is-active"
                        : "hr-profile-panel__step"
                    }
                  >
                    Переписка
                  </li>
                  <li
                    className={
                      candidateReport
                        ? "hr-profile-panel__step is-done"
                        : "hr-profile-panel__step is-active"
                    }
                  >
                    Авто-проверка и отчет
                  </li>
                </ol>

                <div className="hr-profile-panel__tools">
                  {candidate.hasResume && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleOpenResume}
                      disabled={resumeBusy}
                    >
                      {resumeBusy ? "…" : "Резюме PDF"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleToggleShortlist}
                    disabled={shortlistBusy}
                  >
                    {shortlistBusy
                      ? "…"
                      : savedShortlistId
                        ? "★ Сохранен"
                        : "☆ Сохранить"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleShareCandidate}
                  >
                    {shareNotice === "copied"
                      ? "Скопировано ✓"
                      : shareNotice === "fail"
                        ? "Ошибка ×"
                        : "Поделиться"}
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {isInviteModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsInviteModalOpen(false);
            }
          }}
        >
          <div
            className="overlay-sheet"
            style={{
              maxHeight: "90vh",
              width: "100%",
              maxWidth: 720,
              overflowY: "auto",
              padding: 56,
            }}
          >
            <div className="between" style={{ marginBottom: 32 }}>
              <div>
                <div className="eyebrow">Приглашение</div>
                <h2 className="h-section">Пригласить кандидата</h2>
              </div>
              <button
                className="btn-link mono"
                onClick={() => setIsInviteModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                закрыть ×
              </button>
            </div>

            <p className="lead" style={{ marginTop: 0, marginBottom: 32, fontSize: 14 }}>
              Кандидат получит приглашение и сможет ответить в переписке. До
              приглашения написать нельзя — как на hh.ru.
            </p>

            <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Вакансия</span>
                {vacancies.filter((vacancy) => vacancy.status === "published")
                  .length === 0 ? (
                  <p className="lead" style={{ margin: 0, fontSize: 14 }}>
                    Нет опубликованных вакансий. Создайте и опубликуйте вакансию
                    в разделе «Вакансии», затем вернитесь к приглашению.
                  </p>
                ) : (
                  <FormDropdown
                    value={inviteVacancyId}
                    onChange={setInviteVacancyId}
                    options={vacancies
                      .filter((vacancy) => vacancy.status === "published")
                      .map((vacancy) => ({
                        value: vacancy.id,
                        label: `${vacancy.title} — ${vacancy.companyName}`,
                      }))}
                    placeholder="Выберите вакансию"
                    hideClearOption
                    className="form-dropdown--field"
                  />
                )}
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Сопроводительное сообщение</span>
                <textarea
                  value={inviteMessage}
                  onChange={(event) => setInviteMessage(event.target.value)}
                  rows={5}
                  className="textarea"
                  placeholder="Кратко опишите, почему кандидат подходит и что предлагаете."
                />
              </div>
            </div>

            {inviteError && (
              <div
                className="placeholder"
                style={{
                  borderColor: "var(--risk)",
                  color: "var(--risk)",
                  marginTop: 24,
                }}
              >
                {inviteError}
              </div>
            )}

            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 16,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={inviteBusy}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary"
                onClick={handleInviteCandidate}
                disabled={!inviteVacancyId || inviteBusy}
              >
                {inviteBusy ? "Отправка…" : "Отправить приглашение →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isVerificationModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsVerificationModalOpen(false);
            }
          }}
        >
          <div
            className="overlay-sheet"
            style={{
              maxHeight: "90vh",
              width: "100%",
              maxWidth: 720,
              overflowY: "auto",
              padding: 56,
            }}
          >
            <div className="between" style={{ marginBottom: 32 }}>
              <div>
                <div className="eyebrow">Проверка</div>
                <h2 className="h-section">Запустить</h2>
              </div>
              <button
                className="btn-link mono"
                onClick={() => setIsVerificationModalOpen(false)}
                style={{ fontSize: 12 }}
              >
                закрыть ×
              </button>
            </div>

            <div className="lead" style={{ marginTop: 0, marginBottom: 32, fontSize: 14 }}>
              Настройте проверку для кандидата {candidate.fullName}.
            </div>

            <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Вакансия</span>
                <FormDropdown
                  value={selectedVacancyId}
                  onChange={setSelectedVacancyId}
                  options={vacancies.map((vacancy) => ({
                    value: vacancy.id,
                    label: `${vacancy.title} — ${vacancy.companyName}`,
                  }))}
                  placeholder="Выберите вакансию"
                  hideClearOption
                  className="form-dropdown--field"
                />
                {selectedVacancy && (
                  <div
                    className="caption"
                    style={{ marginTop: 8, textTransform: "none" }}
                  >
                    {getVacancyLocation(selectedVacancy)} ·{" "}
                    {selectedVacancy.skills.join(", ")}
                  </div>
                )}
              </div>

              <div className="field">
                <span className="field-label">Тип проверки</span>
                <FormDropdown
                  value={scope}
                  onChange={(v) => setScope(v as VerificationScope)}
                  options={[
                    { value: "trust_only", label: "Только опыт" },
                    { value: "skills_only", label: "Только навыки" },
                    { value: "full", label: "Полная" },
                  ]}
                  placeholder="Только опыт"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>

              {(scope === "trust_only" || scope === "full") && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <span className="field-label">
                    Карточка опыта{scope === "trust_only" ? " *" : ""}
                  </span>
                  <FormDropdown
                    value={verificationExperienceId}
                    onChange={setVerificationExperienceId}
                    options={[
                      { value: "", label: "— не выбрано —" },
                      ...candidateExperience
                        .filter((exp) => exp.verificationApplicable !== false)
                        .map((exp) => ({
                          value: exp.id,
                          label: `${(exp.titleLabel ?? exp.role) || "Опыт"} — ${exp.organizationLabel ?? exp.company}`,
                        })),
                    ]}
                    placeholder="— не выбрано —"
                    inactiveValue=""
                    hideClearOption
                    className="form-dropdown--field"
                  />
                </div>
              )}

              {!USE_REMOTE_API && (
                <div className="field">
                  <span className="field-label">Согласие</span>
                  <FormDropdown
                    value={consentStatus}
                    onChange={(v) => setConsentStatus(v as ConsentStatus)}
                    options={[
                      { value: "not_requested", label: "Не запрошено" },
                      { value: "requested", label: "Запрошено" },
                      { value: "active", label: "Активно" },
                      { value: "revoked", label: "Отозвано" },
                    ]}
                    placeholder="Не запрошено"
                    hideClearOption
                    className="form-dropdown--field"
                  />
                </div>
              )}

              <div className="field">
                <span className="field-label">Дедлайн *</span>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="input"
                />
              </div>

              <div className="field">
                <span className="field-label">Прокторинг</span>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    paddingTop: 10,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={proctoringEnabled}
                    onChange={(event) =>
                      setProctoringEnabled(event.target.checked)
                    }
                  />
                  <span style={{ fontSize: 14 }}>
                    Включить для теста/кейса
                  </span>
                </label>
              </div>
            </div>

            {verificationError && (
              <div
                style={{ color: "var(--risk)", marginTop: 24, fontSize: 14 }}
              >
                {verificationError}
              </div>
            )}

            <div
              style={{
                marginTop: 40,
                display: "flex",
                gap: 16,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                onClick={() => setIsVerificationModalOpen(false)}
                disabled={verificationBusy}
              >
                Отмена
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateVerification}
                disabled={!selectedVacancyId || !dueAt || verificationBusy}
              >
                {verificationBusy
                  ? "Запуск…"
                  : USE_REMOTE_API
                    ? "Запустить →"
                    : consentStatus === "active"
                      ? "Запустить →"
                      : "Создать и запросить →"}
              </button>
            </div>
          </div>
        </div>
      )}

      <FormSheet
        open={isExperienceModalOpen}
        onClose={() => {
          setIsExperienceModalOpen(false);
          resetExperienceForm();
        }}
        eyebrow="Опыт"
        title="Добавить карточку"
        error={experienceFormError || undefined}
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsExperienceModalOpen(false);
                resetExperienceForm();
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddExperience}
            >
              Добавить →
            </button>
          </>
        }
      >
        <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Компания / проект *</span>
                <input
                  value={experienceCompany}
                  onChange={(event) =>
                    setExperienceCompany(event.target.value)
                  }
                  className="input"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Должность *</span>
                <input
                  value={experienceRole}
                  onChange={(event) => setExperienceRole(event.target.value)}
                  className="input"
                  style={{ fontSize: 20, letterSpacing: "-0.015em" }}
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Период *</span>
                <DateRangePicker
                  value={experiencePeriod}
                  onChange={setExperiencePeriod}
                />
              </div>
              <div className="field">
                <span className="field-label">Тип занятости</span>
                <FormDropdown
                  value={experienceEmploymentType}
                  onChange={setExperienceEmploymentType}
                  options={[
                    { value: "Full-time", label: "Полная" },
                    { value: "Part-time", label: "Частичная" },
                    { value: "Contract", label: "Контракт" },
                    { value: "Freelance", label: "Фриланс" },
                    { value: "Education", label: "Образование" },
                  ]}
                  placeholder="Полная"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Обязанности *</span>
                <textarea
                  value={experienceResponsibilities}
                  onChange={(event) =>
                    setExperienceResponsibilities(event.target.value)
                  }
                  rows={4}
                  className="textarea"
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">
                  Стек * (через запятую)
                </span>
                <input
                  value={experienceStackText}
                  onChange={(event) =>
                    setExperienceStackText(event.target.value)
                  }
                  className="input"
                />
              </div>
              <div className="field">
                <span className="field-label">Статус</span>
                <FormDropdown
                  value={experienceStatusValue}
                  onChange={(v) =>
                    setExperienceStatusValue(v as ExperienceStatus)
                  }
                  options={[
                    { value: "not_checked", label: "Не проверено" },
                    { value: "verified", label: "Подтверждено" },
                    { value: "partially_verified", label: "Частично" },
                    { value: "questionable", label: "Под вопросом" },
                  ]}
                  placeholder="Не проверено"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
        </div>
      </FormSheet>

      <FormSheet
        open={isEvidenceModalOpen}
        onClose={() => {
          setIsEvidenceModalOpen(false);
          resetEvidenceForm();
        }}
        eyebrow="Материал"
        title="Добавить материал"
        lead={
          <>
            Материал будет привязан к опыту:{" "}
            <strong>{selectedExperience?.role ?? "опыт не выбран"}</strong>
          </>
        }
        error={evidenceFormError || undefined}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setIsEvidenceModalOpen(false);
                resetEvidenceForm();
              }}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddEvidence}
            >
              Добавить →
            </button>
          </>
        }
      >
        <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Название *</span>
                <input
                  value={evidenceTitle}
                  onChange={(event) => setEvidenceTitle(event.target.value)}
                  className="input"
                  style={{ fontSize: 20, letterSpacing: "-0.015em" }}
                />
              </div>
              <div className="field">
                <span className="field-label">Тип</span>
                <FormDropdown
                  value={evidenceType}
                  onChange={(v) => setEvidenceType(v as EvidenceType)}
                  options={[
                    { value: "portfolio", label: "Портфолио" },
                    { value: "repository", label: "Репозиторий" },
                    { value: "certificate", label: "Сертификат" },
                    { value: "document", label: "Документ" },
                    { value: "other", label: "Другое" },
                  ]}
                  placeholder="Портфолио"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>
              <div className="field">
                <span className="field-label">Ссылка *</span>
                <input
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Комментарий</span>
                <textarea
                  value={evidenceComment}
                  onChange={(event) => setEvidenceComment(event.target.value)}
                  rows={3}
                  className="textarea"
                />
              </div>
        </div>
      </FormSheet>
    </>
  );
}
