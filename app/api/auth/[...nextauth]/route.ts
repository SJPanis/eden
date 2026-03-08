import NextAuth from "next-auth/next";
import { buildEdenAuthJsOptions } from "@/modules/core/session/authjs-config";

const handler = NextAuth(buildEdenAuthJsOptions());

export { handler as GET, handler as POST };
