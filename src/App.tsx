/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, ToastItem, W, H, Z } from './game/engine.ts';
import { TitleScreen } from './components/TitleScreen.tsx';
import { Modals } from './components/Modals.tsx';
import { GameHUD } from './components/GameHUD.tsx';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<'menu' | 'camp' | 'play'>('menu');
  const [activeModal, setActiveModal] = useState<
    'shaman' | 'achievements' | 'options' | 'codex' | null
  >(null);
  const [currentToast, setCurrentToast] = useState<ToastItem | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const eng = new GameEngine(canvasRef.current);
    engineRef.current = eng;
    setEngine(eng);

    eng.onToast = (t) => {
      setCurrentToast(t);
      setTimeout(() => setCurrentToast(null), 3000);
    };

    eng.onStateChange = (state) => {
      setGameState(state as any);
      document.body.dataset.state =
        state === 'menu' ? 'title' : state === 'camp' ? 'camp' : 'playing';
    };

    eng.onOpenShaman = () => setActiveModal('shaman');
    eng.onOpenAchievements = () => setActiveModal('achievements');
    eng.onOpenOptions = () => setActiveModal('options');

    // Check query params for autostart or room join
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      eng.joinMultiplayerRoom(urlRoom);
    }
    if (params.get('autostart') === '1' || params.get('play') === '1') {
      eng.initPlayer(0);
      eng.reset(false);
      if (params.get('combat') === '1' && eng.wd?.grid) {
        outer: for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 5; x++) {
            if (eng.wd.grid[y]?.[x]?.active && eng.wd.grid[y][x].type === 'combat') {
              eng.enterCell(x, y, '');
              break outer;
            }
          }
        }
      }
      setGameState('play');
      document.body.dataset.state = 'playing';
    } else if (params.get('camp') === '1') {
      eng.initPlayer(0);
      eng.reset(true);
      setGameState('camp');
      document.body.dataset.state = 'camp';
    } else {
      eng.ST = 'menu';
      document.body.dataset.state = 'title';
    }

    eng.start();

    return () => {
      eng.stop();
    };
  }, []);

  const handleStartSolo = (charIdx: number) => {
    if (!engineRef.current) return;
    engineRef.current.initPlayer(charIdx);
    engineRef.current.reset(true);
    setGameState('camp');
    document.body.dataset.state = 'camp';
    engineRef.current.snd(320, 0.25, 'triangle', 0.08, 380);
  };

  const handleStartDirect = (charIdx: number) => {
    if (!engineRef.current) return;
    engineRef.current.initPlayer(charIdx);
    engineRef.current.reset(false);
    setGameState('play');
    document.body.dataset.state = 'playing';
    engineRef.current.snd(380, 0.28, 'triangle', 0.09, 440);
  };

  const handleStartCoop = (charIdx: number, code: string, playerName?: string) => {
    if (!engineRef.current) return;
    engineRef.current.initPlayer(charIdx);
    engineRef.current.reset(true);
    engineRef.current.joinMultiplayerRoom(code || 'sapo01', playerName);
    setGameState('camp');
    document.body.dataset.state = 'camp';
    engineRef.current.snd(320, 0.25, 'triangle', 0.08, 380);
  };

  const handleGoCamp = () => {
    if (!engineRef.current) return;
    engineRef.current.reset(true);
    setGameState('camp');
    document.body.dataset.state = 'camp';
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.reset(false);
    setGameState('play');
    document.body.dataset.state = 'playing';
  };

  const handleBackToTitle = () => {
    if (!engineRef.current) return;
    engineRef.current.ST = 'menu';
    setGameState('menu');
    document.body.dataset.state = 'title';
  };

  const isPlaying = gameState === 'camp' || gameState === 'play';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040806] flex items-center justify-center p-0 sm:p-1.5">
      {/* 60 FPS Isolated Canvas Container with Crisp Full-Viewport Fit */}
      <canvas
        ref={canvasRef}
        width={W * Z}
        height={H * Z}
        className={`w-full h-full max-h-screen max-w-screen sm:max-h-[97vh] sm:max-w-[146vh] aspect-[3/2] object-contain image-rendering-pixelated block shadow-[0_0_50px_rgba(0,0,0,0.95)] border-0 sm:border-2 border-[#1f3d28] ${
          isPlaying ? 'cursor-none' : 'cursor-default'
        }`}
        data-testid="game-canvas"
      />

      {/* Title Screen Overlay */}
      {gameState === 'menu' && (
        <TitleScreen
          engine={engine}
          onStartSolo={handleStartSolo}
          onStartDirect={handleStartDirect}
          onStartCoop={handleStartCoop}
          onOpenAchievements={() => setActiveModal('achievements')}
          onOpenOptions={() => setActiveModal('options')}
          onOpenShaman={() => setActiveModal('shaman')}
          onOpenCodex={() => setActiveModal('codex')}
        />
      )}

      {/* Game HUD (Top controls and mobile touch) */}
      {isPlaying && (
        <GameHUD
          engine={engine}
          onGoCamp={handleGoCamp}
          onRestart={handleRestart}
          onOpenOptions={() => setActiveModal('options')}
          onOpenCodex={() => setActiveModal('codex')}
        />
      )}

      {/* Modals & Steam Toasts */}
      <Modals
        engine={engine}
        activeModal={activeModal}
        onClose={() => {
          setActiveModal(null);
          if (engineRef.current) engineRef.current.paused = false;
        }}
        toast={currentToast}
        onBackToTitle={handleBackToTitle}
        onGoCamp={handleGoCamp}
        onRestart={handleRestart}
        onOpenCodex={() => setActiveModal('codex')}
      />
    </div>
  );
}
