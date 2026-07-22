'use client';

import { useState, useEffect } from 'react';
import Peer from 'peerjs';

type PuzzleType = 'SEQUENCE' | 'MATH_LOCK' | 'PATTERN';

export default function PlayPage() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<any>(null);
  const [hostId, setHostId] = useState('');
  const [nickname, setNickname] = useState('');
  const [connected, setConnected] = useState(false);
  
  // Game state
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [puzzleType, setPuzzleType] = useState<PuzzleType>('SEQUENCE');
  const [statusMessage, setStatusMessage] = useState('');

  // Puzzle 1: Sequence State
  const targetSequence = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
  const [userSequence, setUserSequence] = useState<string[]>([]);

  // Puzzle 2: Math Lock State
  // Ligning: (X * 3) - 4 = 11 -> X = 5
  const [mathInput, setMathInput] = useState('');

  // Puzzle 3: Pattern Toggle State (3x3 grid, mål: alle TRUE)
  const [grid, setGrid] = useState<boolean[]>([
    true, false, true,
    false, true, false,
    true, false, true
  ]);

  useEffect(() => {
    const newPeer = new Peer();
    setPeer(newPeer);
    return () => newPeer.destroy();
  }, []);

  const joinGame = () => {
    if (!peer || !hostId || !nickname) return;
    const connection = peer.connect(hostId);
    
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

  // --- PUZZLE 1 LOGIC: Sequence ---
  const handleColorClick = (color: string) => {
    const nextSeq = [...userSequence, color];
    setUserSequence(nextSeq);

    const index = nextSeq.length - 1;
    if (nextSeq[index] !== targetSequence[index]) {
      setStatusMessage('Feil sekvens! Prøv igjen.');
      setUserSequence([]);
      return;
    }

    if (nextSeq.length === targetSequence.length) {
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

  // --- PUZZLE 2 LOGIC: Math Lock ---
  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mathInput.trim() === '5') {
      setStatusMessage('Korrekt kode!');
      notifyHostSuccess();
      setTimeout(() => {
        setMathInput('');
        setStatusMessage('');
        setPuzzleType('PATTERN');
        setCurrentStage(3);
      }, 1000);
    } else {
      setStatusMessage('Feil kode! Regn på nytt.');
      setMathInput('');
    }
  };

  // --- PUZZLE 3 LOGIC: Pattern Grid ---
  const toggleCell = (index: number) => {
    const newGrid = [...grid];
    newGrid[index] = !newGrid[index];
    
    // Toggle naboer (kors-mønster)
    const neighbors = [];
    if (index % 3 > 0) neighbors.push(index - 1); // Venstre
    if (index % 3 < 2) neighbors.push(index + 1); // Høyre
    if (index >= 3) neighbors.push(index - 3);     // Opp
    if (index < 6) neighbors.push(index + 3);      // Ned

    neighbors.forEach(n => {
      newGrid[n] = !newGrid[n];
    });

    setGrid(newGrid);

    if (newGrid.every(cell => cell === true)) {
      setStatusMessage('Spenning gjenopprettet!');
      notifyHostSuccess();
      setTimeout(() => {
        setStatusMessage('Alle oppgaver fullført!');
      }, 1000);
    }
  };

  if (!connected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
        <h1 className="text-2xl font-bold mb-6">Koble til storskjerm</h1>
        <div className="w-full max-w-xs space-y-4">
          <input
            type="text"
            placeholder="Rom-ID (fra storskjerm)"
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
          <button
            onClick={joinGame}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded"
          >
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
          <p className="text-center font-bold mb-4 text-amber-400 animate-pulse">
            {statusMessage}
          </p>
        )}

        {/* PUZZLE 1: COLOR SEQUENCE */}
        {puzzleType === 'SEQUENCE' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Trykk knappene i riktig rekkefølge: <br />
              <span className="font-mono text-xs text-slate-500">[Rød $\rightarrow$ Blå $\rightarrow$ Grønn $\rightarrow$ Gul]</span>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleColorClick('RED')}
                className="h-24 bg-red-600 active:bg-red-700 rounded-lg font-bold text-lg"
              >
                RØD
              </button>
              <button
                onClick={() => handleColorClick('BLUE')}
                className="h-24 bg-blue-600 active:bg-blue-700 rounded-lg font-bold text-lg"
              >
                BLÅ
              </button>
              <button
                onClick={() => handleColorClick('GREEN')}
                className="h-24 bg-emerald-600 active:bg-emerald-700 rounded-lg font-bold text-lg"
              >
                GRØNN
              </button>
              <button
                onClick={() => handleColorClick('YELLOW')}
                className="h-24 bg-amber-500 active:bg-amber-600 rounded-lg font-bold text-lg"
              >
                GUL
              </button>
            </div>
          </div>
        )}

        {/* PUZZLE 2: MATH LOCK */}
        {puzzleType === 'MATH_LOCK' && (
          <form onSubmit={handleMathSubmit} className="space-y-4 text-center">
            <p className="text-sm text-slate-400">Løs ligningen for å låse opp kretsen:</p>
            <div className="p-4 bg-slate-900 rounded font-mono text-xl border border-slate-800">
              (X &times; 3) - 4 = 11
            </div>
            <input
              type="number"
              placeholder="Hva er X?"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              className="w-full p-3 rounded bg-slate-800 border border-slate-700 text-center text-xl font-mono"
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded"
            >
              Lås opp
            </button>
          </form>
        )}

        {/* PUZZLE 3: PATTERN GRID */}
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