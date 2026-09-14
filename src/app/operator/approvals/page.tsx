import { redirect } from "next/navigation";

/** Approvals live at /operator; keep this path as an alias. */
export default function OperatorApprovalsAliasPage() {
  redirect("/operator");
}
