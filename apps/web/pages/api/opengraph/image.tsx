import type {NextRequest} from "next/server";
import { ImageResponse } from "@vercel/og";

/* eslint-disable @next/next/no-img-element */

export const config = {
  runtime: "edge",
};
export default function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hasTitle = searchParams.has("title");
    const title = hasTitle
      ? `${searchParams.get("title")?.slice(0, 100)} | Jita`
      : "Jita";

    return new ImageResponse(
      (
        <div
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0)), url('https://www.jita.space/og-background.jpg')",
            height: "100%",
            width: "100%",
            display: "flex",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            flexWrap: "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              justifyItems: "center",
            }}
          >
            <img
              src={`https://www.jita.space/logo.png`}
              alt="Jita Logo"
              height={200}
              width={232}
            />
          </div>
          <div
            style={{
              fontSize: 60,
              fontStyle: "normal",
              letterSpacing: "-0.025em",
              color: "white",
              marginTop: 30,
              padding: "0 120px",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 32,
              fontStyle: "normal",
              color: "#aaa",
              marginTop: 0,
              padding: "0 120px",
              whiteSpace: "pre-wrap",
            }}
          >
            EVE Online Tools
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.log(`${(e as Error).message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
