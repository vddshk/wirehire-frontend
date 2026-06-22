import { Skill } from "@/types/skill";

export const mockSkills: Skill[] = [
  {
    id: "skill-1",
    candidateId: "cand-demo-current",
    name: "React",
    category: "frontend",
    status: "confirmed",
    selfReportedLevel: 5,
    assessmentScore: 87,
    updatedAt: "2026-05-10",
  },
  {
    id: "skill-2",
    candidateId: "cand-demo-current",
    name: "TypeScript",
    category: "frontend",
    status: "partially_confirmed",
    selfReportedLevel: 4,
    assessmentScore: 72,
    updatedAt: "2026-05-10",
  },
];
