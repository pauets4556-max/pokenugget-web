"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/collections", label: "Colecciones" },
  { href: "/my-collection", label: "Mi colección" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        borderTop: "1px solid #2B3440",
        background: "#10141B",
        position: "sticky",
        bottom: 0,
      }}
    >
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "12px 0",
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              color: active ? "#4A8FB8" : "#7D8A96",
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
