import { redirect } from "next/navigation"

export default function NewReportRedirect() {
  redirect("/app/reports/new")
}
