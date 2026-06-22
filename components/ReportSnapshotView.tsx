"use client";

import { useMemo } from "react";
import { Status, StatusTone } from "@/components/ui/editorial";
import { formatDate } from "@/lib/utils/date";
import {
  buildReportSummary,
  formatAiProviderLabel,
  formatReportVersion,
  localizeReportText,
  reportStatusLabel,
  withoutYo,
} from "@/lib/utils/reportDisplay";
import type {
  AiQuestionEvaluation,
  ReportOverallStatus,
  ReportSnapshot,
} from "@/types/reportSnapshot";

const statusTones: Record<ReportOverallStatus, StatusTone> = {
  verified: "good",
  partially_verified: "warn",
  questionable: "risk",
  insufficient_data: "muted",
};

const confidenceLabels = {
  high: "высокая",
  medium: "средняя",
  low: "низкая",
} as const;

function scoreText(value?: number): string {
  return value != null ? String(Math.round(value)) : "—";
}

function displayText(value?: string | null): string {
  if (!value) return "";
  return localizeReportText(value);
}

type SkillEvaluationGroup = {
  skill: string;
  items: AiQuestionEvaluation[];
  averageScore: number;
};

function groupEvaluationsBySkill(
  evaluations: AiQuestionEvaluation[]
): SkillEvaluationGroup[] {
  const map = new Map<string, AiQuestionEvaluation[]>();

  for (const item of evaluations) {
    const key = item.skill.trim() || "Без навыка";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([skill, items]) => ({
    skill,
    items,
    averageScore: Math.round(
      items.reduce((sum, item) => sum + item.score, 0) / items.length
    ),
  }));
}

type ReportSnapshotViewProps = {
  snapshot: ReportSnapshot;
  /** Полный отчет на отдельной странице; на профиле — только шапка. */
  variant?: "full" | "summary";
  showPdfAction?: boolean;
};

export function ReportSnapshotView({
  snapshot,
  variant = "full",
  showPdfAction = true,
}: ReportSnapshotViewProps) {
  const isSummary = variant === "summary";
  const isOverridden = !!snapshot.overrideStatus;
  const ai = snapshot.aiScreening;

  const skillGroups = useMemo(
    () =>
      !isSummary && ai?.questionEvaluations?.length
        ? groupEvaluationsBySkill(ai.questionEvaluations)
        : [],
    [ai?.questionEvaluations, isSummary]
  );

  const summaryText = buildReportSummary(snapshot);
  const aiProviderLabel = formatAiProviderLabel(ai?.provider, ai?.model);

  function handlePrintPdf() {
    if (typeof window === "undefined") return;
    window.print();
  }

  const weights = snapshot.weightsSnapshot;

  return (
    <div className="report-snapshot report-print-root">
      {showPdfAction && !isSummary && (
        <div className="report-snapshot__export">
          <div className="report-snapshot__export-copy">
            <span className="eyebrow">WireHire</span>
            <p className="report-snapshot__export-title">
              Отчет профиля кандидата
            </p>
            <p className="report-snapshot__export-lead">
              Сохраните полный снимок проверки для команды — опыт, навыки,
              референты и AI-оценка в одном документе.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg report-snapshot__export-btn"
            onClick={handlePrintPdf}
          >
            Скачать PDF
          </button>
          <p className="caption report-snapshot__export-hint report-print-hint">
            Откроется печать — выберите «Сохранить как PDF».
          </p>
        </div>
      )}

      <div className="report-snapshot__scoreboard">
        <div className="report-snapshot__score-main">
          <div className="report-snapshot__score-number mono">
            {scoreText(snapshot.weightedScore)}
          </div>
          <Status tone={statusTones[snapshot.effectiveOverallStatus]}>
            {reportStatusLabel(snapshot.effectiveOverallStatus)}
          </Status>
          {isOverridden && (
            <span className="caption report-snapshot__override-tag">
              изменен HR
            </span>
          )}
          <p className="report-snapshot__score-caption">{summaryText}</p>
        </div>

        <div className="report-snapshot__score-aside">
          <dl className="report-snapshot__facts">
            <div>
              <dt>уверенность</dt>
              <dd>{confidenceLabels[snapshot.confidenceLevel]}</dd>
            </div>
            <div>
              <dt>версия</dt>
              <dd className="mono">
                {formatReportVersion(
                  snapshot.version,
                  snapshot.generatedAt
                    ? formatDate(snapshot.generatedAt)
                    : undefined
                )}
              </dd>
            </div>
          </dl>

          <div className="report-snapshot__metrics">
            <MetricRow
              label="навыки"
              value={scoreText(snapshot.skillsScore)}
              weight={weights ? Math.round(weights.skills * 100) : undefined}
            />
            <MetricRow
              label="опыт"
              value={scoreText(snapshot.experienceScore)}
              weight={
                weights ? Math.round(weights.experience * 100) : undefined
              }
            />
            <MetricRow
              label="референты"
              value={`${scoreText(snapshot.referencesScore)} · ${snapshot.referencesPositiveCount}/${snapshot.referencesTotalCount}`}
              weight={
                weights?.references != null
                  ? Math.round(weights.references * 100)
                  : undefined
              }
            />
            <MetricRow
              label="прокторинг"
              value={scoreText(snapshot.proctoringScore)}
              weight={
                weights ? Math.round(weights.proctoring * 100) : undefined
              }
            />
          </div>
        </div>
      </div>

      {isOverridden && snapshot.overrideReason && (
        <div className="report-snapshot__notice">
          HR изменил статус (исходный:{" "}
          {reportStatusLabel(snapshot.overallStatus)}). Причина:{" "}
          {displayText(snapshot.overrideReason)}
        </div>
      )}

      {!isSummary && ai && (
        <section className="report-snapshot__ai">
          <header className="report-snapshot__ai-head">
            <div>
              <div className="caption">AI-оценка навыков</div>
              {(aiProviderLabel || ai.generatedAt) && (
                <p className="report-snapshot__ai-meta">
                  {aiProviderLabel ?? "AI-оценка"}
                  {ai.generatedAt ? ` · ${formatDate(ai.generatedAt)}` : ""}
                </p>
              )}
            </div>
          </header>

          {ai.overallRationale && (
            <p className="report-snapshot__ai-lead">
              {displayText(ai.overallRationale)}
            </p>
          )}

          {skillGroups.length > 0 && (
            <div className="report-snapshot__skills">
              {skillGroups.map((group) => (
                <article className="report-skill-block" key={group.skill}>
                  <header className="report-skill-block__head">
                    <h3 className="report-skill-block__title">
                      {displayText(group.skill)}
                    </h3>
                    <span className="report-skill-block__score mono">
                      {group.averageScore} из 100
                    </span>
                  </header>

                  <ul className="report-skill-block__questions">
                    {group.items.map((item, index) => (
                      <li className="report-skill-q" key={item.questionId}>
                        {group.items.length > 1 && (
                          <div className="report-skill-q__index caption">
                            Вопрос {index + 1}
                          </div>
                        )}
                        <div className="report-skill-q__row">
                          <p className="report-skill-q__question">
                            {displayText(item.questionText)}
                          </p>
                          <span className="report-skill-q__score mono">
                            {item.score} из 100
                          </span>
                        </div>
                        {item.answerExcerpt && (
                          <blockquote className="report-skill-q__answer">
                            {displayText(item.answerExcerpt)}
                          </blockquote>
                        )}
                        <p className="report-skill-q__rationale">
                          {displayText(item.rationale)}
                        </p>
                        {item.attentionFlags && item.attentionFlags.length > 0 && (
                          <ul className="report-skill-q__flags">
                            {item.attentionFlags.map((flag) => (
                              <li key={flag}>{displayText(flag)}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}

          {ai.caseEvaluation && (
            <article className="report-skill-block report-skill-block--case">
              <header className="report-skill-block__head">
                <h3 className="report-skill-block__title">Практический кейс</h3>
                <span className="report-skill-block__score mono">
                  {ai.caseEvaluation.score} из 100
                </span>
              </header>
              <p className="report-skill-q__rationale">
                {displayText(ai.caseEvaluation.rationale)}
              </p>
              {ai.caseEvaluation.attentionFlags &&
                ai.caseEvaluation.attentionFlags.length > 0 && (
                  <ul className="report-skill-q__flags">
                    {ai.caseEvaluation.attentionFlags.map((flag) => (
                      <li key={flag}>{displayText(flag)}</li>
                    ))}
                  </ul>
                )}
            </article>
          )}
        </section>
      )}

      {!isSummary && snapshot.keyFindings.length > 0 && (
        <ReportBlock title="Ключевые выводы" items={snapshot.keyFindings} />
      )}
      {!isSummary && snapshot.risks.length > 0 && (
        <ReportBlock
          title="На что обратить внимание"
          items={snapshot.risks}
          tone="risk"
        />
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  weight,
}: {
  label: string;
  value: string;
  weight?: number;
}) {
  return (
    <div className="report-metric">
      <span className="report-metric__label">{label}</span>
      <span className="report-metric__value mono">{value}</span>
      {weight != null && (
        <span className="report-metric__weight">{weight}%</span>
      )}
    </div>
  );
}

function ReportBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "risk";
}) {
  return (
    <section className="report-snapshot__block">
      <h3 className="caption report-snapshot__block-title">{title}</h3>
      <ul className={`report-snapshot__list${tone === "risk" ? " is-risk" : ""}`}>
        {items.map((item, index) => (
          <li key={index}>{displayText(item)}</li>
        ))}
      </ul>
    </section>
  );
}
