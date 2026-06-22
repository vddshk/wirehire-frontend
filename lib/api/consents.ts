import { USE_REMOTE_API } from "./config";
import * as local from "./adapters/local/consents";
import * as remote from "./adapters/remote/consents";

// Facade — переключает реализацию по USE_REMOTE_API. Локальный адаптер все
// еще нужен для mock-режима без бэка (тесты, демо без сети).
const impl = USE_REMOTE_API ? remote : local;

export const {
  consentTypeOrder,
  getConsents,
  getConsentsByCandidateId,
  getConsentById,
  getConsentSlotsByCandidateId,
  createConsent,
  ensureConsent,
  requestConsent,
  acceptConsent,
  revokeConsent,
  expireConsent,
} = impl;

export type { ConsentSlot, CreateConsentInput } from "./adapters/local/consents";
