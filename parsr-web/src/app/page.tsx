"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { Input } from "@/components/ui/input"; 
import { Button } from "@/components/ui/button"; 

const playfair = Playfair_Display({ subsets: ["latin"] });

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`search/${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className={`text-black text-5xl mb-6 ${playfair.className}`}>parsr</h1>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className={`w-96 ${playfair.className}`}
        />
        <Button type="submit" variant="default">
          Search
        </Button>
      </form>
    </div>
  );
}