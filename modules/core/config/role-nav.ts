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
    heading: "AI Search and Service Browser",
    subheading:
      "Search published AI services, compare visible pricing, and spend Eden Leaves to run them inside Eden.",
  },
  business: {
    label: "Business",
    heading: "Builder Workspace",
    subheading:
      "Build, expand, and collaborate on services, pricing, publishing, and monetization inside Eden.",
  },
  owner: {
    label: "Owner",
    heading: "Owner Dashboard",
    subheading:
      "Monitor users, businesses, approvals, and platform status with isolated owner visibility.",
  },
};

export const topNavItems: EdenTopNavItem[] = [
  { label: "Consumer", href: "/consumer", accessLabel: "Consumer and owner", allowedRoles: ["consumer", "owner"] },
  { label: "Business", href: "/business", accessLabel: "Business and owner", allowedRoles: ["business", "owner"] },
  { label: "Owner", href: "/owner", accessLabel: "Owner only", allowedRoles: ["owner"] },
];

