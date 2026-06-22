import { redirect } from "next/navigation";

export default function CandidateVerificationRedirectPage() {
  redirect("/candidate/dashboard");
}
