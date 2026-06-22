import { Status, StatusTone } from "@/components/ui/editorial";
import type {
  SkillVerification,
  SkillVerificationStatus,
} from "@/types/skillVerification";

const statusLabels: Record<SkillVerificationStatus, string> = {
  verified: "подтвержден",
  partially_verified: "частично",
  questionable: "под вопросом",
};

const statusTones: Record<SkillVerificationStatus, StatusTone> = {
  verified: "good",
  partially_verified: "warn",
  questionable: "risk",
};

export function SkillVerificationList({
  items,
}: {
  items: SkillVerification[];
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <div>
      {items.map((sv) => (
        <div className="entry" key={sv.id}>
          <div className="when">{sv.skillLabel || "Навык"}</div>
          <div className="what">
            <div className="role">
              {sv.score != null ? `${Math.round(sv.score)} баллов` : "—"}
            </div>
            {sv.reason && (
              <div
                className="caption"
                style={{ marginTop: 6, textTransform: "none", letterSpacing: 0 }}
              >
                {sv.reason}
              </div>
            )}
          </div>
          <div className="text-right">
            <Status tone={statusTones[sv.status]}>
              {statusLabels[sv.status]}
            </Status>
          </div>
        </div>
      ))}
    </div>
  );
}
