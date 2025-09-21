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
    <div className="relative flex flex-col items-center justify-center h-screen overflow-hidden">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="fixed inset-0 w-full h-full -z-10">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f5e0c3] via-[#f7d9b6] to-[#fff6eb]"></div>

          <div className="absolute top-[20%] left-[15%] w-[400px] h-[400px] bg-gradient-radial from-[#f9dec9] to-transparent rounded-full blur-3xl animate-float-1"></div>
          <div className="absolute top-[60%] right-[20%] w-[350px] h-[350px] bg-gradient-radial from-[#f7d9b6]/90 to-transparent rounded-full blur-3xl animate-float-2"></div>
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-gradient-radial from-[#f5e0c3]/80 to-transparent rounded-full blur-2xl animate-float-3"></div>
          <div className="absolute bottom-[10%] left-[10%] w-[250px] h-[250px] bg-gradient-radial from-[#fff6eb]/85 to-transparent rounded-full blur-2xl animate-float-4"></div>
          <div className="absolute top-[10%] right-[10%] w-[200px] h-[200px] bg-gradient-radial from-[#f9dec9]/75 to-transparent rounded-full blur-xl animate-float-5"></div>
        </div>
      </div>
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