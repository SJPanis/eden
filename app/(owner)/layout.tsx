import type { ReactNode } from "react";
import { RoleShell } from "@/modules/core/layout/role-shell";

type OwnerLayoutProps = {
  children: ReactNode;
};

export default function OwnerLayout({ children }: OwnerLayoutProps) {
  return <RoleShell role="owner">{children}</RoleShell>;
}
