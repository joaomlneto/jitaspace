import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

export const middleware = withAuth(
  function middleware(req) {
    if (!req.nextauth.token) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.rewrite(url);
    }
  },
  {
    callbacks: {
      authorized: ({ token: _token, req: _req }) => {
        return true;
      },
    },
  },
);
