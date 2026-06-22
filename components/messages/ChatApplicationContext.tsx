import Link from "next/link";
import { Application } from "@/types/application";
import { Thread } from "@/types/message";
import { Status } from "@/components/ui/editorial";
import {
  applicationSourceLabel,
  getApplicationStageLabel,
} from "@/lib/applications/display";
import { formatDate } from "@/lib/utils/date";

type ChatApplicationContextProps = {
  thread: Thread;
  application: Application | null;
  vacancyHref: string | null;
  isHrViewer: boolean;
};

export function ChatApplicationContext({
  thread,
  application,
  vacancyHref,
  isHrViewer,
}: ChatApplicationContextProps) {
  const vacancyTitle = thread.vacancyTitle?.trim() || "Вакансия";
  const companyName = thread.companyName?.trim() || "Компания";
  const source = application?.source ?? "job_apply";
  const stage = application
    ? getApplicationStageLabel(application.status, application.source)
    : null;
  const appliedAt = application?.appliedAt;

  return (
    <div className="chat-context-card" role="note" aria-label="Контекст отклика">
      <div className="chat-context-card__head">
        <span className="chat-context-card__badge">
          {applicationSourceLabel(source)}
        </span>
        {stage && <Status tone={stage.tone}>{stage.label}</Status>}
      </div>

      <div className="chat-context-card__main">
        <p className="chat-context-card__vacancy">
          {vacancyHref ? (
            <Link href={vacancyHref}>{vacancyTitle}</Link>
          ) : (
            vacancyTitle
          )}
        </p>
        <p className="chat-context-card__meta">
          {companyName}
          {isHrViewer ? ` · ${thread.candidateName}` : ""}
          {appliedAt ? ` · ${formatDate(appliedAt)}` : ""}
        </p>
      </div>

      {vacancyHref && (
        <Link href={vacancyHref} className="chat-context-card__link mono">
          {isHrViewer ? "воронка →" : "вакансия →"}
        </Link>
      )}
    </div>
  );
}
