"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinGame() {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !name) return;
    router.push(`/play?room=${roomId.toUpperCase().trim()}&name=${encodeURIComponent(name.trim())}`);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-green-500 font-mono flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border border-green-500/30 bg-neutral-900 p-6 rounded-lg shadow-2xl">
        <h1 className="text-2xl font-bold text-center mb-6 tracking-wider">CIRCUIT BREAKER</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs uppercase mb-1 text-green-700">Rom-kode</label>
            <input
              type="text"
              maxLength={4}
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="f.eks. X7K9"
              className="w-full bg-black border border-green-500/50 rounded px-3 py-2 text-center text-xl tracking-widest text-green-400 focus:outline-none focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-xs uppercase mb-1 text-green-700">Spillernavn</label>
            <input
              type="text"
              maxLength={12}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ditt navn"
              className="w-full bg-black border border-green-500/50 rounded px-3 py-2 text-green-400 focus:outline-none focus:border-green-400"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 rounded transition-colors uppercase tracking-wider mt-4"
          >
            Koble til
          </button>
        </form>
      </div>
    </main>
  );
}