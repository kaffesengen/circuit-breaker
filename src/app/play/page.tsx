"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Peer, { DataConnection } from "peerjs";

function GameClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");
  const name = searchParams.get("name");

  const [status, setStatus] = useState<"CONNECTING" | "CONNECTED" | "ERROR">("CONNECTING");
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const connRef = useRef<DataConnection | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (!roomId || !name) return;

    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", () => {
      const conn = peer.connect(`CB-${roomId}`);
      connRef.current = conn;

      conn.on("open", () => {
        setStatus("CONNECTED");
        conn.send({ type: "JOIN", name });
      });

      conn.on("data", (data: any) => {
        if (data.type === "RESULT") {
          setFeedback(data.correct ? "Riktig svar!" : "Feil! Prøv igjen.");
          setTimeout(() => setFeedback(null), 2000);
        }
      });

      conn.on("error", () => setStatus("ERROR"));
    });

    return () => {
      peer.destroy();
    };
  }, [roomId, name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connRef.current || !puzzleAnswer) return;

    // Eksempel-logikk: Sjekk om svar er 42
    const isCorrect = puzzleAnswer.trim() === "42";

    connRef.current.send({
      type: "SUBMIT_ANSWER",
      name,
      correct: isCorrect,
    });

    setPuzzleAnswer("");
  };

  if (status === "CONNECTING") {
    return (
      <main className="min-h-screen bg-black text-green-500 font-mono flex items-center justify-center p-4">
        <p className="animate-pulse">Kobler til rom {roomId}...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-green-500 font-mono p-4 flex flex-col justify-between">
      {/* Header */}
      <div className="border-b border-green-900 pb-2 flex justify-between items-center text-xs">
        <span>SPILLER: {name}</span>
        <span>ROM: {roomId}</span>
      </div>

      {/* Oppgave-område */}
      <div className="my-auto border border-green-500/30 bg-black p-6 rounded-lg text-center space-y-4">
        <h2 className="text-xs uppercase text-green-700 tracking-widest">Aktiv Sekvens</h2>
        <p className="text-xl text-white font-bold">Hva er svaret på alt?</p>
        <p className="text-xs text-neutral-500">(Eksempel-puzzle: Tast inn 42)</p>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <input
            type="number"
            value={puzzleAnswer}
            onChange={(e) => setPuzzleAnswer(e.target.value)}
            placeholder="Svar..."
            className="w-full bg-neutral-900 border border-green-500/50 rounded px-3 py-3 text-center text-2xl text-green-400 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-black font-bold py-3 rounded uppercase tracking-wider"
          >
            Send Svar
          </button>
        </form>

        {feedback && (
          <div className={`p-2 rounded text-sm font-bold ${feedback.includes("Riktig") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
            {feedback}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-neutral-600 uppercase">
        Circuit Breaker // Terminal Node
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen text-green-500 p-4">Laster...</div>}>
      <GameClient />
    </Suspense>
  );
}