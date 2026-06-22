export type NotificationType =
  | "application_received"
  | "application_confirmed"
  | "consent_requested"
  | "verification_completed"
  | "assessment_assigned"
  | "assessment_reminder"
  | "report_ready"
  | "reference_received"
  | "manager_decision"
  | "profile_admitted"
  | "new_message"
  | "system";

export type NotificationChannel = "in_app" | "email" | "sms";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
};
