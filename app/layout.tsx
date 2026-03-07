import type { Metadata } from "next";
import "./globals.css";
import { BlogProvider } from "@/context/BlogContext";
import Link from "next/link";
import Image from "next/image";
import NavLinks from "@/components/NavLinks";
import HeaderText from "@/components/HeaderText";
import FooterText from "@/components/FooterText";

export const metadata: Metadata = {
  title: "it depends",
  description: "um blog sobre software, ideias e o que mais aparecer.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <BlogProvider>
          <div className="min-h-screen flex flex-col">
            <div className="w-full max-w-2xl mx-auto px-4 sm:px-5 py-8 sm:py-10 flex-1">
              <header className="mb-10">
                <div className="flex items-start gap-4">
                  <Image
                    src="/avatar.png"
                    alt="Luis"
                    width={72}
                    height={72}
                    className="rounded-sm border border-[var(--retro-border)] flex-shrink-0"
                  />
                  <div>
                    <Link href="/" style={{ textDecoration: "none" }}>
                      <h1
                        className="text-2xl font-bold leading-tight"
                        style={{
                          color: "var(--foreground)",
                          fontFamily: "Georgia, serif",
                        }}
                      >
                        it depends
                      </h1>
                    </Link>
                    <HeaderText />
                    <NavLinks />
                  </div>
                </div>
                <hr className="mt-6" />
              </header>

              <main>{children}</main>

              <footer className="mt-16 pt-4 border-t border-dashed border-[var(--retro-hr)]">
                <FooterText />
              </footer>
            </div>
          </div>
        </BlogProvider>
      </body>
    </html>
  );
}
