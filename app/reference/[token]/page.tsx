"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getReferenceByToken,
  markOpened,
  submitResponse,
} from "@/lib/api/references";
import { updateCandidate, getCandidateById } from "@/lib/api/candidates";
import { USE_REMOTE_API } from "@/lib/api/config";
import { ApiError, getErrorText } from "@/lib/api/adapters/remote/client";
import { addAuditEvent } from "@/lib/api/audit";
import { Reference, ReferenceStatus } from "@/types/reference";
import { ExperienceStatus } from "@/types/candidate";
import { formatDate } from "@/lib/utils/date";
import {
  PageHeader,
  Section,
  Status,
  Steps,
  Step,
  Placeholder,
} from "@/components/ui/editorial";

type Verdict = "positive" | "partial" | "negative";

const statusLabels: Record<ReferenceStatus, string> = {
  pending: "ожидает ответа",
  delivered: "доставлено",
  opened: "просмотрено",
  answered_positive: "подтверждено",
  answered_partial: "частично подтверждено",
  answered_negative: "не подтверждено",
  expired: "истек срок",
};

const statusTones: Record<ReferenceStatus, "good" | "warn" | "muted" | "risk"> =
  {
    pending: "muted",
    delivered: "muted",
    opened: "warn",
    answered_positive: "good",
    answered_partial: "warn",
    answered_negative: "risk",
    expired: "risk",
  };

const verdictToExperienceStatus: Record<Verdict, ExperienceStatus> = {
  positive: "verified",
  partial: "partially_verified",
  negative: "questionable",
};

export default function ReferencePublicPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  const [reference, setReference] = useState<Reference | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const [verdict, setVerdict] = useState<Verdict>("positive");
  const [responseText, setResponseText] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function load() {
      if (!token) {
        setIsLoaded(true);
        return;
      }

      const ref = await getReferenceByToken(token);
      setReference(ref);

      if (ref && (ref.status === "pending" || ref.status === "delivered")) {
        await markOpened(token);
        setReference((prev) =>
          prev ? { ...prev, status: "opened" } : prev
        );
      }

      setIsLoaded(true);
    }

    load();
  }, [token]);

  async function handleSubmit() {
    if (!reference) {
      return;
    }

    setFormError("");
    setIsBusy(true);

    try {
      const updated = await submitResponse(token!, { verdict, responseText });

      // В remote-режиме статусы опыта/аудит обновляет бэкенд на стороне сервера,
      // а публичный ответ не раскрывает candidateId — мок-побочку пропускаем.
      if (updated && !USE_REMOTE_API && updated.candidateId) {
        const candidate = await getCandidateById(updated.candidateId);

        if (candidate) {
          const updatedExperience = candidate.experience.map((exp) => {
            if (exp.id !== updated.experienceId) {
              return exp;
            }
            return { ...exp, status: verdictToExperienceStatus[verdict] };
          });

          await updateCandidate({
            ...candidate,
            experience: updatedExperience,
          });

          addAuditEvent({
            type: "reference_response_received",
            title: "Референт ответил",
            description: `Ответ по опыту ${updated.experienceId}: ${verdictLabels[verdict]}. ${responseText ? `Комментарий: ${responseText.slice(0, 80)}` : ""}`,
            actorRole: "System",
            candidateId: updated.candidateId,
            candidateName: candidate.fullName,
          });
        }
      }

      if (updated) {
        setReference(updated);
      }
      setIsSubmitted(true);
    } catch (err) {
      // Понятные сообщения по кодам публичного endpoint-а.
      if (err instanceof ApiError && err.status === 409) {
        setFormError("Вы уже отправляли ответ по этому запросу.");
      } else if (err instanceof ApiError && err.status === 410) {
        setFormError("Срок ответа по этой ссылке истек.");
      } else if (err instanceof ApiError && err.status === 404) {
        setFormError("Ссылка недействительна.");
      } else {
        setFormError(getErrorText(err, "Не удалось отправить ответ."));
      }
    } finally {
      setIsBusy(false);
    }
  }

  const verdictLabels: Record<Verdict, string> = {
    positive: "Подтверждаю",
    partial: "Частично подтверждаю",
    negative: "Не подтверждаю",
  };

  if (!isLoaded) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>
        <PageHeader title="Загрузка..." lead="Подгружаем данные запроса." />
      </div>
    );
  }

  if (!reference) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>
        <PageHeader
          eyebrow="Не найдено"
          title="Ссылка недействительна"
          lead="Запрос на подтверждение опыта не найден или ссылка устарела. Обратитесь к кандидату, чтобы он отправил новую."
        />
        <Placeholder>
          Токен: <span className="mono">{token ?? "—"}</span>
        </Placeholder>
      </div>
    );
  }

  const isExpired = reference.status === "expired";
  const isAnswered =
    reference.status === "answered_positive" ||
    reference.status === "answered_partial" ||
    reference.status === "answered_negative";

  if (isExpired) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>
        <PageHeader
          eyebrow="Истек срок"
          title="Срок ответа истек"
          lead="Ссылка на подтверждение опыта больше не активна. Если вы хотите ответить — попросите кандидата выслать новый запрос."
        />
      </div>
    );
  }

  if (isAnswered || isSubmitted) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>
        <PageHeader
          eyebrow="Спасибо"
          title="Ответ получен"
          lead="Ваш ответ зафиксирован. Кандидату поступит уведомление с результатом. Вы можете закрыть эту страницу."
        />
        {reference.status && (
          <div style={{ marginTop: 32 }}>
            <Status tone={statusTones[reference.status]}>
              {statusLabels[reference.status]}
            </Status>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px" }}>
      <PageHeader
        eyebrow="Запрос на подтверждение"
        title={
          <>
            Подтверждение
            <br />
            <em>опыта работы</em>
          </>
        }
        lead={`Кандидат ${reference.referenceContactName ? `указал вас (${reference.referenceContactName})` : "указал вас"} как контактное лицо для подтверждения опыта работы в компании ${reference.referenceCompanyName}.`}
      />

      <Section num="01" label="Что происходит">
        <Steps>
          <Step
            marker={<span className="mono muted">01</span>}
            title="Кандидат указал вас как референта"
            description="Он заполняет карточку опыта работы и оставляет ваш email для подтверждения. Мы отправляем ссылку без каких-либо обязательств с вашей стороны."
          />
          <Step
            marker={<span className="mono muted">02</span>}
            title="Вы выбираете вариант ответа"
            description="Подтвердить, частично подтвердить или не подтверждать. Комментарий — опционально."
          />
          <Step
            marker={<span className="mono muted">03</span>}
            title="Ответ влияет на статус карточки опыта"
            description="Ваш ответ помогает работодателю оценить достоверность резюме кандидата. Данные не раскрываются третьим лицам."
          />
        </Steps>
      </Section>

      <Section num="02" label="Данные запроса">
        <div className="dl">
          <div>
            <span className="k">Компания</span>
            <span className="v">{reference.referenceCompanyName}</span>
          </div>
          <div>
            <span className="k">Контакт</span>
            <span className="v">{reference.referenceContactName || "—"}</span>
          </div>
          <div>
            <span className="k">Запрошено</span>
            <span className="v mono">{reference.requestedAt}</span>
          </div>
          <div>
            <span className="k">Действует до</span>
            <span className="v mono">{formatDate(reference.expiresAt)}</span>
          </div>
          <div>
            <span className="k">Статус</span>
            <span className="v">
              <Status tone={statusTones[reference.status]}>
                {statusLabels[reference.status]}
              </Status>
            </span>
          </div>
        </div>
      </Section>

      <Section num="03" label="Ваш ответ">
        {formError && (
          <div
            className="placeholder"
            style={{
              borderColor: "var(--risk)",
              color: "var(--risk)",
              marginBottom: 24,
            }}
          >
            {formError}
          </div>
        )}

        <div className="fieldgrid">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Выберите вариант *</span>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(["positive", "partial", "negative"] as Verdict[]).map((v) => (
                <button
                  key={v}
                  className={`btn ${verdict === v ? "btn-primary" : ""}`}
                  onClick={() => setVerdict(v)}
                  style={{ minWidth: 180 }}
                >
                  {verdictLabels[v]}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Комментарий (опционально)</span>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              className="textarea"
              placeholder="Уточните детали, если необходимо..."
            />
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isBusy}
          >
            {isBusy ? "Отправляем..." : "Отправить ответ →"}
          </button>
        </div>
      </Section>
    </div>
  );
}
