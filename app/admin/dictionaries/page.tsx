import { redirect } from "next/navigation";

export default function AdminDictionariesRedirect() {
  redirect("/admin/candidates");
}
