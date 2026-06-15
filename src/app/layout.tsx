import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BrandProvider } from "@/context/BrandContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import AuthModal from "@/components/auth/AuthModal";
import GetCoinsModal from "@/components/crypto/GetCoinsModal";
import ThemeEditor from "@/components/admin/ThemeEditor";
import { getActiveBrand, brandCssVars } from "@/lib/brand-ssr";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const activeBrand = getActiveBrand();

export const metadata: Metadata = {
  title: activeBrand.meta.title,
  description: activeBrand.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Paint with the active brand's colors on first render — no FOUB. */}
        <style id="brand-vars" dangerouslySetInnerHTML={{ __html: brandCssVars(activeBrand.colors) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <BrandProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <Footer />
            <MobileNav />
            <AuthModal />
            <GetCoinsModal />
            <ThemeEditor />
          </AuthProvider>
        </BrandProvider>
      </body>
    </html>
  );
}
