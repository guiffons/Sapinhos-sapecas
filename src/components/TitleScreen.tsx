import React, { useState, useEffect, useRef } from 'react';
import { CH, WP, CharacterDef } from '../game/constants.ts';
import { GameEngine, glow } from '../game/engine.ts';

interface TitleScreenProps {
  engine: GameEngine | null;
  onStartSolo: (charIdx: number) => void;
  onStartDirect?: (charIdx: number) => void;
  onStartCoop: (charIdx: number, code: string, playerName?: string) => void;
  onOpenAchievements: () => void;
  onOpenOptions: () => void;
  onOpenShaman: () => void;
  onOpenCodex?: () => void;
}

export const PixelIcon: React.FC<{
  sprite: HTMLCanvasElement | undefined;
  size?: number;
  className?: string;
}> = ({ sprite, size = 20, className = '' }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current || !sprite) return;
    const cv = ref.current;
    cv.width = sprite.width;
    cv.height = sprite.height;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(sprite, 0, 0);
  }, [sprite]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className={`image-rendering-pixelated shrink-0 inline-block ${className}`}
    />
  );
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  engine,
  onStartSolo,
  onStartDirect,
  onStartCoop,
  onOpenAchievements,
  onOpenOptions,
  onOpenShaman,
  onOpenCodex,
}) => {
  const [selectedChar, setSelectedChar] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string>('sapo' + Math.floor(10 + Math.random() * 89));
  const [larvae, setLarvae] = useState<number>(engine?.achStats.larvae ?? 0);
  const [, setTick] = useState<number>(0);
  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animAngleRef = useRef<number>(0);

  const forceUpdate = () => {
    if (engine) setLarvae(engine.achStats.larvae);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    const syncLarvae = () => {
      if (engine) setLarvae(engine.achStats.larvae);
    };
    syncLarvae();
    window.addEventListener('sapo-progress-update', syncLarvae);
    const interval = setInterval(syncLarvae, 250);
    return () => {
      window.removeEventListener('sapo-progress-update', syncLarvae);
      clearInterval(interval);
    };
  }, [engine]);

  const curChar: CharacterDef = CH[selectedChar];
  const isUnlocked = engine ? engine.isCharUnlocked(selectedChar) : true;
  const unlockedFrogsCount = engine
    ? CH.filter((_, idx) => engine.isCharUnlocked(idx)).length
    : 2;

  const handlePrev = () => {
    setSelectedChar((prev) => (prev - 1 + CH.length) % CH.length);
    if (engine) engine.snd(440, 0.09, 'triangle', 0.07, 180);
  };

  const handleNext = () => {
    setSelectedChar((prev) => (prev + 1) % CH.length);
    if (engine) engine.snd(490, 0.09, 'triangle', 0.07, 200);
  };

  // 60FPS Animated 2.5D Pixel Art Carousel Stage (Enter the Gungeon / Forager style)
  useEffect(() => {
    let rafId = 0;
    const renderStage = () => {
      const cv = stageCanvasRef.current;
      if (cv && engine && engine.S && engine.S.pIdle) {
        const g = cv.getContext('2d');
        if (g) {
          g.imageSmoothingEnabled = false;
          const cw = cv.width;
          const ch = cv.height;
          g.clearRect(0, 0, cw, ch);

          const t = performance.now() / 1000;
          const targetA = (selectedChar * Math.PI * 2) / CH.length;
          let diff = targetA - animAngleRef.current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          animAngleRef.current += diff * 0.16;

          const items: Array<{ z: number; idx: number; draw: () => void }> = [];

          CH.forEach((c, i) => {
            const ang = (i * Math.PI * 2) / CH.length - animAngleRef.current;
            const rx = cw / 2 + Math.sin(ang) * 98;
            const ry = ch / 2 + 12 + Math.cos(ang) * 22;
            const depth = (Math.cos(ang) + 1) * 0.5;
            const sc = 0.65 + depth * 0.55;
            const isSel = i === selectedChar;
            const un = engine.isCharUnlocked(i);

            items.push({
              z: ry,
              idx: i,
              draw: () => {
                g.save();
                g.globalAlpha = isSel ? 1 : 0.45 + depth * 0.35;

                // 2.5D Stone / Gold Pedestal
                const pedW = 24 * sc;
                const pedH = 8 * sc;
                g.fillStyle = '#050a07';
                g.beginPath();
                g.ellipse(rx, ry + 7 * sc, pedW + 2, pedH + 2, 0, 0, Math.PI * 2);
                g.fill();

                g.fillStyle = isSel ? '#c79100' : '#263238';
                g.fillRect(rx - pedW, ry, pedW * 2, 6 * sc);

                g.fillStyle = isSel ? '#ffd54f' : '#455a64';
                g.beginPath();
                g.ellipse(rx, ry, pedW, pedH, 0, 0, Math.PI * 2);
                g.fill();
                g.strokeStyle = isSel ? '#fff9c4' : '#78909c';
                g.lineWidth = isSel ? 1.5 : 1;
                g.stroke();

                if (isSel) {
                  g.globalCompositeOperation = 'lighter';
                  g.globalAlpha = 0.38 + Math.sin(t * 6) * 0.1;
                  g.drawImage(glow(c.a), rx - 28, ry - 34, 56, 56);
                  g.globalCompositeOperation = 'source-over';
                  g.globalAlpha = 1;
                }

                // Animated Hopping / Blinking / Croaking Cute Frog
                const isCroak = isSel && Math.sin(t * 6.5) > 0.82;
                const isBlink = !isCroak && ((t * 1.5 + i * 0.7) % 3.2) > 2.82;
                const useWalk = isSel && !isCroak && !isBlink && Math.floor(t * 5) % 2 === 1;
                const sprImg = isCroak
                  ? engine.S.pPuff[i]
                  : isBlink && engine.S.pBlink
                  ? engine.S.pBlink[i]
                  : useWalk
                  ? engine.S.pWalk[i]
                  : engine.S.pIdle[i];

                const hop = isSel
                  ? Math.abs(Math.sin(t * 5.2)) * 5.5
                  : Math.max(0, Math.sin(t * 3.2 + i)) * 2.5;
                const squash = isSel ? Math.sin(t * 10.4) * 0.08 : Math.sin(t * 5 + i) * 0.04;
                const frogScale = sc * 1.15;

                const fw = sprImg.width * frogScale * (1 + squash);
                const fh = sprImg.height * frogScale * (1 - squash);
                const fx = rx - fw / 2;
                const fy = ry - fh - hop + 3;

                g.drawImage(sprImg, fx, fy, fw, fh);

                if (!un && engine.S.lock) {
                  const lw = engine.S.lock.width * sc * 0.68;
                  const lh = engine.S.lock.height * sc * 0.68;
                  g.drawImage(engine.S.lock, rx + pedW * 0.55 - lw / 2, ry - lh / 2 + 2, lw, lh);
                }
                g.restore();
              },
            });
          });

          items.sort((a, b) => a.z - b.z);
          items.forEach((it) => it.draw());
        }
      }
      rafId = requestAnimationFrame(renderStage);
    };
    rafId = requestAnimationFrame(renderStage);
    return () => cancelAnimationFrame(rafId);
  }, [engine, selectedChar]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') handlePrev();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') handleNext();
      if (e.code === 'Enter' || e.code === 'Space') {
        if (isUnlocked) onStartSolo(selectedChar);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedChar, isUnlocked]);

  const u = engine?.achStats.upg || { hp: 0, dm: 0, sp: 0, gold: 0, luck: 0 };
  const hpBar = Math.min(5, Math.max(1, Math.round((curChar.hp + u.hp) / 2)));
  const dmBar = Math.min(5, Math.max(1, Math.round(curChar.dm * (1 + u.dm * 0.12) * 1.5)));
  const rtBar = Math.min(5, Math.max(1, Math.round((0.5 - curChar.rt) * 16)));
  const spBar = Math.min(5, Math.max(1, Math.round((curChar.sp * (1 + u.sp * 0.06) - 65) / 14)));

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-2.5 md:p-5 bg-gradient-to-b from-[#040a06d8] via-[#040a0698] to-[#040a06f2] select-none overflow-y-auto">
      {/* Top Arcade Header Bar (100% Pixel Art Icons, Zero Emojis) */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShaman}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#08181c] hover:bg-[#0d262c] border-2 border-[#00e5ff] text-[#00e5ff] font-mono font-bold text-xs shadow-[3px_3px_0_#000] active:translate-y-0.5 cursor-pointer transition-transform"
            title="Abrir Caldeirão de Upgrades Permanentes do Xamã"
          >
            <PixelIcon sprite={engine?.S?.larva} size={16} />
            <span className="tabular-nums">{larvae} LARVAS</span>
          </button>

          {/* Lifetime Progress Summary Badge */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#08140d] border-2 border-[#2e573c] text-[11px] font-mono font-bold text-[#a5d6a7] shadow-[3px_3px_0_#000]">
            <span className="flex items-center gap-1.5" title="Abates Totais">
              <PixelIcon sprite={engine?.S?.skull} size={13} />
              <span className="tabular-nums text-[#e8f5e9]">{engine?.achStats.kills || 0}</span>
            </span>
            <span className="text-[#2e573c]">|</span>
            <span className="flex items-center gap-1.5" title="Sapos Desbloqueados">
              <PixelIcon sprite={engine?.S?.pIdle?.[0]} size={14} />
              <span className="tabular-nums text-[#69f0ae]">{unlockedFrogsCount}/6</span>
            </span>
            <span className="text-[#2e573c]">|</span>
            <span className="flex items-center gap-1.5" title="Conquistas Desbloqueadas">
              <PixelIcon sprite={engine?.S?.trp} size={13} />
              <span className="tabular-nums text-[#ffd54f]">
                {Object.keys(engine?.achData || {}).length}/15
              </span>
            </span>
          </div>
        </div>

        {/* Top-Right Pixel Utility Controls (Audio, Mobile Touch Mode, Fullscreen) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (!engine) return;
              const cur = engine.CFG.touch || 'auto';
              engine.CFG.touch = cur === 'auto' ? 'on' : cur === 'on' ? 'off' : 'auto';
              engine.saveProgress();
              engine.snd(420, 0.08, 'triangle', 0.06, 120);
              forceUpdate();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1811] hover:bg-[#142e20] border-2 border-[#66bb6a] text-[11px] font-mono font-bold text-[#e8f5e9] shadow-[3px_3px_0_#000] active:translate-y-0.5 cursor-pointer"
            title="Modo dos Controles de Celular na Tela"
          >
            <PixelIcon sprite={engine?.S?.joyIc} size={14} />
            <span>TOUCH: {(engine?.CFG.touch || 'auto').toUpperCase()}</span>
          </button>

          <button
            onClick={() => {
              if (!engine) return;
              engine.CFG.muted = !engine.CFG.muted;
              engine.saveProgress();
              forceUpdate();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1811] hover:bg-[#142e20] border-2 border-[#66bb6a] text-[11px] font-mono font-bold text-[#ffd54f] shadow-[3px_3px_0_#000] active:translate-y-0.5 cursor-pointer"
            title="Alternar Som (M)"
          >
            <PixelIcon sprite={engine?.S?.spk} size={14} />
            <span className="hidden xs:inline">{engine?.CFG.muted ? 'MUDO' : 'SOM ON'}</span>
          </button>

          <button
            onClick={() => {
              if (engine) {
                engine.toggleFullscreen();
              } else if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
              setTimeout(forceUpdate, 200);
            }}
            data-testid="title-btn-fullscreen"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1811] hover:bg-[#142e20] border-2 border-[#66bb6a] text-[11px] font-mono font-bold text-[#e8f5e9] shadow-[3px_3px_0_#000] active:translate-y-0.5 cursor-pointer"
            title="Alternar Tela Cheia"
            aria-label="Tela Cheia"
          >
            <PixelIcon sprite={engine?.S?.fs} size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Split: Left Character Stage & Inspector / Right Arcade Command Deck */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-7 w-full max-w-5xl mx-auto my-auto py-1">
        {/* Left Column: Pixel Title + 2.5D Pedestal Carousel + Quick Frog Selector + Character Sheet */}
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="text-center mb-1">
            <div className="flex items-center justify-center gap-2.5">
              <PixelIcon sprite={engine?.S?.crown} size={22} />
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-[#b9f6ca] drop-shadow-[0_4px_0_#1b5e20]"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                SAPINHOS SAPECAS
              </h1>
              <PixelIcon sprite={engine?.S?.crown} size={22} />
            </div>
            <p className="text-[10px] sm:text-[11px] font-mono font-bold text-[#ffd54f] tracking-widest mt-1">
              DUNGEON BREJO EDITION · ROGUELIKE PIXEL ART
            </p>
          </div>

          {/* 2.5D Animated Carousel Stage with 100% Pixel-Art Arrow Icons */}
          <div className="relative w-full flex items-center justify-center my-0.5">
            <button
              onClick={handlePrev}
              className="z-10 w-10 h-10 bg-[#14281b] hover:bg-[#1e3b28] border-2 border-[#66bb6a] flex items-center justify-center shadow-[0_4px_0_#07100a] active:translate-y-1 active:shadow-none cursor-pointer"
              aria-label="Sapo Anterior"
            >
              <PixelIcon sprite={engine?.S?.arrL} size={18} />
            </button>

            <canvas
              ref={stageCanvasRef}
              width={260}
              height={104}
              onClick={handleNext}
              className="image-rendering-pixelated cursor-pointer mx-1"
              title="Clique para girar o carrossel de sapos"
            />

            <button
              onClick={handleNext}
              className="z-10 w-10 h-10 bg-[#14281b] hover:bg-[#1e3b28] border-2 border-[#66bb6a] flex items-center justify-center shadow-[0_4px_0_#07100a] active:translate-y-1 active:shadow-none cursor-pointer"
              aria-label="Próximo Sapo"
            >
              <PixelIcon sprite={engine?.S?.arrR} size={18} />
            </button>
          </div>

          {/* Quick-Select 6-Frog Pixel Portrait Strip */}
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {CH.map((c, idx) => {
              const un = engine ? engine.isCharUnlocked(idx) : idx < 2;
              const isSel = idx === selectedChar;
              return (
                <button
                  key={c.n}
                  onClick={() => {
                    setSelectedChar(idx);
                    if (engine) engine.snd(460, 0.08, 'triangle', 0.06, 150);
                  }}
                  aria-label={`Selecionar ${c.n}`}
                  className={`relative w-9 h-9 border-2 flex items-center justify-center cursor-pointer transition-all ${
                    isSel
                      ? 'bg-[#1b3b26] border-[#ffd54f] -translate-y-0.5 shadow-[0_3px_0_#000]'
                      : 'bg-[#08120c] border-[#264732] opacity-75 hover:opacity-100'
                  }`}
                  title={`${c.n} (${c.t})`}
                >
                  <PixelIcon sprite={engine?.S?.pIdle?.[idx]} size={22} />
                  {!un && (
                    <div className="absolute -bottom-1 -right-1">
                      <PixelIcon sprite={engine?.S?.lock} size={10} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pixel-Art Inspector Sheet (Ammonomicon / Forager style) */}
          <div className="w-full bg-[#09140ef5] border-2 border-[#66bb6a] p-3 shadow-[4px_4px_0_#000]">
            <div className="flex justify-between items-baseline border-b-2 border-[#1e3a27] pb-1.5 mb-2">
              <span
                className="font-black text-sm md:text-base text-[#ffd54f]"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                {isUnlocked ? curChar.n : `??? (${curChar.n})`}
              </span>
              <span className="text-xs font-mono font-bold text-[#81c784]">{curChar.t}</span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#050c08] border border-[#1e3a27] px-2.5 py-1.5 mb-2">
              <div className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.weapons?.[curChar.wp]} size={22} />
                <div className="text-xs font-mono">
                  <span className="text-[#80cbc4] font-bold">HABILIDADE: </span>
                  <span className="text-[#e8f5e9] font-bold">{WP[curChar.wp].nm}</span>
                </div>
              </div>
              <div className="flex items-center gap-1" title="Mutações de Afinidade Genética">
                {curChar.aff.slice(0, 4).map((itIdx) => (
                  <PixelIcon key={itIdx} sprite={engine?.S?.items?.[itIdx]} size={15} />
                ))}
              </div>
            </div>

            <div className="text-xs text-[#dcedc8] font-mono mb-2">
              <strong className="text-[#80cbc4]">PASSIVA:</strong> {curChar.pas}
            </div>

            {/* Segmented Pixel Stat Bars with Pixel Icons */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono font-bold text-[#b0bec5]">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <PixelIcon sprite={engine?.S?.h} size={11} />
                  <span>VIDA</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-2.5 border ${
                        idx < hpBar
                          ? 'bg-[#ef5350] border-[#ffcdd2]'
                          : 'bg-[#111c15] border-[#263e2d]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <PixelIcon sprite={engine?.S?.items?.[0]} size={11} />
                  <span>DANO</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-2.5 border ${
                        idx < dmBar
                          ? 'bg-[#ffd54f] border-[#fff9c4]'
                          : 'bg-[#111c15] border-[#263e2d]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <PixelIcon sprite={engine?.S?.items?.[1]} size={11} />
                  <span>CADÊNCIA</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-2.5 border ${
                        idx < rtBar
                          ? 'bg-[#66bb6a] border-[#b9f6ca]'
                          : 'bg-[#111c15] border-[#263e2d]'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <PixelIcon sprite={engine?.S?.items?.[3]} size={11} />
                  <span>VELOC.</span>
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-2.5 border ${
                        idx < spBar
                          ? 'bg-[#29b6f6] border-[#b3e5fc]'
                          : 'bg-[#111c15] border-[#263e2d]'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {!isUnlocked && (
              <div className="mt-2 p-1.5 bg-[#381212] border-2 border-[#ef5350] text-center text-[11px] font-mono font-bold text-[#ffcdd2] flex items-center justify-center gap-1.5">
                <PixelIcon sprite={engine?.S?.lock} size={12} />
                <span>BLOQUEADO — {curChar.reqTxt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Complete Indie Arcade Command Deck */}
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {/* Primary Start Button: Campfire Sanctuary */}
          <button
            data-start="true"
            disabled={!isUnlocked}
            onClick={() => onStartSolo(selectedChar)}
            className="w-full py-3 px-3.5 font-black text-xs md:text-sm text-[#041007] bg-[#69f0ae] hover:bg-[#b9f6ca] border-2 border-[#ffffff] shadow-[0_4px_0_#1b5e20] active:translate-y-1 active:shadow-none disabled:opacity-45 disabled:pointer-events-none cursor-pointer flex items-center justify-between transition-all"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            <span className="flex items-center gap-2">
              <PixelIcon sprite={engine?.S?.playIc} size={16} />
              <span>JOGAR AGORA</span>
            </span>
            <span className="text-[9px] bg-[#0a2612] text-[#69f0ae] px-1.5 py-1">[SPACE]</span>
          </button>

          {/* Direct Dungeon Dive Button (Skips Campfire Sanctuary) */}
          {onStartDirect && (
            <button
              disabled={!isUnlocked}
              onClick={() => onStartDirect(selectedChar)}
              className="w-full py-2 px-3.5 font-mono font-black text-xs text-[#fff8e1] bg-[#2e7d32] hover:bg-[#388e3c] border-2 border-[#a5d6a7] shadow-[0_3px_0_#0d2612] active:translate-y-0.5 active:shadow-none disabled:opacity-45 disabled:pointer-events-none cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.weapons?.[curChar.wp]} size={16} />
                <span>MERGULHO DIRETO NA MASMORRA</span>
              </span>
              <span className="text-[10px] text-[#b9f6ca]">BIOMA 1</span>
            </button>
          )}

          {/* Real Online Co-op Room Box (WebSocket + Multi-Tab Broadcast, Zero Bots) */}
          <div className="bg-[#09140ef5] border-2 border-[#00e5ff] p-2.5 flex flex-col gap-1.5 shadow-[4px_4px_0_#000]">
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#84ffff]">
              <span className="flex items-center gap-1.5">
                <PixelIcon sprite={engine?.S?.pIdle?.[1]} size={14} />
                <span>SALA MULTIPLAYER CO-OP</span>
              </span>
              <span className="text-[#ffd54f]">ONLINE REAL · SEM BOT</span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toLowerCase().slice(0, 10))}
                placeholder="sala (ex: sapo01)"
                aria-label="Código da Sala Co-op Online"
                className="flex-1 bg-[#040806] text-[#ffd54f] font-mono font-bold text-center border-2 border-[#00838f] px-2 py-1 text-xs uppercase focus:outline-none focus:border-[#00e5ff]"
              />
              <button
                disabled={!isUnlocked}
                onClick={() => {
                  onStartCoop(selectedChar, roomCode || 'sapo01');
                }}
                data-testid="title-btn-coop"
                className="px-3 py-1 font-mono font-black text-xs text-[#041014] bg-[#00e5ff] hover:bg-[#84ffff] border-2 border-[#ffffff] shadow-[0_3px_0_#004d40] active:translate-y-0.5 active:shadow-none cursor-pointer disabled:opacity-50"
              >
                CONECTAR
              </button>
            </div>
          </div>

          {/* Shaman Upgrade Cauldron */}
          <button
            onClick={onOpenShaman}
            className="w-full py-2 px-3.5 font-mono font-black text-xs text-[#e0f7fa] bg-[#006064] hover:bg-[#00838f] border-2 border-[#00e5ff] shadow-[0_4px_0_#002f36] active:translate-y-1 active:shadow-none cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PixelIcon sprite={engine?.S?.shaman} size={18} />
              <span>CALDEIRÃO DO XAMÃ</span>
            </span>
            <span className="flex items-center gap-1.5 text-[#ffd54f] tabular-nums">
              <span>{larvae}</span>
              <PixelIcon sprite={engine?.S?.larva} size={14} />
            </span>
          </button>

          {/* Compendium / Bestiary & Arsenal (Ammonomicon style) */}
          {onOpenCodex && (
            <button
              onClick={onOpenCodex}
              className="w-full py-2 px-3.5 font-mono font-black text-xs text-[#f3e5f5] bg-[#4a148c] hover:bg-[#6a1b9a] border-2 border-[#ea80fc] shadow-[0_4px_0_#1a0536] active:translate-y-1 active:shadow-none cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.bookIc} size={18} />
                <span>COMPÊNDIO & BESTIÁRIO</span>
              </span>
              <span className="text-[10px] text-[#ea80fc]">41 ITENS</span>
            </button>
          )}

          {/* Achievements */}
          <button
            onClick={onOpenAchievements}
            className="w-full py-2 px-3.5 font-mono font-black text-xs text-[#fff8e1] bg-[#e65100] hover:bg-[#ef6c00] border-2 border-[#ffd54f] shadow-[0_4px_0_#662200] active:translate-y-1 active:shadow-none cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PixelIcon sprite={engine?.S?.trp} size={17} />
              <span>CONQUISTAS & METAS</span>
            </span>
            <span className="text-[#ffd54f] tabular-nums">
              {Object.keys(engine?.achData || {}).length}/15
            </span>
          </button>

          {/* Options & Audio */}
          <button
            onClick={onOpenOptions}
            className="w-full py-2 px-3.5 font-mono font-black text-xs text-[#e0f2f1] bg-[#1b3b2b] hover:bg-[#254f3a] border-2 border-[#80cbc4] shadow-[0_4px_0_#09140e] active:translate-y-1 active:shadow-none cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PixelIcon sprite={engine?.S?.gear} size={16} />
              <span>OPÇÕES & CONTROLES</span>
            </span>
            <span className="text-xs text-[#80cbc4]">[ESC]</span>
          </button>
        </div>
      </div>

      {/* Bottom Pixel-Art Control Legend */}
      <div className="w-full max-w-5xl mx-auto text-center text-[10px] sm:text-[11px] font-mono text-[#a5d6a7] pt-1">
        <span>WASD / Analógico Esq: Move</span>
        <span className="mx-2">·</span>
        <span>Mouse / Analógico Dir: Mira 360° & Atira</span>
        <span className="mx-2">·</span>
        <span>Espaço / PULO: Esquiva Eixo Z</span>
        <span className="mx-2">·</span>
        <span>[E] / USAR: Interage (Baú, Loja, Xamã)</span>
      </div>
    </div>
  );
};
