import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    if (!req.nextauth.token) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        return true;
      },
    },
  },
);

export const config = { matcher: ["/mail/mailbox"] };
