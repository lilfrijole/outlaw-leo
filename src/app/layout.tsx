import type { Metadata } from "next";
import WalletProvider from "@/components/WalletProvider";
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
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
