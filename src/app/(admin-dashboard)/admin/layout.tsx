import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import AdminShell from "@/app/components/admin/admin-shell";

import {
  authenticateAdminSession,
} from "@/backend/modules/admin-auth/adminAuth.service";

import {
  ADMIN_SESSION_COOKIE,
} from "@/backend/modules/admin-auth/adminAuth.constants";

export const instant = false;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // Ensure authentication runs only at request time.
  await connection();

  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(
    ADMIN_SESSION_COOKIE,
  )?.value;

  if (!sessionToken) {
    redirect("/admin/login");
  }

  const authenticatedAdmin =
    await authenticateAdminSession(sessionToken);

  if (!authenticatedAdmin) {
    redirect("/admin/login");
  }

  return (
  <AdminShell
    admin={authenticatedAdmin.admin}
  >
    {children}
  </AdminShell>
);
}