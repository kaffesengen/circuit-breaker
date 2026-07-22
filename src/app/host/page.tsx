'use client';

import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

interface Player {
  id: string;
  nickname: string;
  stage: number;
  score: number;
}

export default function HostPage() {
  const [peerId, setPeerId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(120); // Default 2 minutter
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generer en kort 4-tegns rom-ID
    const randomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peer = new Peer(randomId);

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (conn) => {
      conn.on('data', (data: any) => {
        if (data.type === 'JOIN') {
          setPlayers((prev) => {
            if (prev.some((p) => p.id === conn.peer)) return prev;
            return [...prev, { id: conn.peer, nickname: data.nickname, stage: 1, score: 0 }];
          });
        }

        if (data.type === 'PUZZLE_SOLVED') {
          setPlayers((prev) =>
            prev.map((p) => {
              if (p.id === conn.peer) {
                // Beregn bonuspoeng basert på gjenværende tid
                const pointsEarned = 500 + data.stage * 200 + timeLeft * 10;
                return {
                  ...p,
                  stage: data.stage + 1,
                  score: p.score + pointsEarned,
                };
              }
              return p;
            })
          );
        }
      });

      conn.on('close', () => {
        setPlayers((prev) => prev.filter((p) => p.id !== conn.peer));
      });
    });

    return () => {
      peer.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  // Timer-logikk
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(120);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sorter spillere etter poeng (høyest først)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-slate-950 text-white font-sans">
      {/* HEADER: Rom-ID & Timer */}
      <header className="w-full max-w-5xl flex justify-between items-center border-b border-slate-800 pb-6 mb-8">
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">Bli med på mobil:</span>
          <h1 className="text-5xl font-black text-amber-400 font-mono tracking-wider">
            {peerId || 'GENERERER...'}
          </h1>
        </div>

        {/* TIMER KONTROLLER */}
        <div className="flex flex-col items-end">
          <div
            className={`text-6xl font-black font-mono transition-colors ${
              timeLeft <= 10 ? 'text-red-500 animate-pulse' : timeLeft <= 30 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={toggleTimer}
              className={`px-3 py-1 text-xs font-bold rounded ${
                isTimerRunning ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isTimerRunning ? 'PAUSE' : 'START'}
            </button>
            <button
              onClick={resetTimer}
              className="px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              NULLSTILL
            </button>
          </div>
        </div>
      </header>

      {/* DASHBOARD GRID */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEADERBOARD */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex justify-between items-center text-slate-300">
            <span>Resultattavle</span>
            <span className="text-xs text-slate-500 font-mono">{players.length} spillere</span>
          </h2>

          {sortedPlayers.length === 0 ? (
            <p className="text-slate-600 italic py-8 text-center">Venter på at spillere skal koble til...</p>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded bg-slate-950 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-500 w-6">#{index + 1}</span>
                    <span className="font-semibold text-lg">{player.nickname}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                      Nivå {player.stage}
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{player.score} pt</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STATUS & REGLER */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold mb-4 text-slate-300">Status & Instrukser</h2>
            <ul className="space-y-3 text-sm text-slate-400 list-disc list-inside">
              <li>Åpne nettsiden på mobilen.</li>
              <li>Tast inn rom-ID <span className="font-mono text-amber-400 font-bold">{peerId}</span> og valgfritt navn.</li>
              <li>Løs oppgavene så raskt som mulig på mobilen for maks poeng.</li>
              <li>Spillet avsluttes når tiden går ut eller alle har sprunget kretsen.</li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-slate-950 border border-slate-800 rounded text-center">
            <span className="text-xs text-slate-500 block mb-1">SYSTEMSTATUS</span>
            <span className={`font-mono text-sm font-bold ${timeLeft === 0 ? 'text-red-500' : 'text-emerald-400'}`}>
              {timeLeft === 0 ? 'SYSTEM OVERLOAD - TIDEN ER UTE' : 'KRETSEN ER OPERASJONELL'}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}