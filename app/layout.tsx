import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Remote Wallpaper",
  description: "Upload and customize wallpapers for iPhone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


