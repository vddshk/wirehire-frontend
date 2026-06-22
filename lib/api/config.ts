// Per-facade switches: each domain facade (vacancies.ts, session.ts, …) picks
// remote or local independently. Even when USE_REMOTE_API is on globally, a
// facade may stay on local because its remote adapter isn't ready yet (e.g.
// auth waits for Sanctum migration).

const mockFlag = process.env.NEXT_PUBLIC_USE_MOCK_API ?? "true";
const hasApiBaseUrl = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

export const USE_MOCK_API = mockFlag !== "false";
export const USE_REMOTE_API = !USE_MOCK_API && hasApiBaseUrl;
