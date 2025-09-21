"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// Times New Roman is a system font, no Google Fonts import needed
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import GlassIcons from "@/components/GlassIcons"; 

// Times New Roman font family for all text
const timesNewRoman = "font-['Times_New_Roman',serif]";

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`search/${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
      <h1 className={`text-black text-5xl mb-6 ${timesNewRoman}`}>parsr</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className={`w-96 h-12 text-center bg-white/70 border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400 ${timesNewRoman}`}
        />
        <GlassIcons
          items={[
            {
              icon: <Search className="w-5 h-5" />,
              label: "Search",
              color: "blue",
              type: "submit"
            }
          ]}
          className="!grid-cols-1 !gap-0 !p-0"
        />
      </form>
    </div>
  );
}