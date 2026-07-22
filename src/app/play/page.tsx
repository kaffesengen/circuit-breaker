'use client';

import { useState, useEffect } from 'react';
import Peer from 'peerjs';

type PuzzleType = 'SEQUENCE' | 'MATH_LOCK' | 'PATTERN';

const ALL_COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const COLOR_NAMES: Record<string, string> = { RED: 'Rød', BLUE: 'Blå', GREEN: 'Grønn', YELLOW: 'Gul' };

// Hjelpefunksjon for rutenett (toggle + naboer)
const toggleGridIndices = (grid: boolean[], index: number) => {
  const newGrid = [...grid];
  newGrid[index] = !newGrid[index];
  if (index % 3 > 0) newGrid[index - 1] = !newGrid[index - 1];
  if (index % 3 < 2) newGrid[index + 1] = !newGrid[index + 1];
  if (index >= 3) newGrid[index - 3] = !newGrid[index - 3];
  if (index < 6) newGrid[index + 3] = !newGrid[index + 3];
  return newGrid;
};

export default function PlayPage() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<any>(null);
  const [hostId, setHostId] = useState('');
  const [nickname, setNickname] = useState('');
  const [connected, setConnected] = useState(false);
  
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [puzzleType, setPuzzleType] = useState<PuzzleType>('SEQUENCE');
  const [statusMessage, setStatusMessage] = useState('');

  // Dynamiske puslespill-statuser
  const [targetSequence, setTargetSequence] = useState<string[]>([]);
  const [userSequence, setUserSequence] = useState<string[]>([]);
  
  const [mathEq, setMathEq] = useState({ A: 0, B: 0, C: 0, targetX: '0' });
  const [mathInput, setMathInput] = useState('');
  
  const [grid, setGrid] = useState<boolean[]>(Array(9).fill(false));

  useEffect(() => {
    const newPeer = new Peer();
    setPeer(newPeer);
    
    // Generer unike puslespill
    generatePuzzles();

    return () => newPeer.destroy();
  }, []);

  const generatePuzzles = () => {
    // 1. Sekvens
    const seq = Array.from({ length: 4 }, () => ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)]);
    setTargetSequence(seq);

    // 2. Matte: (X * A) - B = C. Mål er å finne X.
    const xVal = Math.floor(Math.random() * 9) + 1; // 1-9
    const aVal = Math.floor(Math.random() * 4) + 2; // 2-5
    const bVal = Math.floor(Math.random() * 10) + 1; // 1-10
    const cVal = (xVal * aVal) - bVal;
    setMathEq({ A: aVal, B: bVal, C: cVal, targetX: xVal.toString() });

    // 3. Grid: Start løst (true), simuler 5-10 trykk baklengs for å sikre løsbarhet
    let generatedGrid = Array(9).fill(true);
    const shuffles = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < shuffles; i++) {
      generatedGrid = toggleGridIndices(generatedGrid, Math.floor(Math.random() * 9));
    }
    // Hvis den endte opp løst, slå av en knapp
    if (generatedGrid.every(c => c === true)) {
      generatedGrid = toggleGridIndices(generatedGrid, 4);
    }
    setGrid(generatedGrid);
  };

  const joinGame = () => {
    if (!peer || !hostId || !nickname) return;
    const connection = peer.connect(hostId.toUpperCase());
    
    connection.on('open', () => {
      setConn(connection);
      setConnected(true);
      connection.send({ type: 'JOIN', nickname });
    });
  };

  const notifyHostSuccess = () => {
    if (conn) {
      conn.send({ type: 'PUZZLE_SOLVED', stage: currentStage });
    }
  };

  const playTone = (type: 'success' | 'error') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  const handleColorClick = (color: string) => {
    const nextSeq = [...userSequence, color];
    setUserSequence(nextSeq);

    const index = nextSeq.length - 1;
    if (nextSeq[index] !== targetSequence[index]) {
      playTone('error');
      setStatusMessage('Feil sekvens! Prøv igjen.');
      setUserSequence([]);
      return;
    }

    if (nextSeq.length === targetSequence.length) {
      playTone('success');
      setStatusMessage('Korrekt!');
      notifyHostSuccess();
      setTimeout(() => {
        setUserSequence([]);
        setStatusMessage('');
        setPuzzleType('MATH_LOCK');
        setCurrentStage(2);
      }, 1000);
    }
  };

  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mathInput.trim() === mathEq.targetX) {
      playTone('success');
      setStatusMessage('Korrekt kode!');
      notifyHostSuccess();
      setTimeout(() => {
        setMathInput('');
        setStatusMessage('');
        setPuzzleType('PATTERN');
        setCurrentStage(3);
      }, 1000);
    } else {
      playTone('error');
      setStatusMessage('Feil kode! Regn på nytt.');
      setMathInput('');
    }
  };

  const toggleCell = (index: number) => {
    const newGrid = toggleGridIndices(grid, index);
    setGrid(newGrid);

    if (newGrid.every(cell => cell === true)) {
      playTone('success');
      setStatusMessage('Spenning gjenopprettet!');
      notifyHostSuccess();
      setTimeout(() => {
        setStatusMessage('Alle oppgaver fullført!');
      }, 1000);
    } else {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    }
  };

  if (!connected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
        <h1 className="text-2xl font-bold mb-6">Koble til storskjerm</h1>
        <div className="w-full max-w-xs space-y-4">
          <input
            type="text"
            placeholder="Rom-ID"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white uppercase"
          />
          <input
            type="text"
            placeholder="Ditt kallenavn"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-white"
          />
          <button onClick={joinGame} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded">
            Bli med
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 bg-slate-950 text-white">
      <header className="w-full text-center border-b border-slate-800 pb-4">
        <span className="text-xs text-emerald-400 font-mono">STATUS: TILKOBLET</span>
        <h2 className="text-lg font-bold">Nivå {currentStage} av 3</h2>
      </header>

      <div className="w-full max-w-xs my-auto">
        {statusMessage && (
          <p className={`text-center font-bold mb-4 ${statusMessage.includes('Feil') ? 'text-red-500' : 'text-amber-400 animate-pulse'}`}>
            {statusMessage}
          </p>
        )}

        {puzzleType === 'SEQUENCE' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Trykk knappene i riktig rekkefølge: <br />
              <span className="font-mono text-xs text-slate-500">
                [{targetSequence.map(c => COLOR_NAMES[c]).join(' -> ')}]
              </span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleColorClick('RED')} className="h-24 bg-red-600 active:bg-red-700 rounded-lg font-bold text-lg">RØD</button>
              <button onClick={() => handleColorClick('BLUE')} className="h-24 bg-blue-600 active:bg-blue-700 rounded-lg font-bold text-lg">BLÅ</button>
              <button onClick={() => handleColorClick('GREEN')} className="h-24 bg-emerald-600 active:bg-emerald-700 rounded-lg font-bold text-lg">GRØNN</button>
              <button onClick={() => handleColorClick('YELLOW')} className="h-24 bg-amber-500 active:bg-amber-600 rounded-lg font-bold text-lg">GUL</button>
            </div>
          </div>
        )}

        {puzzleType === 'MATH_LOCK' && (
          <form onSubmit={handleMathSubmit} className="space-y-4 text-center">
            <p className="text-sm text-slate-400">Løs ligningen for å låse opp kretsen:</p>
            <div className="p-4 bg-slate-900 rounded font-mono text-xl border border-slate-800">
              (X &times; {mathEq.A}) {mathEq.B < 0 ? '+' : '-'} {Math.abs(mathEq.B)} = {mathEq.C}
            </div>
            <input
              type="number"
              placeholder="Hva er X?"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-center text-xl font-mono"
            />
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded">
              Lås opp
            </button>
          </form>
        )}

        {puzzleType === 'PATTERN' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Slå på alle bryterne. Å trykke på én snur også naboene.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {grid.map((active, i) => (
                <button
                  key={i}
                  onClick={() => toggleCell(i)}
                  className={`h-20 rounded-lg font-mono font-bold text-xl transition-colors ${
                    active ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {active ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="w-full text-center text-xs text-slate-600">
        Circuit Breaker Controller
      </footer>
    </main>
  );
}