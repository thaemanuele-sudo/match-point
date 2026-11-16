import type { Metadata } from "next";
import "@/components/admin/admin.css";

// Pannello interno: non deve comparire nei motori di ricerca
export const metadata: Metadata = { title: "Match Point · Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
