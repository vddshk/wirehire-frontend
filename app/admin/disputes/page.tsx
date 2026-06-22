import { redirect } from "next/navigation";

export default function AdminDisputesRedirect() {
  redirect("/admin/candidates");
}
