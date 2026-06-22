import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/references";
import * as remote from "./adapters/remote/references";
import type { Reference } from "@/types/reference";
import type { SubmitReferenceResponse } from "./adapters/local/references";

// Публичная форма референта (по токену) — при remote ходим на /ref/*
// (auth: "none"). При сбое/мок-режиме — local.
export async function getReferenceByToken(
  token: string
): Promise<Reference | null> {
  if (USE_REMOTE_API) {
    try {
      return await remote.getReferenceByToken(token);
    } catch {
      return local.getReferenceByToken(token);
    }
  }
  return local.getReferenceByToken(token);
}

export async function markOpened(token: string): Promise<Reference | null> {
  if (USE_REMOTE_API) {
    try {
      return await remote.markOpened(token);
    } catch {
      // open опционален — молча игнорируем сбой
      return null;
    }
  }
  return local.markOpened(token);
}

// submitResponse: при remote — без local-fallback, чтобы ошибки бэка
// (409 уже отвечал / 410 истек / 422) долетали до страницы и показывались.
export async function submitResponse(
  token: string,
  response: SubmitReferenceResponse
): Promise<Reference | null> {
  if (USE_REMOTE_API) {
    return remote.submitResponse(token, response);
  }
  return local.submitResponse(token, response);
}

// Остальное (списки для кабинета кандидата, создание) — пока local.
export {
  getReferences,
  getReferencesByExperienceId,
  getReferencesByCandidateId,
  createForExperience,
} from "./adapters/local/references";

export type {
  CreateReferenceInput,
  SubmitReferenceResponse,
} from "./adapters/local/references";
