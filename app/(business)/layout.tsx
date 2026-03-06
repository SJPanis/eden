import type { ReactNode } from "react";
import { RoleShell } from "@/modules/core/layout/role-shell";

type BusinessLayoutProps = {
  children: ReactNode;
};

export default function BusinessLayout({ children }: BusinessLayoutProps) {
  return <RoleShell role="business">{children}</RoleShell>;
}
