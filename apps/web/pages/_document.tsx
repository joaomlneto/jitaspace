import React from "react";
import Document, {
  Head,
  Html,
  Main,
  NextScript,
  type DocumentContext,
} from "next/document";
import { ColorSchemeScript } from "@mantine/core";





export default class _Document extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);

    // Add your app specific logic here
    return {
      ...initialProps,
    };
  }

  render(): React.ReactElement {
    return (
      <Html lang="en">
        <Head>
          <ColorSchemeScript />
          <link
            rel="apple-touch-icon"
            sizes="152x152"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#abc2d9" />
          <meta name="apple-mobile-web-app-title" content="Jita" />
          <meta name="application-name" content="Jita" />
          <meta name="msapplication-TileColor" content="#abc2d9" />
          <meta name="theme-color" content="#abc2d9" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
