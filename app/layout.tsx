import type { Metadata } from "next";
import { Press_Start_2P, M_PLUS_Rounded_1c } from 'next/font/google';
import "./globals.css";

// Load and bind fonts to CSS variables
const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const mPlusRounded1c = M_PLUS_Rounded_1c({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "~ Twitter Slang Converter ~",
  description: "Level up your thoughts — make 'em tweet-worthy 🚀",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${pressStart2P.variable} ${mPlusRounded1c.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
