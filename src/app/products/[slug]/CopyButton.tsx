"use client";

import { useState } from "react";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // клипборд недоступен (например, http без localhost) — молча пропускаем
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-all active:scale-90 ${
        copied
          ? "border-emerald-300 bg-emerald-50 text-emerald-600"
          : "border-steel text-slate-400 hover:border-brand hover:text-brand"
      }`}
      aria-label="Скопировать артикул"
      title="Скопировать артикул"
    >
      {copied ? (
        <span className="animate-pop">
          <CheckOutlined style={{ fontSize: 12 }} />
        </span>
      ) : (
        <CopyOutlined style={{ fontSize: 12 }} />
      )}
    </button>
  );
}
