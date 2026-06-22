import { redirect } from "next/navigation";

export default function AdminVerificationWeightsRedirect() {
  redirect("/admin/candidates");
}
