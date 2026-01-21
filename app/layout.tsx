// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WordPop",
  description: "Kids English vocab trainer"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b1220]/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold tracking-wide">WordPop</div>
              </div>
              <div className="text-xs text-white/60">Home use</div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-white/40">
            localStorage only · en-US TTS
          </footer>
        </div>
      </body>
    </html>
  );
}
