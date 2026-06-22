"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  setCurrentUser as persistCurrentUser,
} from "@/lib/api/session";
import { getErrorText } from "@/lib/api/adapters/remote/client";
import { getCandidateById, updateCandidate } from "@/lib/api/candidates";
import { getMyProfile, updateMyProfile } from "@/lib/api/profile";
import { getMyResume, uploadMyResume } from "@/lib/api/resume";
import {
  createMyExperience,
  deleteMyExperience,
  listMyExperiences,
  updateMyExperience,
} from "@/lib/api/experiences";
import { getConsentsByCandidateId } from "@/lib/api/consents";
import { getReferencesByExperienceId } from "@/lib/api/references";
import {
  createMySkill,
  deleteMySkill,
  getMySkills,
  updateMySkill,
} from "@/lib/api/skills";
import { checkAdmission, AdmissionCheckResult } from "@/lib/candidates/admissionGate";
import {
  computeProfileCompletionPercent,
  getProfileSections,
} from "@/lib/candidates/profileCompletion";
import { ProfileSkillsEditor } from "@/components/ProfileSkillsEditor";
import { FormSheet } from "@/components/ui/FormSheet";
import { FormDropdown } from "@/components/FormDropdown";
import { PageHeader, Section, Status } from "@/components/ui/editorial";
import { PageSkeleton } from "@/components/ui/PageSkeleton";
import { useToast } from "@/components/ui/Toast";
import {
  Candidate,
  CandidateExperience,
  CandidateStatus,
  EvidenceMaterial,
  EvidenceType,
  ExperienceStatus,
  ExperienceType,
  VisibilityMode,
  WorkFormat,
} from "@/types/candidate";
import { Consent } from "@/types/consent";
import { CandidateSkill } from "@/types/skill";
import { Reference, ReferenceStatus } from "@/types/reference";
import { CurrentUser } from "@/types/user";
import {
  validateEmail,
  validateFullName,
  validatePhone,
  validateSingleName,
} from "@/lib/validation";
import { SkillPicker, SKILL_PICKER_MAX } from "@/components/SkillPicker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { formatDate, parseRuPeriod, validateRuPeriod } from "@/lib/utils/date";
import { formatRuPhoneInput } from "@/lib/utils/phone";

const candidateStatusLabels: Record<CandidateStatus, string> = {
  not_verified: "Не проверен",
  pending: "В проверке",
  verified: "Подтвержден",
  questionable: "Под вопросом",
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
  partially_verified: "частично подтверждено",
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

const referenceStatusLabels: Record<ReferenceStatus, string> = {
  pending: "ожидает ответа",
  delivered: "доставлено",
  opened: "просмотрено",
  answered_positive: "подтверждено",
  answered_partial: "частично подтверждено",
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

export default function CandidateProfilePage() {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [admissionResult, setAdmissionResult] =
    useState<AdmissionCheckResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // FR-005..018: profile is grouped into tabs per reference CandProfile
  type ProfileTab = "basics" | "experience" | "skills" | "visibility";
  const [activeTab, setActiveTab] = useState<ProfileTab>("basics");

  const SUMMARY_MAX = 500;

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [workFormat, setWorkFormat] = useState<WorkFormat>("remote");
  const [skillsText, setSkillsText] = useState("");
  const [summary, setSummary] = useState("");
  // FR-011: visibility mode (public / restricted / hidden)
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("public");
  // FR-005: candidate's target role (separate from headline)
  const [desiredRole, setDesiredRole] = useState("");
  // FR-005: contacts (optional, скрыты до отклика)
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmailTouched, setContactEmailTouched] = useState(false);
  const [contactPhoneTouched, setContactPhoneTouched] = useState(false);
  const [firstNameTouched, setFirstNameTouched] = useState(false);
  const [lastNameTouched, setLastNameTouched] = useState(false);

  const contactEmailError = contactEmailTouched
    ? validateEmail(contactEmail, { required: false })
    : null;
  const contactPhoneError = contactPhoneTouched
    ? validatePhone(contactPhone, { required: false })
    : null;

  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);

  async function handleShareProfile() {
    if (!candidate) return;
    const url = `${window.location.origin}/candidates/${candidate.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Ссылка на профиль скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку");
    }
  }

  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(
    null
  );
  // FR-012: experience type — work / project / education
  const [experienceType, setExperienceType] = useState<ExperienceType>("work");
  const [experienceCompany, setExperienceCompany] = useState("");
  const [experienceRole, setExperienceRole] = useState("");
  const [experiencePeriod, setExperiencePeriod] = useState("");
  const [experienceEmploymentType, setExperienceEmploymentType] =
    useState("Full-time");
  const [experienceResponsibilities, setExperienceResponsibilities] =
    useState("");
  const [experienceStackSlots, setExperienceStackSlots] = useState<string[]>([]);
  const [experienceReferenceContactName, setExperienceReferenceContactName] =
    useState("");
  const [experienceReferenceContactEmail, setExperienceReferenceContactEmail] =
    useState("");
  const [
    experienceReferenceContactNameTouched,
    setExperienceReferenceContactNameTouched,
  ] = useState(false);
  const [
    experienceReferenceContactEmailTouched,
    setExperienceReferenceContactEmailTouched,
  ] = useState(false);
  // Education-specific fields (FR-012)
  const [educationInstitution, setEducationInstitution] = useState("");
  const [educationSpeciality, setEducationSpeciality] = useState("");
  const [educationDegree, setEducationDegree] = useState("");
  const [educationThesisTitle, setEducationThesisTitle] = useState("");
  const [experienceFormError, setExperienceFormError] = useState("");

  const referenceContactNameError = experienceReferenceContactNameTouched
    ? validateFullName(experienceReferenceContactName, { required: false })
    : null;
  const referenceContactEmailError = experienceReferenceContactEmailTouched
    ? validateEmail(experienceReferenceContactEmail, { required: false })
    : null;

  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("portfolio");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceComment, setEvidenceComment] = useState("");
  const [evidenceFileName, setEvidenceFileName] = useState("");
  const [evidenceFormError, setEvidenceFormError] = useState("");

  // Структурированные навыки кандидата — отдельная таблица бэка
  // (`candidate_skills`), CRUD через /me/skills. Хранятся независимо от
  // candidate.skills[] (та же информация плоским списком для обратной
  // совместимости).
  const [candidateSkills, setCandidateSkills] = useState<CandidateSkill[]>([]);

  async function handleAddCandidateSkill(payload: {
    label: string;
    taxonomyId?: number;
    yearsUsed?: number;
  }) {
    const created = await createMySkill({
      taxonomyId: payload.taxonomyId,
      label: payload.label,
      yearsUsed: payload.yearsUsed,
    });
    setCandidateSkills((prev) => [...prev, created]);
  }

  async function handleUpdateCandidateSkillYears(
    skillId: string,
    yearsUsed: number | undefined
  ) {
    const skill = candidateSkills.find((item) => item.id === skillId);
    if (!skill) return;

    const updated = await updateMySkill(skillId, {
      label: skill.label,
      yearsUsed,
    });
    setCandidateSkills((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  }

  async function handleDeleteCandidateSkill(skillId: string) {
    await deleteMySkill(skillId);
    setCandidateSkills((prev) => prev.filter((item) => item.id !== skillId));
  }

  useEffect(() => {
    async function loadCandidateProfile() {
      const user = getCurrentUser();
      const candidateId = user.candidateId ?? `candidate-${user.id}`;

      const [foundCandidate, loadedConsents] = await Promise.all([
        getCandidateById(candidateId),
        getConsentsByCandidateId(candidateId),
      ]);

      // Параллельно тянем актуальный профиль, резюме, навыки и карточки
      // опыта с бэка. /candidates/{id} закрыт для кандидата (HR-only), так
      // что собственные experience приходится тянуть через /me/experiences.
      const [backendProfile, backendResume, backendSkills, backendExperience] =
        await Promise.all([
          getMyProfile().catch(() => null),
          getMyResume().catch(() => null),
          getMySkills().catch(() => [] as CandidateSkill[]),
          listMyExperiences().catch(() => [] as CandidateExperience[]),
        ]);

      setCandidateSkills(backendSkills);

      // Сливаем: базовые поля профиля приоритетно с бэка, остальное — из локалки.
      // experience всегда берем из /me/experiences (бэк), потому что для
      // кандидата /candidates/{id} закрыт и foundCandidate.experience может
      // быть пустым.
      const mergedCandidate = foundCandidate
        ? {
            ...foundCandidate,
            ...(backendProfile && {
              fullName: backendProfile.fullName || foundCandidate.fullName,
              headline: backendProfile.headline || foundCandidate.headline,
              desiredRole:
                backendProfile.desiredRole ?? foundCandidate.desiredRole,
              location: backendProfile.location || foundCandidate.location,
              workFormat: backendProfile.workFormat,
              summary: backendProfile.summary || foundCandidate.summary,
              email: backendProfile.email ?? foundCandidate.email,
              phone: backendProfile.phone ?? foundCandidate.phone,
              visibilityMode:
                backendProfile.visibilityMode ?? foundCandidate.visibilityMode,
              profileStatus:
                backendProfile.profileStatus ?? foundCandidate.profileStatus,
            }),
            experience:
              backendExperience.length > 0
                ? backendExperience
                : foundCandidate.experience,
            // Резюме приоритетно с бэка (там актуальные имя файла и ссылка).
            ...(backendResume && { resume: backendResume }),
          }
        : backendProfile
          ? {
              ...backendProfile,
              experience: backendExperience,
              resume: backendResume ?? undefined,
            }
          : null;

      setCurrentUser(user);
      setCandidate(mergedCandidate);
      setConsents(loadedConsents);

      if (mergedCandidate?.experience) {
        const expIds = mergedCandidate.experience.map((e) => e.id);
        const refArrays = await Promise.all(
          expIds.map((id) => getReferencesByExperienceId(id))
        );
        setReferences(refArrays.flat());
      }

      if (mergedCandidate) {
        setFullName(mergedCandidate.fullName);
        setHeadline(mergedCandidate.headline);
        setLocation(mergedCandidate.location);
        setWorkFormat(mergedCandidate.workFormat);
        setSkillsText(mergedCandidate.skills.join(", "));
        setSummary(mergedCandidate.summary);
        setVisibilityMode(mergedCandidate.visibilityMode ?? "public");
        setDesiredRole(mergedCandidate.desiredRole ?? "");
        setContactEmail(mergedCandidate.email ?? "");
        setContactPhone(
          mergedCandidate.phone
            ? formatRuPhoneInput(mergedCandidate.phone)
            : ""
        );
        setAdmissionResult(checkAdmission(mergedCandidate, loadedConsents));
      } else {
        setFullName(user.fullName);
        setHeadline("");
        setLocation("");
        setWorkFormat("remote");
        setSkillsText("");
        setSummary("");
        setVisibilityMode("public");
      }

      setIsLoaded(true);
    }

    loadCandidateProfile();
  }, []);

  const candidateExperience = candidate?.experience ?? [];

  const profileCompletionInput = useMemo(
    () => ({
      fullName,
      headline,
      location,
      desiredRole,
      summary,
      experienceCount: candidateExperience.length,
      skillsCount: candidateSkills.length,
    }),
    [
      fullName,
      headline,
      location,
      desiredRole,
      summary,
      candidateExperience.length,
      candidateSkills.length,
    ]
  );

  const profileSections = useMemo(
    () => getProfileSections(profileCompletionInput),
    [profileCompletionInput]
  );

  const profileCompletionPct = useMemo(
    () => computeProfileCompletionPercent(profileCompletionInput),
    [profileCompletionInput]
  );

  const applyReadiness = useMemo(() => {
    const missing: string[] = [];
    if (!headline.trim()) missing.push("заголовок");
    if (!summary.trim()) missing.push("«обо мне»");
    if (candidateSkills.length === 0) missing.push("хотя бы один навык");
    return missing;
  }, [headline, summary, candidateSkills.length]);

  const isProfileDirty = useMemo(() => {
    if (!candidate) {
      return Boolean(
        fullName.trim() ||
          headline.trim() ||
          location.trim() ||
          summary.trim() ||
          desiredRole.trim() ||
          contactEmail.trim() ||
          contactPhone.trim()
      );
    }
    return (
      fullName.trim() !== candidate.fullName ||
      headline.trim() !== candidate.headline ||
      location.trim() !== candidate.location ||
      workFormat !== candidate.workFormat ||
      summary.trim() !== candidate.summary ||
      visibilityMode !== (candidate.visibilityMode ?? "public") ||
      desiredRole.trim() !== (candidate.desiredRole ?? "") ||
      contactEmail.trim() !== (candidate.email ?? "") ||
      contactPhone.trim() !== (candidate.phone ?? "")
    );
  }, [
    candidate,
    fullName,
    headline,
    location,
    workFormat,
    summary,
    visibilityMode,
    desiredRole,
    contactEmail,
    contactPhone,
  ]);

  const selectedExperience = candidateExperience.find(
    (experience) => experience.id === selectedExperienceId
  );

  function resetExperienceForm() {
    setExperienceType("work");
    setExperienceCompany("");
    setExperienceRole("");
    setExperiencePeriod("");
    setExperienceEmploymentType("Full-time");
    setExperienceResponsibilities("");
    setExperienceStackSlots([]);
    setExperienceReferenceContactName("");
    setExperienceReferenceContactEmail("");
    setExperienceReferenceContactNameTouched(false);
    setExperienceReferenceContactEmailTouched(false);
    setEducationInstitution("");
    setEducationSpeciality("");
    setEducationDegree("");
    setEducationThesisTitle("");
    setExperienceFormError("");
    setEditingExperienceId(null);
  }

  function resetEvidenceForm() {
    setSelectedExperienceId("");
    setEvidenceTitle("");
    setEvidenceType("portfolio");
    setEvidenceUrl("");
    setEvidenceComment("");
    setEvidenceFileName("");
    setEvidenceFormError("");
  }

  function openEvidenceModal(experienceId: string) {
    setSelectedExperienceId(experienceId);
    setEvidenceTitle("");
    setEvidenceType("portfolio");
    setEvidenceUrl("");
    setEvidenceComment("");
    setEvidenceFileName("");
    setEvidenceFormError("");
    setIsEvidenceModalOpen(true);
  }

  function openExperienceModalForCreate() {
    resetExperienceForm();
    setIsExperienceModalOpen(true);
  }

  function openExperienceModalForEdit(experience: CandidateExperience) {
    setEditingExperienceId(experience.id);
    const resolvedType: ExperienceType = experience.type ?? "work";
    setExperienceType(resolvedType);
    if (resolvedType === "education") {
      setEducationInstitution(experience.educationDetails?.institutionName ?? "");
      setEducationSpeciality(experience.educationDetails?.speciality ?? "");
      setEducationDegree(experience.educationDetails?.degree ?? "");
      setEducationThesisTitle(experience.educationDetails?.thesisTitle ?? "");
      setExperienceCompany("");
      setExperienceRole("");
      setExperienceEmploymentType("Education");
    } else {
      setExperienceCompany(experience.company);
      setExperienceRole(experience.role);
      setExperienceEmploymentType(experience.employmentType);
      setEducationInstitution("");
      setEducationSpeciality("");
      setEducationDegree("");
      setEducationThesisTitle("");
    }
    setExperiencePeriod(experience.period);
    setExperienceResponsibilities(experience.responsibilities);
    setExperienceStackSlots(
      experience.stack.length > 0 ? [...experience.stack] : []
    );
    setExperienceReferenceContactName(experience.referenceContactName ?? "");
    setExperienceReferenceContactEmail(experience.referenceContactEmail ?? "");
    setExperienceReferenceContactNameTouched(false);
    setExperienceReferenceContactEmailTouched(false);
    setExperienceFormError("");
    setIsExperienceModalOpen(true);
  }

  async function handleDeleteExperience() {
    if (!candidate || !editingExperienceId) return;
    const updatedCandidate: Candidate = {
      ...candidate,
      experience: candidate.experience.filter(
        (item) => item.id !== editingExperienceId
      ),
    };
    const savedCandidate = await updateCandidate(updatedCandidate);
    setCandidate(savedCandidate);
    setAdmissionResult(checkAdmission(savedCandidate, consents));
    await refreshReferencesFor(savedCandidate);
    // DELETE /me/experiences/{id} — параллельно на бэк.
    // Если id локальный (exp-...) — бэк ответит 404, это нормально.
    try {
      await deleteMyExperience(editingExperienceId);
    } catch (err) {
      console.warn("DELETE /me/experiences failed:", err);
    }
    setIsExperienceModalOpen(false);
    resetExperienceForm();
  }

  async function refreshReferencesFor(candidateToRefresh: Candidate) {
    const refArrays = await Promise.all(
      candidateToRefresh.experience.map((exp) =>
        getReferencesByExperienceId(exp.id)
      )
    );
    setReferences(refArrays.flat());
  }

  async function handleSaveProfile() {
    if (!currentUser) {
      return;
    }

    // Источник правды для навыков — candidate.skills (вкладка «Навыки»
    // управляет ими через ProfileSkillsEditor на вкладке «Навыки»).
    // skillsText сохранен для отображения, но при сохранении профиля
    // мы не хотим перетереть массив навыков из-за устаревшего поля.
    const skills = candidate?.skills ?? [];

    if (!fullName.trim()) {
      setProfileError("Укажите ФИО");
      return;
    }

    if (!headline.trim()) {
      setProfileError("Укажите роль или заголовок");
      return;
    }

    if (!location.trim()) {
      setProfileError("Укажите локацию");
      return;
    }

    if (!desiredRole.trim()) {
      setProfileError("Выберите грейд");
      return;
    }

    if (!summary.trim()) {
      setProfileError("Добавьте краткое описание профиля");
      return;
    }

    setContactEmailTouched(true);
    setContactPhoneTouched(true);
    setFirstNameTouched(true);
    setLastNameTouched(true);
    const fullNameBad = validateFullName(fullName);
    const emailBad = validateEmail(contactEmail, { required: false });
    const phoneBad = validatePhone(contactPhone, { required: false });
    if (fullNameBad || emailBad || phoneBad) {
      if (fullNameBad) setProfileError(fullNameBad);
      return;
    }

    const candidateId = currentUser.candidateId ?? `candidate-${currentUser.id}`;

    const updatedCandidate: Candidate = {
      id: candidate?.id ?? candidateId,
      fullName: fullName.trim(),
      headline: headline.trim(),
      location: location.trim(),
      workFormat,
      verificationStatus: candidate?.verificationStatus ?? "not_verified",
      skills,
      summary: summary.trim(),
      experience: candidate?.experience ?? [],
      visibilityMode,
      desiredRole: desiredRole.trim() || undefined,
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      profileStatus: candidate?.profileStatus,
      resume: candidate?.resume,
      structuredSkills: candidate?.structuredSkills,
    };

    let profileFromBackend: Candidate | null = null;
    try {
      profileFromBackend = await updateMyProfile({
        fullName: fullName.trim(),
        headline: headline.trim(),
        desiredRole: desiredRole.trim(),
        summary: summary.trim(),
        location: location.trim(),
        workFormat,
        visibilityMode,
        contacts: {
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
        },
      });
    } catch (err) {
      setProfileError(getErrorText(err, "Не удалось сохранить профиль"));
      return;
    }

    const savedCandidate = await updateCandidate({
      ...updatedCandidate,
      ...(profileFromBackend && {
        fullName: profileFromBackend.fullName,
        headline: profileFromBackend.headline,
        desiredRole: profileFromBackend.desiredRole,
        summary: profileFromBackend.summary,
        location: profileFromBackend.location,
        workFormat: profileFromBackend.workFormat,
        visibilityMode: profileFromBackend.visibilityMode,
        email: profileFromBackend.email,
        phone: profileFromBackend.phone,
        profileStatus: profileFromBackend.profileStatus,
      }),
    });

    setCandidate(savedCandidate);
    setAdmissionResult(checkAdmission(savedCandidate, consents));
    if (currentUser) {
      const nextUser = { ...currentUser, fullName: fullName.trim() };
      persistCurrentUser(nextUser);
      setCurrentUser(nextUser);
    }
    setProfileError("");
    showToast("Профиль сохранён");
    setProfileMessage("");
  }

  async function handleAddExperience() {
    if (!candidate) {
      setExperienceFormError("Сначала сохраните основной профиль кандидата");
      return;
    }

    const stack = experienceStackSlots
      .map((item) => item.trim())
      .filter(Boolean);

    const isEducation = experienceType === "education";

    // FR-012: education uses different required fields (institution + speciality)
    if (isEducation) {
      if (!educationInstitution.trim()) {
        setExperienceFormError("Укажите учебное заведение");
        return;
      }
      if (!educationSpeciality.trim()) {
        setExperienceFormError("Укажите специальность");
        return;
      }
      if (!experiencePeriod.trim()) {
        setExperienceFormError("Укажите период обучения");
        return;
      }
      const periodErr = validateRuPeriod(experiencePeriod);
      if (periodErr) {
        setExperienceFormError(periodErr);
        return;
      }
    } else {
      if (!experienceCompany.trim()) {
        setExperienceFormError("Укажите компанию или проект");
        return;
      }
      if (!experienceRole.trim()) {
        setExperienceFormError("Укажите должность");
        return;
      }
      if (!experiencePeriod.trim()) {
        setExperienceFormError("Укажите период работы");
        return;
      }
      const periodErr = validateRuPeriod(experiencePeriod);
      if (periodErr) {
        setExperienceFormError(periodErr);
        return;
      }
      if (!experienceResponsibilities.trim()) {
        setExperienceFormError("Опишите обязанности");
        return;
      }
      if (stack.length === 0) {
        setExperienceFormError("Добавьте хотя бы один навык или технологию");
        return;
      }
    }

    // «Компания референта» сейчас не отдельное поле, а наследуется от
    // «Компания / проект» — контакт работал в той же компании. Поэтому
    // валидация смотрит только на имя и email: либо оба, либо ни одного.
    const referenceCompany = experienceCompany.trim();
    const referenceContactName = experienceReferenceContactName.trim();
    const referenceContactEmail = experienceReferenceContactEmail.trim();

    const hasAnyReference = Boolean(
      referenceContactName || referenceContactEmail
    );
    const hasAllReference = Boolean(
      referenceContactName && referenceContactEmail
    );

    if (!isEducation && hasAnyReference && !hasAllReference) {
      setExperienceFormError(
        "Заполните оба поля контакта референта или оставьте их пустыми"
      );
      return;
    }

    if (!isEducation && hasAnyReference) {
      setExperienceReferenceContactNameTouched(true);
      setExperienceReferenceContactEmailTouched(true);
      const refNameInvalid = validateFullName(referenceContactName, {
        required: false,
      });
      const refEmailInvalid = validateEmail(referenceContactEmail, {
        required: false,
      });
      if (refNameInvalid || refEmailInvalid) {
        setExperienceFormError(
          "Проверьте корректность имени и email референта."
        );
        return;
      }
    }

    const existingExperience = editingExperienceId
      ? candidateExperience.find((item) => item.id === editingExperienceId)
      : null;
    const nextId = existingExperience?.id ?? `exp-${Date.now()}`;
    const preservedEvidence = existingExperience?.evidence ?? [];
    const preservedStatus = existingExperience?.status ?? "not_checked";

    const updatedExperienceCard: CandidateExperience = isEducation
      ? {
          id: nextId,
          type: "education",
          company: educationInstitution.trim(),
          role: educationSpeciality.trim(),
          period: experiencePeriod.trim(),
          employmentType: "Education",
          responsibilities: experienceResponsibilities.trim(),
          stack: [],
          status: preservedStatus,
          evidence: preservedEvidence,
          educationDetails: {
            institutionName: educationInstitution.trim(),
            speciality: educationSpeciality.trim(),
            degree: educationDegree.trim() || undefined,
            thesisTitle: educationThesisTitle.trim() || undefined,
          },
        }
      : {
          id: nextId,
          type: experienceType,
          company: experienceCompany.trim(),
          role: experienceRole.trim(),
          period: experiencePeriod.trim(),
          employmentType: experienceEmploymentType,
          responsibilities: experienceResponsibilities.trim(),
          stack,
          status: preservedStatus,
          evidence: preservedEvidence,
          ...(hasAllReference && {
            referenceCompanyName: referenceCompany,
            referenceContactName: referenceContactName,
            referenceContactEmail: referenceContactEmail,
          }),
        };

    const nextExperience = editingExperienceId
      ? candidateExperience.map((item) =>
          item.id === editingExperienceId ? updatedExperienceCard : item
        )
      : [...candidateExperience, updatedExperienceCard];

    const updatedCandidate: Candidate = {
      ...candidate,
      experience: nextExperience,
    };

    const savedCandidate = await updateCandidate(updatedCandidate);

    setCandidate(savedCandidate);
    setAdmissionResult(checkAdmission(savedCandidate, consents));
    await refreshReferencesFor(savedCandidate);

    // Параллельно отправляем на бэк (POST/PATCH /me/experiences).
    // Парсим период в start_date/end_date; если не вышло — пропускаем.
    const parsed = parseRuPeriod(experiencePeriod.trim());
    if (parsed) {
      const remoteInput = isEducation
        ? {
            experienceType: "education" as const,
            institutionName: educationInstitution.trim(),
            speciality: educationSpeciality.trim(),
            degree: educationDegree.trim() || undefined,
            thesisTitle: educationThesisTitle.trim() || undefined,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
          }
        : {
            experienceType: experienceType as "work" | "project",
            companyName: experienceCompany.trim(),
            roleTitle: experienceRole.trim(),
            employmentType: experienceEmploymentType,
            responsibilities: experienceResponsibilities.trim(),
            skills: stack,
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            referrerCompanyName: hasAllReference ? referenceCompany : undefined,
            referrerContact: hasAllReference
              ? { person: referenceContactName, email: referenceContactEmail }
              : undefined,
          };
      try {
        if (editingExperienceId) {
          await updateMyExperience(editingExperienceId, remoteInput);
        } else {
          // На create берем id с бэка и подменяем локальный — иначе
          // последующий PATCH полетит на local-id и упадет 404/500.
          const created = await createMyExperience(remoteInput);
          if (created?.id && created.id !== updatedExperienceCard.id) {
            const reassignedExperience = nextExperience.map((item) =>
              item.id === updatedExperienceCard.id
                ? { ...item, id: created.id }
                : item
            );
            const reassigned: Candidate = {
              ...savedCandidate,
              experience: reassignedExperience,
            };
            const persisted = await updateCandidate(reassigned);
            setCandidate(persisted);
            await refreshReferencesFor(persisted);
          }
        }
      } catch (err) {
        console.warn("POST/PATCH /me/experiences failed:", err);
        setExperienceFormError(
          editingExperienceId
            ? "Не удалось сохранить изменения на сервере. Локально карточка обновлена — попробуйте перезагрузить страницу"
            : "Не удалось сохранить карточку на сервере. Локально она появилась — попробуйте перезагрузить страницу"
        );
        return;
      }
    }

    setIsExperienceModalOpen(false);
    resetExperienceForm();
  }

  async function handleAddEvidence() {
    if (!candidate || !selectedExperienceId) {
      return;
    }

    if (!evidenceTitle.trim()) {
      setEvidenceFormError("Укажите название материала.");
      return;
    }
    const isFileType =
      evidenceType === "document" || evidenceType === "certificate";
    if (isFileType && !evidenceFileName && !evidenceUrl.trim()) {
      setEvidenceFormError("Прикрепите файл или укажите ссылку.");
      return;
    }
    if (!isFileType && !evidenceUrl.trim()) {
      setEvidenceFormError("Укажите ссылку на материал.");
      return;
    }

    const newEvidence: EvidenceMaterial = {
      id: `evidence-${Date.now()}`,
      title: evidenceTitle.trim(),
      type: evidenceType,
      url: evidenceUrl.trim() || `file:${evidenceFileName}`,
      comment: evidenceComment.trim(),
      createdAt: new Date().toLocaleDateString("ru-RU"),
    };

    const updatedExperience = candidateExperience.map((experience) => {
      if (experience.id !== selectedExperienceId) {
        return experience;
      }

      const currentEvidence = experience.evidence ?? [];

      return {
        ...experience,
        evidence: [...currentEvidence, newEvidence],
      };
    });

    const updatedCandidate: Candidate = {
      ...candidate,
      experience: updatedExperience,
    };

    const savedCandidate = await updateCandidate(updatedCandidate);

    setCandidate(savedCandidate);
    setIsEvidenceModalOpen(false);
    resetEvidenceForm();
  }

  if (!isLoaded) {
    return <PageSkeleton />;
  }

  if (currentUser && currentUser.role !== "candidate") {
    return (
      <PageHeader
        eyebrow="Доступ"
        title="Это страница кандидата"
        lead="У компании нет личного профиля"
        actions={
          <>
            <Link href="/employer/onboarding" className="btn">
              Настройки компании
            </Link>
            <Link href="/dashboard" className="btn btn-primary">
              На дашборд →
            </Link>
          </>
        }
      />
    );
  }

  const firstNameField = fullName.split(" ")[0] ?? "";
  const lastNameField = fullName.split(" ").slice(1).join(" ") ?? "";
  const firstNameError = firstNameTouched
    ? validateSingleName(firstNameField, { label: "имя" })
    : null;
  const lastNameError = lastNameTouched
    ? validateSingleName(lastNameField, { label: "фамилию" })
    : null;
  const errorCaptionStyle: React.CSSProperties = {
    marginTop: 6,
    color: "var(--risk)",
    textTransform: "none",
    letterSpacing: 0,
    fontFamily: "var(--font-sans)",
  };
  const displayFirstName =
    candidate?.fullName.split(" ")[0] ??
    currentUser?.fullName.split(" ")[0] ??
    "Кандидат";
  const displayLastName =
    candidate?.fullName.split(" ").slice(1).join(" ") ??
    currentUser?.fullName.split(" ").slice(1).join(" ") ??
    "";

  // Sum of work-experience months for "лет в индустрии" lead (FR-005 lead text)
  const yearsInIndustry = (() => {
    if (!candidate) return null;
    const work = candidate.experience.filter(
      (exp) => exp.type !== "education"
    );
    if (work.length === 0) return null;
    return work.length; // simple count — server will compute real years from dates
  })();

  return (
    <>
      <PageHeader
        eyebrow="Профиль"
        title={
          <>
            {displayFirstName} <em>{displayLastName ?? ""}</em>
          </>
        }
        lead={
          candidate
            ? `${candidate.headline} · ${candidate.location}${
                yearsInIndustry
                  ? ` · ${yearsInIndustry} ${
                      yearsInIndustry === 1
                        ? "карточка опыта"
                        : "карточек опыта"
                    }`
                  : ""
              }`
            : "Заполните базовые поля профиля, добавьте опыт и материалы"
        }
        actions={
          <>
            <button
              className="btn"
              type="button"
              onClick={handleShareProfile}
              disabled={!candidate}
              title="Скопировать ссылку на профиль (откроется у работодателя как страница кандидата)"
            >
              Поделиться
            </button>
          </>
        }
      />

      <div className="profile-page">
      <div className="tabs tabs--profile">
        {profileSections.map((section) => (
          <button
            key={section.key}
            className={activeTab === section.key ? "active" : ""}
            onClick={() => setActiveTab(section.key)}
            type="button"
          >
            {section.done && (
              <span className="tab-mark" aria-hidden="true">
                ✓
              </span>
            )}
            {section.label}
          </button>
        ))}
      </div>

      <div className="profile-progress">
        <div className="profile-progress__track">
          <div
            className="profile-progress__fill"
            style={{ width: `${profileCompletionPct}%` }}
          />
        </div>
        <div className="profile-progress__meta">
          <span className="profile-progress__pct">
            Профиль готов на {profileCompletionPct}%
          </span>
          <span className="muted">
            {profileCompletionPct === 100
              ? "Можно откликаться и быть в поиске"
              : "Заполните разделы ниже"}
          </span>
        </div>
      </div>

      {applyReadiness.length > 0 && (
        <p className="profile-hint">
          <strong>Для отклика на вакансии</strong> добавьте:{" "}
          {applyReadiness.join(", ")}.
        </p>
      )}

      {activeTab === "basics" && (
        <>
          {profileError && (
            <div
              className="placeholder"
              style={{
                borderColor: "var(--risk)",
                color: "var(--risk)",
                marginBottom: 24,
              }}
            >
              {profileError}
            </div>
          )}

          <Section num="01" label="Личные данные">
            <p className="profile-sec-lead">
              Как вас будут видеть в профиле и при отклике.
            </p>
            <div className="fieldgrid">
            <div className="field">
              <span className="field-label">
                Имя
                <span className="field-tag field-tag--req">обязательно</span>
              </span>
              <input
                value={firstNameField}
                onChange={(event) => {
                  const last = lastNameField;
                  setFullName(
                    last
                      ? `${event.target.value} ${last}`
                      : event.target.value
                  );
                }}
                onBlur={() => setFirstNameTouched(true)}
                className="input"
                placeholder="Антон"
                autoComplete="given-name"
              />
              {firstNameError && (
                <span className="caption" style={errorCaptionStyle}>
                  {firstNameError}
                </span>
              )}
            </div>

            <div className="field">
              <span className="field-label">
                Фамилия
                <span className="field-tag field-tag--req">обязательно</span>
              </span>
              <input
                value={lastNameField}
                onChange={(event) => {
                  setFullName(
                    `${firstNameField} ${event.target.value}`.trim()
                  );
                }}
                onBlur={() => setLastNameTouched(true)}
                className="input"
                placeholder="Лебедев"
                autoComplete="family-name"
              />
              {lastNameError && (
                <span className="caption" style={errorCaptionStyle}>
                  {lastNameError}
                </span>
              )}
            </div>
            </div>
          </Section>

          <Section num="02" label="Позиция и формат">
            <p className="profile-sec-lead">
              Роль, город и формат — то, что HR видит в поиске.
            </p>
            <div className="fieldgrid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">
                Заголовок
                <span className="field-tag field-tag--req">обязательно</span>
              </span>
              <input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                className="input"
                placeholder="Senior Backend Engineer · Highload"
              />
              <span className="field-hint">
                Роль и специализация в одной строке, например «Frontend · React».
              </span>
            </div>

            <div className="field">
              <span className="field-label">
                Формат работы
                <span className="field-tag field-tag--opt">по желанию</span>
              </span>
              <FormDropdown
                value={workFormat}
                onChange={(v) => setWorkFormat(v as WorkFormat)}
                options={[
                  { value: "remote", label: "Удаленно" },
                  { value: "office", label: "Офис" },
                  { value: "hybrid", label: "Гибрид" },
                ]}
                placeholder="Удаленно"
                hideClearOption
                className="form-dropdown--field"
              />
            </div>

            <div className="field">
              <span className="field-label">
                Локация
                <span className="field-tag field-tag--req">обязательно</span>
              </span>
              <FormDropdown
                value={location}
                onChange={setLocation}
                options={[
                  { value: "", label: "Выберите город" },
                  { value: "Москва", label: "Москва" },
                  { value: "Санкт-Петербург", label: "Санкт-Петербург" },
                  { value: "Новосибирск", label: "Новосибирск" },
                  { value: "Екатеринбург", label: "Екатеринбург" },
                  { value: "Казань", label: "Казань" },
                  { value: "Нижний Новгород", label: "Нижний Новгород" },
                  { value: "Челябинск", label: "Челябинск" },
                  { value: "Самара", label: "Самара" },
                  { value: "Уфа", label: "Уфа" },
                  { value: "Ростов-на-Дону", label: "Ростов-на-Дону" },
                  { value: "Краснодар", label: "Краснодар" },
                  { value: "Воронеж", label: "Воронеж" },
                  { value: "Пермь", label: "Пермь" },
                  { value: "Волгоград", label: "Волгоград" },
                  { value: "Красноярск", label: "Красноярск" },
                ]}
                placeholder="Выберите город"
                inactiveValue=""
                hideClearOption
                className="form-dropdown--field"
              />
            </div>

            <div className="field">
              <span className="field-label">
                Грейд
                <span className="field-tag field-tag--req">обязательно</span>
              </span>
              <FormDropdown
                value={desiredRole}
                onChange={setDesiredRole}
                options={[
                  { value: "", label: "Выберите грейд" },
                  { value: "Junior", label: "Junior" },
                  { value: "Middle", label: "Middle" },
                  { value: "Senior", label: "Senior" },
                ]}
                placeholder="Выберите грейд"
                inactiveValue=""
                hideClearOption
                className="form-dropdown--field"
              />
            </div>
            </div>
          </Section>

          <Section num="03" label="О себе">
            <p className="profile-sec-lead">
              Опыт, сильные стороны и чего ищете — кратко, для HR.
            </p>
            <div className="field">
              <div className="profile-sec-meta">
                <span className="field-label">
                  Текст
                  <span className="field-tag field-tag--req">обязательно</span>
                </span>
                <span className="profile-sec-meta__counter">
                  {summary.length} / {SUMMARY_MAX}
                </span>
              </div>
              <textarea
                value={summary}
                onChange={(event) =>
                  setSummary(event.target.value.slice(0, SUMMARY_MAX))
                }
                rows={6}
                maxLength={SUMMARY_MAX}
                className="textarea"
                placeholder="Кратко опишите опыт, сильные стороны и карьерные цели."
              />
            </div>
          </Section>

          <Section num="04" label="Контакты">
            <p className="profile-sec-lead">
              Скрыты до отклика — работодатель увидит их после согласия.
            </p>
            <div className="fieldgrid">
            <div className="field">
              <span className="field-label">
                Email
                <span className="field-tag field-tag--opt">по желанию</span>
              </span>
              <input
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                onBlur={() => setContactEmailTouched(true)}
                className="input"
                placeholder="you@example.com"
              />
              {contactEmailError && (
                <span className="caption" style={errorCaptionStyle}>
                  {contactEmailError}
                </span>
              )}
            </div>

            <div className="field">
              <span className="field-label">
                Телефон
                <span className="field-tag field-tag--opt">по желанию</span>
              </span>
              <input
                type="tel"
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(formatRuPhoneInput(event.target.value))
                }
                onBlur={() => setContactPhoneTouched(true)}
                className="input"
                placeholder="+7 (999) 000-00-00"
                inputMode="tel"
                autoComplete="tel"
              />
              {contactPhoneError && (
                <span className="caption" style={errorCaptionStyle}>
                  {contactPhoneError}
                </span>
              )}
            </div>
            </div>
          </Section>

          <Section num="05" label="Резюме">
            <p className="profile-sec-lead">
              PDF для HR — дополнение к профилю.{" "}
              <span className="field-tag field-tag--opt">необязательно</span>
            </p>
            <div className="row" style={{ alignItems: "center", gap: 16 }}>
                {candidate?.resume ? (
                  <>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15 }}>
                        {candidate.resume.fileName}
                      </div>
                      <div
                        className="caption"
                        style={{
                          marginTop: 4,
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        загружено · {formatDate(candidate.resume.uploadedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        if (!candidate) return;
                        updateCandidate({ ...candidate, resume: undefined }).then(
                          setCandidate
                        );
                      }}
                      style={{
                        color: "var(--risk)",
                        borderColor: "var(--risk)",
                      }}
                    >
                      Удалить
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        className="btn btn-sm"
                        style={{ cursor: "pointer" }}
                      >
                        Загрузить резюме
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          style={{ display: "none" }}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file || !candidate) return;
                            try {
                              const resume = await uploadMyResume(file);
                              const updated = await updateCandidate({
                                ...candidate,
                                resume,
                              });
                              setCandidate(updated);
                              event.target.value = "";
                            } catch (err) {
                              console.warn("upload resume failed:", err);
                              alert(
                                err instanceof Error
                                  ? err.message
                                  : "Не удалось загрузить резюме"
                              );
                              event.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <div
                        className="caption"
                        style={{
                          marginTop: 8,
                          textTransform: "none",
                          letterSpacing: 0,
                        }}
                      >
                        PDF, до 10 МБ
                      </div>
                    </div>
                  </>
                )}
            </div>
          </Section>
        </>
      )}

      {activeTab === "experience" && (
      <div>
        <div className="profile-tab-toolbar">
          <div className="caption" style={{ color: "var(--muted)" }}>
            {candidateExperience.length
              ? `${candidateExperience.length} ${
                  candidateExperience.length === 1
                    ? "карточка опыта"
                    : candidateExperience.length >= 2 &&
                        candidateExperience.length <= 4
                      ? "карточки опыта"
                      : "карточек опыта"
                } в профиле`
              : "ни одной карточки"}
          </div>
          <button
            className="btn btn-sm"
            onClick={openExperienceModalForCreate}
          >
            Добавить
          </button>
        </div>
        {candidateExperience.length === 0 ? (
          <div className="profile-empty">
            <div className="profile-empty__title">
              Добавьте первую карточку опыта
            </div>
            <p className="profile-empty__desc">
              Работа, проекты или учеба — то, что HR должен знать о вас
            </p>
          </div>
        ) : (
          <div>
            {candidateExperience.map((experience) => {
              const evidenceItems = experience.evidence ?? [];
              const expRef = references.find(
                (r) => r.experienceId === experience.id
              );
              const hasContact =
                experience.referenceContactName?.trim() &&
                experience.referenceContactEmail?.trim() &&
                experience.referenceCompanyName?.trim();

              return (
                <div className="entry" key={experience.id}>
                  <div className="when">{experience.period}</div>

                  <div className="what">
                    <div className="role">{experience.role}</div>
                    <div className="co">
                      {experience.company} · {experience.employmentType}
                    </div>
                    <div className="scope">{experience.responsibilities}</div>

                    <div className="chips" style={{ marginTop: 14 }}>
                      {experience.stack.map((tech) => (
                        <span key={tech} className="chip">
                          {tech}
                        </span>
                      ))}
                    </div>

                    {evidenceItems.length > 0 && (
                      <div style={{ marginTop: 18 }}>
                        <div className="caption" style={{ marginBottom: 8 }}>
                          Материалы
                        </div>
                        <div className="dl">
                          {evidenceItems.map((evidence) => (
                            <div key={evidence.id}>
                              <span className="k">
                                {evidenceTypeLabels[evidence.type]}
                              </span>
                              <span className="v">
                                <a
                                  href={evidence.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    borderBottom: "1px solid var(--ink)",
                                  }}
                                >
                                  {evidence.title}
                                </a>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ marginTop: 20 }}>
                      <div className="caption" style={{ marginBottom: 10 }}>
                        Контакт референта
                      </div>

                      {hasContact ? (
                        <div className="dl" style={{ marginBottom: 12 }}>
                          <div>
                            <span className="k">Имя</span>
                            <span className="v">
                              {experience.referenceContactName}
                            </span>
                          </div>
                          <div>
                            <span className="k">Email</span>
                            <span className="v mono">
                              {experience.referenceContactEmail}
                            </span>
                          </div>
                          <div>
                            <span className="k">Компания</span>
                            <span className="v">
                              {experience.referenceCompanyName}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="caption"
                          style={{ marginBottom: 12, color: "var(--muted)" }}
                        >
                          Контакт не указан — добавьте имя и email при создании
                          опыта, чтобы запросить подтверждение.
                        </div>
                      )}

                      {expRef ? (
                        <div>
                          <Status tone={referenceStatusTones[expRef.status]}>
                            {referenceStatusLabels[expRef.status]}
                          </Status>
                          {/* FR-038b: SLA indicator when request is still pending */}
                          {(() => {
                            if (
                              expRef.status !== "pending" &&
                              expRef.status !== "delivered" &&
                              expRef.status !== "opened"
                            )
                              return null;
                            const expiresMs = new Date(expRef.expiresAt).getTime();
                            const daysLeft = Math.ceil(
                              (expiresMs - Date.now()) / (24 * 3600 * 1000)
                            );
                            if (Number.isNaN(daysLeft)) return null;
                            const expired = daysLeft <= 0;
                            const urgent = !expired && daysLeft <= 3;
                            return (
                              <div
                                style={{
                                  marginTop: 8,
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 11,
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                  color: expired
                                    ? "var(--risk)"
                                    : urgent
                                      ? "var(--warn)"
                                      : "var(--muted)",
                                }}
                              >
                                {expired
                                  ? "⚠ срок ответа истек"
                                  : `истекает через ${daysLeft} ${
                                      daysLeft === 1
                                        ? "день"
                                        : daysLeft < 5
                                          ? "дня"
                                          : "дней"
                                    }`}
                                {(urgent || expired) && (
                                  <button
                                    type="button"
                                    className="btn-link mono"
                                    style={{
                                      marginLeft: 12,
                                      fontSize: 11,
                                      letterSpacing: "0.04em",
                                    }}
                                    onClick={() => {
                                      const newContact = window.prompt(
                                        "Новый email референта:",
                                        experience.referenceContactEmail ?? ""
                                      );
                                      if (!newContact || !candidate) return;
                                      const updated = {
                                        ...candidate,
                                        experience: candidateExperience.map((e) =>
                                          e.id === experience.id
                                            ? {
                                                ...e,
                                                referenceContactEmail:
                                                  newContact.trim(),
                                              }
                                            : e
                                        ),
                                      };
                                      updateCandidate(updated).then(setCandidate);
                                    }}
                                  >
                                    поменять контакт →
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          {expRef.responseText && (
                            <div
                              className="caption"
                              style={{
                                marginTop: 8,
                                textTransform: "none",
                                lineHeight: 1.5,
                              }}
                            >
                              «{expRef.responseText}»
                            </div>
                          )}
                        </div>
                      ) : hasContact ? (
                        <div
                          className="caption"
                          style={{
                            textTransform: "none",
                            letterSpacing: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          Запрос ушел референту автоматически после сохранения.
                          Статус обновится здесь, как только придет ответ.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right">
                    <Status tone={experienceStatusTones[experience.status]}>
                      {experienceStatusLabels[experience.status]}
                    </Status>
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        gap: 12,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="btn-link mono"
                        onClick={() => openExperienceModalForEdit(experience)}
                        style={{ fontSize: 11 }}
                      >
                        изменить
                      </button>
                      <button
                        className="btn-link mono"
                        onClick={() => openEvidenceModal(experience.id)}
                        style={{ fontSize: 11 }}
                      >
                        добавить материалы
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {activeTab === "skills" && (
        <div>
          <div className="profile-tab-toolbar">
            <div className="caption" style={{ color: "var(--muted)" }}>
              {candidateSkills.length
                ? `${candidateSkills.length} ${
                    candidateSkills.length === 1 ? "навык" : "навыков"
                  } в профиле`
                : "Навыки из справочника — для откликов и поиска"}
            </div>
          </div>
          <ProfileSkillsEditor
            skills={candidateSkills}
            disabled={!candidate}
            maxSkills={SKILL_PICKER_MAX}
            onAdd={handleAddCandidateSkill}
            onUpdateYears={handleUpdateCandidateSkillYears}
            onDelete={handleDeleteCandidateSkill}
          />
        </div>
      )}

      {activeTab === "visibility" && (
        <Section num="01" label="Кто видит профиль">
          <p className="profile-sec-lead">
            Видимость в поиске. Контакты скрыты в любом режиме.
          </p>
          {(
            [
              {
                value: "public",
                title: "Публичный",
                desc: "Профиль участвует в поиске работодателей. Виден всем компаниям",
              },
              {
                value: "restricted",
                title: "Ограниченный",
                desc: "Профиль виден только в контексте ваших откликов. Не индексируется в поиске",
              },
              {
                value: "hidden",
                title: "Скрытый",
                desc: "Профиль никто не видит",
              },
            ] as Array<{ value: VisibilityMode; title: string; desc: string }>
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              className={`radio ${visibilityMode === option.value ? "on" : ""}`}
              onClick={() => setVisibilityMode(option.value)}
            >
              <span className="dot" />
              <span>
                <div className="ttl">{option.title}</div>
                <div className="desc">{option.desc}</div>
              </span>
            </button>
          ))}
        </Section>
      )}

      <div
        className={`profile-savebar${isProfileDirty ? " is-dirty" : ""}`}
      >
        <span className="profile-savebar__status">
          {isProfileDirty
            ? "Есть несохраненные изменения"
            : profileMessage || "Все изменения сохранены"}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSaveProfile}
        >
          Сохранить профиль
        </button>
      </div>
      </div>

      <FormSheet
        open={isExperienceModalOpen}
        onClose={() => {
          setIsExperienceModalOpen(false);
          resetExperienceForm();
        }}
        eyebrow={editingExperienceId ? "Редактирование" : "Новая карточка"}
        title={editingExperienceId ? "Изменить опыт" : "Добавить опыт"}
        error={experienceFormError || undefined}
        size="md"
        footerClassName={
          editingExperienceId ? "form-sheet__footer--split" : undefined
        }
        footer={
          <>
            {editingExperienceId ? (
              <button
                type="button"
                className="btn-link mono"
                onClick={handleDeleteExperience}
                style={{ fontSize: 12, color: "var(--risk)" }}
              >
                удалить опыт
              </button>
            ) : (
              <span />
            )}
            <div style={{ display: "flex", gap: 16 }}>
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
                {editingExperienceId ? "сохранить →" : "добавить опыт →"}
              </button>
            </div>
          </>
        }
      >
        <div className="fieldgrid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Тип карточки *</span>
                <FormDropdown
                  value={experienceType}
                  onChange={(v) => setExperienceType(v as ExperienceType)}
                  options={[
                    { value: "work", label: "Опыт работы" },
                    { value: "project", label: "Проект" },
                    { value: "education", label: "Образование" },
                  ]}
                  placeholder="Опыт работы"
                  hideClearOption
                  className="form-dropdown--field"
                />
              </div>

              {experienceType === "education" ? (
                <>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Учебное заведение *</span>
                    <input
                      value={educationInstitution}
                      onChange={(event) =>
                        setEducationInstitution(event.target.value)
                      }
                      className="input"
                      placeholder="МГТУ им. Баумана"
                    />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Специальность *</span>
                    <input
                      value={educationSpeciality}
                      onChange={(event) =>
                        setEducationSpeciality(event.target.value)
                      }
                      className="input"
                      style={{ fontSize: 20, letterSpacing: "-0.015em" }}
                      placeholder="Программная инженерия"
                    />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Период *</span>
                    <DateRangePicker
                      value={experiencePeriod}
                      onChange={setExperiencePeriod}
                    />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Степень / уровень</span>
                    <FormDropdown
                      value={educationDegree}
                      onChange={setEducationDegree}
                      options={[
                        { value: "", label: "Не указана" },
                        { value: "Бакалавриат", label: "Бакалавриат" },
                        { value: "Магистратура", label: "Магистратура" },
                        { value: "Аспирантура", label: "Аспирантура" },
                      ]}
                      placeholder="Не указана"
                      inactiveValue=""
                      hideClearOption
                      className="form-dropdown--field"
                    />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Дипломная работа</span>
                    <input
                      value={educationThesisTitle}
                      onChange={(event) =>
                        setEducationThesisTitle(event.target.value)
                      }
                      className="input"
                      placeholder="Тема выпускной квалификационной работы"
                    />
                  </div>
                </>
              ) : (
                <>
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

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Тип занятости</span>
                    <FormDropdown
                      value={experienceEmploymentType}
                      onChange={setExperienceEmploymentType}
                      options={[
                        { value: "Full-time", label: "Полная" },
                        { value: "Part-time", label: "Частичная" },
                        { value: "Contract", label: "Контракт" },
                        { value: "Freelance", label: "Фриланс" },
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
                      placeholder="Что вы делал на этой позиции?"
                    />
                  </div>

                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <span className="field-label">Стек / навыки *</span>
                    <SkillPicker
                      slots={experienceStackSlots}
                      onChange={setExperienceStackSlots}
                      max={SKILL_PICKER_MAX}
                    />
                  </div>

                  <div className="field">
                    <span className="field-label">Имя контакта</span>
                    <input
                      value={experienceReferenceContactName}
                      onChange={(event) =>
                        setExperienceReferenceContactName(event.target.value)
                      }
                      onBlur={() =>
                        setExperienceReferenceContactNameTouched(true)
                      }
                      className="input"
                      placeholder="Иван Иванов"
                      autoComplete="name"
                    />
                    {referenceContactNameError && (
                      <span className="caption" style={errorCaptionStyle}>
                        {referenceContactNameError}
                      </span>
                    )}
                  </div>

                  <div className="field">
                    <span className="field-label">Email контакта</span>
                    <input
                      value={experienceReferenceContactEmail}
                      onChange={(event) =>
                        setExperienceReferenceContactEmail(event.target.value)
                      }
                      onBlur={() =>
                        setExperienceReferenceContactEmailTouched(true)
                      }
                      className="input"
                      type="email"
                      placeholder="contact@company.com"
                      autoComplete="email"
                    />
                    {referenceContactEmailError && (
                      <span className="caption" style={errorCaptionStyle}>
                        {referenceContactEmailError}
                      </span>
                    )}
                  </div>
                </>
              )}
        </div>
      </FormSheet>

      <FormSheet
        open={isEvidenceModalOpen}
        onClose={() => {
          setIsEvidenceModalOpen(false);
          resetEvidenceForm();
        }}
        eyebrow="Материалы"
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
              добавить →
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
                <span className="field-label">
                  {evidenceType === "document" ||
                  evidenceType === "certificate"
                    ? "Ссылка"
                    : "Ссылка *"}
                </span>
                <input
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  className="input"
                  placeholder="https://..."
                />
              </div>

              {(evidenceType === "document" ||
                evidenceType === "certificate") && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <span className="field-label">Файл</span>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      alignItems: "center",
                      paddingTop: 8,
                    }}
                  >
                    {evidenceFileName ? (
                      <>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 15 }}>
                            {evidenceFileName}
                          </div>
                          <div
                            className="caption"
                            style={{
                              marginTop: 4,
                              textTransform: "none",
                              letterSpacing: 0,
                            }}
                          >
                            прикреплен · готов к загрузке
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setEvidenceFileName("")}
                          style={{
                            color: "var(--risk)",
                            borderColor: "var(--risk)",
                          }}
                        >
                          Удалить
                        </button>
                      </>
                    ) : (
                      <label
                        className="btn btn-sm"
                        style={{ cursor: "pointer" }}
                      >
                        Прикрепить файл
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          style={{ display: "none" }}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) setEvidenceFileName(file.name);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span className="field-label">Комментарий</span>
                <textarea
                  value={evidenceComment}
                  onChange={(event) => setEvidenceComment(event.target.value)}
                  rows={3}
                  className="textarea"
                  placeholder="Что подтверждает этот материал?"
                />
              </div>
        </div>
      </FormSheet>

    </>
  );
}
