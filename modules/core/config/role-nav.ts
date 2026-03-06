export type EdenRole = "consumer" | "business" | "owner";

type EdenRoleMeta = {
  label: string;
  heading: string;
  subheading: string;
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

export const topNavItems: Array<{ label: string; href: string }> = [
  { label: "Consumer", href: "/consumer" },
  { label: "Business", href: "/business" },
  { label: "Owner", href: "/owner" },
];
