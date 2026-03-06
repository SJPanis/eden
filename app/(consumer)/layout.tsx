import type { ReactNode } from "react";
import { RoleShell } from "@/modules/core/layout/role-shell";

type ConsumerLayoutProps = {
  children: ReactNode;
};

export default function ConsumerLayout({ children }: ConsumerLayoutProps) {
  return <RoleShell role="consumer">{children}</RoleShell>;
}
