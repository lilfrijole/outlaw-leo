import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outlaw Leo",
  description: "Don't let Leo get caught!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body id="t" className="offline">
        {children}
      </body>
    </html>
  );
}
