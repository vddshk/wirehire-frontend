# <img src="https://github.com/vddshk/wirehire-frontend/blob/main/public/brand-mark.svg" alt="logo" width="24"> [WireHire.ru](https://wirehire.ru)

Моя дипломная работа.

Frontend-часть платформы WireHire: верификация опыта, AI-оценка кандидатов, HR-воронка.

Стек: Next.js 16, React 19, TypeScript, Tailwind 4.

## Структура проекта

```
app/               — страницы (Next.js App Router)
  candidate/       — кабинет кандидата
  manager/         — кабинет менеджера
  (hr-side)        — HR: вакансии, кандидаты, воронка, проверки
components/
  ui/editorial.tsx — дизайн-система (PageHeader, Section, Stat, Status, …)
  AppShell.tsx     — layout: топбар + сайдбар
data/              — mock-данные (временный adapter)
lib/               — утилиты, работа с localStorage, логика
types/             — TypeScript-типы
```
