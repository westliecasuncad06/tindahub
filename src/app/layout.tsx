import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "TindaHub — Your everyday store companion",
    template: "%s | TindaHub",
  },
  description:
    "A thoughtful workspace for your sari-sari store. Point of sale, inventory, customer credit, and daily business reports.",
  icons: { icon: "/brand/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('tindahub_theme')||'light';document.documentElement.lang=localStorage.getItem('tindahub_language')||'tl'}catch{}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
