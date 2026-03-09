export type EdenRole = "consumer" | "business" | "owner";

type EdenRoleMeta = {
  label: string;
  heading: string;
  subheading: string;
};

type EdenTopNavItem = {
  label: string;
  href: string;
  accessLabel: string;
  allowedRoles?: EdenRole[];
};

export const roleMeta: Record<EdenRole, EdenRoleMeta> = {
  consumer: {
    label: "Consumer",
    heading: "Consumer Home",
    subheading:
      "Discover businesses, services, and AI-first recommendations through the v1 platform shell.",
  },
  business: {
    label: "Business",
    heading: "Business Dashboard",
    subheading:
      "Build and operate your business app with lightweight create, test, and publish placeholders.",
  },
  owner: {
    label: "Owner",
    heading: "Owner Dashboard",
    subheading:
      "Monitor users, businesses, approvals, and platform status with isolated owner visibility.",
  },
};

export const topNavItems: EdenTopNavItem[] = [
  { label: "Consumer", href: "/consumer", accessLabel: "Consumer only", allowedRoles: ["consumer"] },
  { label: "Business", href: "/business", accessLabel: "Business only", allowedRoles: ["business"] },
  { label: "Owner", href: "/owner", accessLabel: "Owner only", allowedRoles: ["owner"] },
];
