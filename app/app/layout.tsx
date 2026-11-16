import type { Metadata } from "next";
import { LinguaProvider } from "@/lib/i18n/lingua";
import "@/components/app/app.css";

export const metadata: Metadata = { title: "Match Point · App" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LinguaProvider>
      <div className="mp">{children}</div>
    </LinguaProvider>
  );
}
