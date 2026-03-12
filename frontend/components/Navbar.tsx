"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",                      label: "Tổng quan"    },
  { href: "/compare",               label: "So sánh"      },
  { href: "/price-analysis",        label: "Kỹ thuật"     },
  { href: "/fundamental-analysis",  label: "Tài chính"    },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="border-b border-slate-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <span className="text-emerald-400">▲</span>
          <span className="text-white">VN</span>
          <span className="text-emerald-400">Stock</span>
        </Link>
        <div className="flex gap-1">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                path === l.href
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto text-xs text-slate-500">
          Dữ liệu HOSE · HNX · UPCOM
        </div>
      </div>
    </nav>
  );
}
