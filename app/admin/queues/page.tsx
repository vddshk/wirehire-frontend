import { redirect } from "next/navigation";

export default function AdminQueuesRedirect() {
  redirect("/admin/candidates");
}
