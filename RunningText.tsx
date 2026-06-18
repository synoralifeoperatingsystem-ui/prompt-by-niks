import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

interface RunningTextProps {
  refreshTrigger?: number;
}

export default function RunningText({ refreshTrigger = 0 }: RunningTextProps) {
  const [text, setText] = useState("");

  useEffect(() => {
    fetch("/api/announcement")
      .then((res) => res.json())
      .then((data) => {
        setText(data.text || "Selamat datang di Prompt By Niks (Designed By Gara). Jalankan optimasi prompt multi-modal Gemini Anda.");
      })
      .catch((err) => {
        console.error("Gagal memuat running text:", err);
      });
  }, [refreshTrigger]);

  if (!text) return null;

  return (
    <div className="w-full bg-feminine-rose border-y border-feminine-dark/10 h-10 flex items-center overflow-hidden selective-none select-none relative z-10 shadow-sm">
      <div className="bg-feminine-accent text-white px-4 h-full flex items-center gap-2 text-xs font-semibold uppercase tracking-wider relative z-20 shadow-md">
        <Megaphone className="w-4 h-4 animate-bounce" />
        <span>PEMBERITAHUAN:</span>
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="absolute whitespace-nowrap animate-[marquee_30s_linear_infinite] text-sm text-feminine-dark font-medium pl-4">
          {text} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp; {text} &nbsp;&nbsp;&nbsp;&nbsp; ★ &nbsp;&nbsp;&nbsp;&nbsp; {text}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}
