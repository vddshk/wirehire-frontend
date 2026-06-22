import type { CompanyLegalForm } from "@/lib/utils/companyLegalForm";

export type CompanyStatus = "pending_moderation" | "active" | "suspended";

export type Company = {
  id: string;
  /** Публичное имя, обычно `ООО «Бренд»`. */
  name: string;
  /** Краткое имя без префикса ОПФ. */
  brandName?: string;
  /** Код ОПФ: ooo, pao, ip и т.д. */
  legalForm?: CompanyLegalForm;
  legalName?: string;
  website?: string;
  industry?: string;
  description?: string;
  status: CompanyStatus;
  ownerUserId?: string;
  ownerName?: string;
  ownerEmail?: string;
  /** Заметка админа при модерации. */
  moderationNote?: string;
  rejectionReason?: string;
  documentsRequestedAt?: string;
  moderatedAt?: string;
  createdAt: string;
};

export type ModerateCompanyInput = {
  status: CompanyStatus;
  moderationNote?: string;
  rejectionReason?: string;
  requestDocuments?: boolean;
};
