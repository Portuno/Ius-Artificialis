import Document, {
  type DocumentContext,
  type DocumentInitialProps,
  Html,
  Head,
  Main,
  NextScript,
} from "next/document";

/**
 * Minimal _document for Pages Router. Satisfies Next.js build when it looks
 * for /_document; this app uses App Router only.
 */
export default class MyDocument extends Document {
  static async getInitialProps(
    ctx: DocumentContext
  ): Promise<DocumentInitialProps> {
    return Document.getInitialProps(ctx);
  }

  render() {
    return (
      <Html lang="es">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
