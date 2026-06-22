import { ProfileReport } from "@/types/profileReport";

export const mockProfileReports: ProfileReport[] = [
  {
    id: "preport-1",
    candidateId: "cand-demo-current",
    version: 1,
    generatedAt: "2026-05-12 11:30",
    weights: {
      experience: 0.4,
      skills: 0.35,
      references: 0.15,
      proctoring: 0.1,
    },
    overallStatus: "partially_verified",
    confidenceLevel: "medium",
    experienceScore: 72,
    skillsScore: 80,
    referencesScore: 100,
    proctoringScore: null,
    weightedScore: 78,
    referencesPositiveCount: 1,
    referencesTotalCount: 1,
    summary:
      "Профиль частично подтвержден: референт дал положительный ответ, общая AI-оценка — выше среднего. Прокторинг не использовался — вес перераспределен между активными блоками.",
    keyFindings: [
      "Опыт во Frontend Engineering подтвержден референтом",
      "AI-оценка по React/TypeScript — выше среднего",
    ],
    risks: [
      "Второй референт еще не запрошен — при расширении профиля confidence может снизиться",
    ],
    nextSteps: [
      "Дождаться ответа второго референта или указать альтернативный контакт",
    ],
    profileSnapshot: {
      experienceCount: 2,
      skillsCount: 8,
      hasProctoring: false,
    },
    aiScreening: {
      provider: "ai",
      model: "ai-screening-v1",
      generatedAt: "2026-05-12T11:28:00.000Z",
      overallRationale:
        "Сильные ответы по React/TypeScript; продуктовый блок без метрик снижает уверенность.",
      recommendation: "hold",
      questionEvaluations: [
        {
          questionId: "q1",
          skill: "React",
          questionText: "Опишите опыт с React: архитектура, state, тесты.",
          answerExcerpt: "Использовал hooks, context, Jest + RTL…",
          score: 84,
          rationale: "Есть стек и практики, мало цифр по масштабу.",
        },
      ],
    },
  },
  {
    id: "preport-2",
    candidateId: "1",
    version: 2,
    generatedAt: "2026-05-15 14:20",
    weights: {
      experience: 0.4,
      skills: 0.35,
      references: 0.15,
      proctoring: 0.1,
    },
    overallStatus: "questionable",
    confidenceLevel: "low",
    experienceScore: 58,
    skillsScore: 64,
    referencesScore: 0,
    proctoringScore: 41,
    weightedScore: 48,
    referencesPositiveCount: 0,
    referencesTotalCount: 2,
    summary:
      "Несогласованность между ответами референтов и AI-оценка: оба референта дали нейтральные/негативные ответы, при этом assessment показал средний уровень. Прокторинг зафиксировал переключения окон.",
    keyFindings: [
      "Общая AI-оценка по React/TypeScript — 64/100",
      "Прокторинг: 4 переключения окна за 32 минуты",
    ],
    risks: [
      "Оба референта отметили несоответствие заявленным ролям",
      "Низкий confidence — нужна ручная проверка аналитиком",
    ],
    nextSteps: [
      "Передать в /admin/disputes для пересмотра",
      "Запросить дополнительные подтверждения опыта",
    ],
    profileSnapshot: {
      experienceCount: 2,
      skillsCount: 6,
      hasProctoring: true,
    },
  },
  {
    id: "preport-3",
    candidateId: "3",
    version: 1,
    generatedAt: "2026-05-18 09:15",
    weights: {
      experience: 0.4,
      skills: 0.35,
      references: 0.15,
      proctoring: 0.1,
    },
    overallStatus: "insufficient_data",
    confidenceLevel: "low",
    experienceScore: 34,
    skillsScore: 28,
    referencesScore: null,
    proctoringScore: null,
    weightedScore: 34,
    referencesPositiveCount: 0,
    referencesTotalCount: 0,
    summary:
      "Недостаточно данных: одна запись опыта без evidence, общая AI-оценка не пройдена, референты не запрошены. Активен только блок опыта.",
    keyFindings: [
      "1 запись опыта без evidence",
      "Навыки заявлены, но не подтверждены assessment",
    ],
    risks: [
      "Невозможно сформировать trust-score с приемлемым confidence",
    ],
    nextSteps: [
      "Дождаться прохождения кандидатом общей AI-оценки",
      "Эскалировать в /admin/disputes при необходимости",
    ],
    profileSnapshot: {
      experienceCount: 1,
      skillsCount: 4,
      hasProctoring: false,
    },
  },
];
