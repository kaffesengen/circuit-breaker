"use client";

import { useEffect, useState, useRef } from "react";
import Peer, { DataConnection } from "peerjs";

interface Player {
  id: string;
  name: string;
  score: number;
}

export default function HostGame() {
  const [roomId, setRoomId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Generer en tilfeldig 4-tegns romkode
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(code);

    const peer = new Peer(`CB-${code}`);
    peerRef.current = peer;

    peer.on("open", () => {
      addLog(`Klar. Romkode: ${code}`);
    });

    peer.on("connection", (conn: DataConnection) => {
      conn.on("data", (data: any) => {
        if (data.type === "JOIN") {
          setPlayers((prev) => {
            if (prev.some((p) => p.id === conn.peer)) return prev;
            return [...prev, { id: conn.peer, name: data.name, score: 0 }];
          });
          addLog(`${data.name} koblet til.`);
          conn.send({ type: "ACK", status: "CONNECTED" });
        }

        if (data.type === "SUBMIT_ANSWER") {
          if (data.correct) {
            setPlayers((prev) =>
              prev.map((p) => (p.id === conn.peer ? { ...p, score: p.score + 100 } : p))
            );
            addLog(`KORREKT svar fra ${data.name}! (+100p)`);
            conn.send({ type: "RESULT", correct: true });
          } else {
            addLog(`FEIL svar fra ${data.name}.`);
            conn.send({ type: "RESULT", correct: false });
          }
        }
      });
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 9),
    ]);
  };

  return (
    <main className="min-h-screen bg-black text-green-500 font-mono p-8 grid grid-cols-3 gap-6">
      {/* Venstre: Status og Romkode */}
      <div className="col-span-1 border border-green-500/30 bg-neutral-950 p-6 rounded-lg flex flex-col justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-wider text-green-600 mb-2">CIRCUIT BREAKER // HOST</h1>
          <hr className="border-green-900 mb-6" />
          <p className="text-sm text-neutral-400">Gå til nettadressen og telt inn koden:</p>
          <div className="text-6xl font-black tracking-widest text-white my-4 bg-neutral-900 p-4 rounded text-center border border-green-500/50">
            {roomId || "..."}
          </div>
        </div>

        <div>
          <h2 className="text-xs uppercase text-green-700 mb-2">Systemlogg</h2>
          <div className="bg-black border border-green-900 p-3 rounded h-48 overflow-hidden text-xs text-green-600 font-mono">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Midten/Høyre: Poengtavle og Spill-status */}
      <div className="col-span-2 border border-green-500/30 bg-neutral-950 p-6 rounded-lg flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">Tilkoblede Enheter ({players.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {players.length === 0 ? (
              <p className="text-neutral-600 italic col-span-2">Venter på at spillere skal koble til...</p>
            ) : (
              players.map((p) => (
                <div key={p.id} className="bg-neutral-900 border border-green-500/20 p-4 rounded flex justify-between items-center">
                  <span className="font-bold text-lg text-white">{p.name}</span>
                  <span className="text-xl font-black text-green-400">{p.score} PTS</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-green-900 pt-4 flex justify-between items-center">
          <span className="text-xs text-neutral-500">Status: Venter på spillstart</span>
          <button
            onClick={() => alert("Start spill-sekvens her")}
            className="bg-green-600 hover:bg-green-500 text-black px-6 py-2 font-bold rounded tracking-wider uppercase"
          >
            Start Runde
          </button>
        </div>
      </div>
    </main>
  );
}