import NextAuth from "next-auth";

import { authOptions } from "~/config/auth";

export default NextAuth(authOptions);
