import type { ReportSnapshot } from "@/types/reportSnapshot";

export const mockReportSnapshots: ReportSnapshot[] = [
  {
    id: "rsnap-demo-1",
    verificationRunId: "vr-demo-1",
    vacancyId: "vac-1",
    reportType: "full",
    version: 1,
    generatedAt: "2026-06-03T14:20:00.000Z",
    overallStatus: "partially_verified",
    effectiveOverallStatus: "partially_verified",
    confidenceLevel: "medium",
    summary:
      "AI-скрининг показал уверенное владение .NET и Agile, но ответ по Product Management поверхностный. Опыт в ООО Русская ждет референта — итоговая уверенность средняя.",
    experienceScore: 62,
    skillsScore: 83,
    proctoringScore: 91,
    weightedScore: 78,
    referencesPositiveCount: 0,
    referencesTotalCount: 1,
    keyFindings: [
      "C# и .NET — развернутые ответы с примерами из практики",
      "Agile/Scrum — корректная терминология, есть опыт ритуалов",
      "Карточка опыта отправлена референту, ответа пока нет",
    ],
    risks: [
      "Product Management — мало конкретики по метрикам и результатам",
      "Один источник подтверждения опыта — только AI-тест",
    ],
    nextSteps: [
      "Дождаться ответа референта по карточке «ООО Русская»",
      "На интервью уточнить продуктовые кейсы и KPI",
    ],
    aiScreening: {
      provider: "ai",
      model: "ai-screening-v1",
      generatedAt: "2026-06-03T14:18:00.000Z",
      overallRationale:
        "Средний взвешенный балл 78: сильные технические навыки компенсируют слабый продуктовый блок. Без референта нельзя ставить «подтвержден».",
      recommendation: "hold",
      questionEvaluations: [
        {
          questionId: "q1",
          skill: "C#",
          questionText:
            "Опишите практический опыт с C#: задачи, инструменты, результат.",
          answerExcerpt: "Работал с ASP.NET Core, EF, писал API для внутренних сервисов…",
          score: 86,
          rationale:
            "Есть стек, типы задач и результат. Не хватает метрик производительности.",
          attentionFlags: ["нет цифр по нагрузке"],
        },
        {
          questionId: "q2",
          skill: "Product Management",
          questionText:
            "Опишите опыт управления продуктом: приоритизация, метрики, стейкхолдеры.",
          answerExcerpt: "Участвовал в бэклоге, общался с заказчиком…",
          score: 68,
          rationale:
            "Общие формулировки без конкретных метрик и артефактов (roadmap, OKR).",
          attentionFlags: ["мало метрик", "нет примеров артефактов"],
        },
      ],
      caseEvaluation: {
        score: 75,
        rationale: "Кейс по API описан структурно, слабо раскрыты риски PII.",
        attentionFlags: ["слабая проработка персональных данных"],
      },
    },
  },
];
