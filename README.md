# WireHire — Frontend

Frontend-часть платформы WireHire: верификация опыта, AI-assessment кандидатов, HR-pipeline.

Стек: Next.js 16, React 19, TypeScript, Tailwind 4.

## Быстрый старт

```bash
npm install
cp .env.example .env.local
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

## Команды

| Команда | Описание |
|---|---|
| `npm run dev` | Dev-сервер с hot reload |
| `npm run build` | Production-сборка |
| `npm run start` | Запуск production-сборки |
| `npm run typecheck` | Проверка типов (tsc --noEmit) |
| `npm run lint` | ESLint |

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Базовый URL backend API | `http://localhost:8080` |
| `NEXT_PUBLIC_USE_MOCK_API` | Использовать mock вместо API | `true` |

Скопируй `.env.example` в `.env.local` и настрой значения.

## Структура проекта

```
app/               — страницы (Next.js App Router)
  candidate/       — кабинет кандидата
  manager/         — кабинет менеджера
  (hr-side)        — HR: вакансии, кандидаты, pipeline, проверки
components/
  ui/editorial.tsx — дизайн-система (PageHeader, Section, Stat, Status, …)
  AppShell.tsx     — layout: топбар + сайдбар
data/              — mock-данные (временный adapter)
lib/               — утилиты, работа с localStorage, логика
types/             — TypeScript-типы
```

## Режим mock

По умолчанию `NEXT_PUBLIC_USE_MOCK_API=true` — данные хранятся в localStorage, backend не нужен.
Для работы с реальным API: `NEXT_PUBLIC_USE_MOCK_API=false` и выставить `NEXT_PUBLIC_API_URL`.
