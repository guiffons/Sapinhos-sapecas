import React, { useState, useEffect, useRef } from 'react';
import { CH, WP, CharacterDef, MUTATION_DETAILS, SWAMP_RUNES } from '../game/constants.ts';
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
  onOpenRunes?: () => void;
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

export const SapinhosLogo: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [cleanSrc, setCleanSrc] = useState<string>('/assets/aistudio/153103_049e06f5.jpg');
  const [isProcessed, setIsProcessed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        const visited = new Uint8Array(w * h);
        const q = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isOuterBlack = (idx: number) => {
          const p = idx * 4;
          return d[p] < 62 && d[p + 1] < 62 && d[p + 2] < 62;
        };

        // Seed flood-fill from all 4 outer edges so only the exterior black box is removed
        for (let x = 0; x < w; x++) {
          const topIdx = x;
          const botIdx = (h - 1) * w + x;
          if (isOuterBlack(topIdx)) {
            visited[topIdx] = 1;
            q[tail++] = topIdx;
          }
          if (isOuterBlack(botIdx)) {
            visited[botIdx] = 1;
            q[tail++] = botIdx;
          }
        }
        for (let y = 1; y < h - 1; y++) {
          const leftIdx = y * w;
          const rightIdx = y * w + (w - 1);
          if (isOuterBlack(leftIdx)) {
            visited[leftIdx] = 1;
            q[tail++] = leftIdx;
          }
          if (isOuterBlack(rightIdx)) {
            visited[rightIdx] = 1;
            q[tail++] = rightIdx;
          }
        }

        while (head < tail) {
          const cur = q[head++];
          d[cur * 4 + 3] = 0;
          const cx = cur % w;
          const cy = (cur / w) | 0;

          if (cx > 0) {
            const ni = cur - 1;
            if (!visited[ni] && isOuterBlack(ni)) {
              visited[ni] = 1;
              q[tail++] = ni;
            }
          }
          if (cx < w - 1) {
            const ni = cur + 1;
            if (!visited[ni] && isOuterBlack(ni)) {
              visited[ni] = 1;
              q[tail++] = ni;
            }
          }
          if (cy > 0) {
            const ni = cur - w;
            if (!visited[ni] && isOuterBlack(ni)) {
              visited[ni] = 1;
              q[tail++] = ni;
            }
          }
          if (cy < h - 1) {
            const ni = cur + w;
            if (!visited[ni] && isOuterBlack(ni)) {
              visited[ni] = 1;
              q[tail++] = ni;
            }
          }
        }

        // Compute tight bounding box of non-transparent logo pixels
        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (d[i * 4 + 3] > 0) {
              // Feather dark fringe pixels directly bordering exterior transparency
              if (
                (x > 0 && visited[i - 1]) ||
                (x < w - 1 && visited[i + 1]) ||
                (y > 0 && visited[i - w]) ||
                (y < h - 1 && visited[i + w])
              ) {
                const lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
                if (lum < 140) {
                  d[i * 4 + 3] = Math.round((lum / 140) * 255);
                }
              }
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const pad = 6;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(w - sx, maxX - minX + 1 + pad * 2);
        const sh = Math.min(h - sy, maxY - minY + 1 + pad * 2);

        const outCv = document.createElement('canvas');
        outCv.width = sw;
        outCv.height = sh;
        const outCtx = outCv.getContext('2d');
        if (outCtx && sw > 20 && sh > 20) {
          outCtx.drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
          if (!cancelled) {
            setCleanSrc(outCv.toDataURL('image/png'));
            setIsProcessed(true);
          }
        }
      } catch (_e) {}
    };
    img.src = '/assets/aistudio/153103_049e06f5.jpg';
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="game-logo"
      className="btn-jelly animate-logo-float group relative flex flex-col items-center justify-center cursor-pointer focus:outline-none mb-1"
      title="Sapinhos Sapecas — Clique para coaxar!"
    >
      <img
        src={cleanSrc}
        alt="Sapinhos Sapecas Logo"
        data-raw-src="/assets/aistudio/153103_049e06f5.jpg"
        className={`w-64 sm:w-72 md:w-80 max-h-28 sm:max-h-32 object-contain select-none pointer-events-none transition-transform duration-200 group-hover:scale-105 ${
          isProcessed
            ? 'drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]'
            : 'mix-blend-screen rounded-lg'
        }`}
      />
    </button>
  );
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  engine,
  onStartSolo,
  onStartCoop,
  onOpenAchievements,
  onOpenOptions,
  onOpenShaman,
  onOpenCodex,
  onOpenRunes,
}) => {
  const [selectedChar, setSelectedChar] = useState<number>(0);
  const [roomCode, setRoomCode] = useState<string>('sapo' + Math.floor(10 + Math.random() * 89));
  const [larvae, setLarvae] = useState<number>(engine?.achStats.larvae ?? 0);
  const [hoveredAffMut, setHoveredAffMut] = useState<number | null>(null);
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
      setTick((t) => t + 1);
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
    setHoveredAffMut(null);
    if (engine) engine.snd(440, 0.09, 'triangle', 0.07, 180);
  };

  const handleNext = () => {
    setSelectedChar((prev) => (prev + 1) % CH.length);
    setHoveredAffMut(null);
    if (engine) engine.snd(490, 0.09, 'triangle', 0.07, 200);
  };

  // 60FPS Animated 2.5D Pixel Art Carousel Stage with Live Pixel Tongue & Fly Showcase
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

          // Subtle pixel swamp flora flanking the stage
          if (engine.S.flora) {
            const fl0 = ((t * 1.8) | 0) % 2 === 0 ? engine.S.flora[0] : engine.S.flora2?.[0] || engine.S.flora[0];
            const fl1 = ((t * 2.1) | 0) % 2 === 0 ? engine.S.flora[1] : engine.S.flora2?.[1] || engine.S.flora[1];
            if (fl0) g.drawImage(fl0, 8, ch - 26, 16, 12);
            if (fl1) g.drawImage(fl1, cw - 24, ch - 26, 16, 12);
          }

          const items: Array<{ z: number; idx: number; draw: () => void }> = [];

          CH.forEach((c, i) => {
            const ang = (i * Math.PI * 2) / CH.length - animAngleRef.current;
            const rx = cw / 2 + Math.sin(ang) * 96;
            const ry = ch / 2 + 14 + Math.cos(ang) * 20;
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

                // 2.5D Pixel-Art Lilypad / Stone Pedestal
                const pedW = Math.round(24 * sc);
                const pedH = Math.round(8 * sc);
                g.fillStyle = '#040a06';
                g.fillRect(rx - pedW - 1, ry - pedH + 3, pedW * 2 + 2, pedH * 2 + 4);

                g.fillStyle = isSel ? '#1b5e20' : '#1c2b22';
                g.fillRect(rx - pedW, ry - pedH + 1, pedW * 2, pedH * 2 + 2);

                g.fillStyle = isSel ? '#43a047' : '#2e4738';
                g.fillRect(rx - pedW + 2, ry - pedH, pedW * 2 - 4, pedH * 2 - 2);

                g.fillStyle = isSel ? '#ffd54f' : '#66bb6a';
                g.fillRect(rx - pedW + 4, ry - pedH, pedW * 2 - 8, 2);

                if (isSel) {
                  g.globalCompositeOperation = 'lighter';
                  g.globalAlpha = 0.38 + Math.sin(t * 6) * 0.1;
                  g.drawImage(glow(c.a), rx - 28, ry - 34, 56, 56);
                  g.globalCompositeOperation = 'source-over';
                  g.globalAlpha = 1;
                }

                // Animated Hopping / Blinking / Croaking Cute Frog
                const attackCycle = (t * 1.6) % 3.0;
                const isAttackingPreview = isSel && attackCycle > 2.15 && attackCycle < 2.75;
                const isCroak = isAttackingPreview || (isSel && Math.sin(t * 6.5) > 0.84);
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

                const fw = Math.round(sprImg.width * frogScale * (1 + squash));
                const fh = Math.round(sprImg.height * frogScale * (1 - squash));
                const fx = Math.round(rx - fw / 2);
                const fy = Math.round(ry - fh - hop + 3);

                g.drawImage(sprImg, fx, fy, fw, fh);

                // Live Pixel-Art Tongue / Ability Showcase for Selected Frog!
                if (isSel && un) {
                  const mouthX = Math.round(rx + 6);
                  const mouthY = Math.round(fy + fh * 0.62);
                  const flyX = Math.round(rx + 36 + Math.cos(t * 5) * 4);
                  const flyY = Math.round(fy + fh * 0.42 + Math.sin(t * 7) * 4);

                  // Buzzing golden fly target
                  const flySpr = engine.S.flyGold?.[((t * 14) | 0) % 2];
                  if (flySpr) {
                    g.drawImage(flySpr, flyX - 6, flyY - 5, 12, 10);
                  }

                  if (c.wp === 3) {
                    // Dart's Pixel-Art Tongue (small when idle, snaps out in pixel blocks when attacking!)
                    const prog = isAttackingPreview
                      ? Math.sin(((attackCycle - 2.15) / 0.6) * Math.PI)
                      : 0;
                    const reachX = mouthX + 6 + (flyX - mouthX - 6) * prog;
                    const reachY = mouthY + (flyY - mouthY) * prog;
                    const steps = Math.max(2, Math.ceil(Math.hypot(reachX - mouthX, reachY - mouthY) / 2));
                    for (let s = 0; s <= steps; s++) {
                      const px = Math.round((mouthX + ((reachX - mouthX) * s) / steps) / 2) * 2;
                      const py = Math.round((mouthY + ((reachY - mouthY) * s) / steps) / 2) * 2;
                      g.fillStyle = '#240612';
                      g.fillRect(px - 1, py - 1, 4, 4);
                      g.fillStyle = '#ff4081';
                      g.fillRect(px, py, 2, 2);
                    }
                    const tx = Math.round(reachX / 2) * 2;
                    const ty = Math.round(reachY / 2) * 2;
                    g.fillStyle = '#ffcdd2';
                    g.fillRect(tx, ty, 2, 2);
                  } else if (isAttackingPreview) {
                    // Pixel projectile burst preview for other frogs
                    const prog = (attackCycle - 2.15) / 0.6;
                    const bx = Math.round((mouthX + (flyX - mouthX) * prog) / 2) * 2;
                    const by = Math.round((mouthY + (flyY - mouthY) * prog) / 2) * 2;
                    const pCol = WP[c.wp]?.col || '#76ff03';
                    g.fillStyle = '#08140c';
                    g.fillRect(bx - 3, by - 3, 6, 6);
                    g.fillStyle = pCol;
                    g.fillRect(bx - 2, by - 2, 4, 4);
                    g.fillStyle = '#ffffff';
                    g.fillRect(bx - 1, by - 1, 2, 2);
                  }
                }

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
  const rm = engine?.getRuneModifiers() || {
    dmMult: 1,
    rtMult: 1,
    spBonus: 0,
    hpDelta: 0,
  };
  const hpBar = Math.min(5, Math.max(1, Math.round((curChar.hp + u.hp + rm.hpDelta) / 2)));
  const dmBar = Math.min(
    5,
    Math.max(1, Math.round(curChar.dm * (1 + u.dm * 0.12) * rm.dmMult * 1.5))
  );
  const rtBar = Math.min(5, Math.max(1, Math.round((0.5 - curChar.rt * rm.rtMult) * 16)));
  const spBar = Math.min(
    5,
    Math.max(1, Math.round(((curChar.sp + rm.spBonus) * (1 + u.sp * 0.06) - 65) / 14))
  );

  const activeRunesList = (engine?.activeRunes || [])
    .map((id) => SWAMP_RUNES.find((r) => r.id === id))
    .filter(Boolean);

  const activeAffDetail = hoveredAffMut !== null ? MUTATION_DETAILS[hoveredAffMut] : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-2.5 md:p-4 bg-gradient-to-b from-[#040a06b8] via-[#040a0670] to-[#040a06e8] select-none overflow-y-auto font-pixel">
      {/* Top Arcade Header Bar (100% Pixel Art Icons, Jelly Buttons) */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShaman}
            className="btn-jelly flex items-center gap-2 px-3 py-1.5 bg-[#08181c] hover:bg-[#0d262c] border-2 border-[#00e5ff] text-[#00e5ff] font-bold text-xs shadow-[0_3px_0_#00363a] cursor-pointer"
            title="Abrir Caldeirão de Upgrades Permanentes do Xamã"
          >
            <PixelIcon sprite={engine?.S?.larva} size={16} />
            <span className="tabular-nums">{larvae} LARVAS</span>
          </button>

          {/* Lifetime Progress Summary */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-[#08140d] border-2 border-[#2e573c] text-[11px] font-bold text-[#a5d6a7] shadow-[0_3px_0_#040805]">
            <span className="flex items-center gap-1.5" title="Abates Totais">
              <PixelIcon sprite={engine?.S?.skull} size={13} />
              <span className="tabular-nums text-[#e8f5e9]">{engine?.achStats.kills || 0}</span>
            </span>
            <span className="text-[#2e573c]">·</span>
            <span className="flex items-center gap-1.5" title="Sapos Desbloqueados">
              <PixelIcon sprite={engine?.S?.pIdle?.[0]} size={14} />
              <span className="tabular-nums text-[#69f0ae]">{unlockedFrogsCount}/6</span>
            </span>
            <span className="text-[#2e573c]">·</span>
            <span className="flex items-center gap-1.5" title="Conquistas Desbloqueadas">
              <PixelIcon sprite={engine?.S?.trp} size={13} />
              <span className="tabular-nums text-[#ffd54f]">
                {Object.keys(engine?.achData || {}).length}/15
              </span>
            </span>
          </div>
        </div>

        {/* Top-Right Pixel Utility Controls (Audio & Fullscreen) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (!engine) return;
              engine.CFG.muted = !engine.CFG.muted;
              engine.saveProgress();
              forceUpdate();
            }}
            className="btn-jelly flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1811] hover:bg-[#142e20] border-2 border-[#66bb6a] text-[11px] font-bold text-[#ffd54f] shadow-[0_3px_0_#040805] cursor-pointer"
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
            className="btn-jelly flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a1811] hover:bg-[#142e20] border-2 border-[#66bb6a] text-[11px] font-bold text-[#e8f5e9] shadow-[0_3px_0_#040805] cursor-pointer"
            title="Alternar Tela Cheia"
            aria-label="Tela Cheia"
          >
            <PixelIcon sprite={engine?.S?.fs} size={14} />
            <span className="hidden sm:inline">TELA CHEIA</span>
          </button>
        </div>
      </div>

      {/* Main Content Split: Left Character Stage & Inspector / Right Arcade Command Deck */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-7 w-full max-w-5xl mx-auto my-auto py-0.5">
        {/* Left Column: Official Game Logo + 2.5D Pedestal Carousel + Quick Frog Selector + Character Sheet */}
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Official SAPINHOS SAPECAS Logo (Zero Crowns!) */}
          <SapinhosLogo
            onClick={() => {
              if (engine) engine.snd(360, 0.14, 'triangle', 0.08, 240);
            }}
          />

          {/* 2.5D Animated Carousel Stage with Jelly Pixel-Art Arrow Icons */}
          <div className="relative w-full flex items-center justify-center my-0.5">
            <button
              onClick={handlePrev}
              className="btn-jelly z-10 w-10 h-10 bg-[#14281b] hover:bg-[#1e3b28] border-2 border-[#66bb6a] flex items-center justify-center shadow-[0_4px_0_#07100a] cursor-pointer"
              aria-label="Sapo Anterior"
            >
              <PixelIcon sprite={engine?.S?.arrL} size={18} />
            </button>

            <canvas
              ref={stageCanvasRef}
              width={260}
              height={100}
              onClick={handleNext}
              className="image-rendering-pixelated cursor-pointer mx-1"
              title="Clique para girar o carrossel de sapos"
            />

            <button
              onClick={handleNext}
              className="btn-jelly z-10 w-10 h-10 bg-[#14281b] hover:bg-[#1e3b28] border-2 border-[#66bb6a] flex items-center justify-center shadow-[0_4px_0_#07100a] cursor-pointer"
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
                    setHoveredAffMut(null);
                    if (engine) engine.snd(460, 0.08, 'triangle', 0.06, 150);
                  }}
                  aria-label={`Selecionar ${c.n}`}
                  className={`btn-jelly relative w-9 h-9 border-2 flex items-center justify-center cursor-pointer ${
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

          {/* Pixel-Art Inspector Sheet with Interactive Affinity Mutation Tooltips */}
          <div className="relative w-full bg-[#09140ef5] border-2 border-[#66bb6a] p-3 shadow-[4px_4px_0_#000]">
            <div className="flex justify-between items-baseline border-b-2 border-[#1e3a27] pb-1.5 mb-2">
              <span className="text-xs sm:text-sm text-[#ffd54f] font-pixel-title">
                {isUnlocked ? curChar.n.toUpperCase() : `??? (${curChar.n.toUpperCase()})`}
              </span>
              <span className="text-[10px] text-[#81c784]">{curChar.t}</span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#050c08] border border-[#1e3a27] px-2.5 py-1.5 mb-2">
              <div className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.weapons?.[curChar.wp]} size={22} />
                <div className="text-[10px]">
                  <span className="text-[#80cbc4]">ATAQUE: </span>
                  <span className="text-[#e8f5e9]">{WP[curChar.wp].nm}</span>
                </div>
              </div>
              <div className="flex items-center gap-1" aria-label="Mutações de Afinidade">
                {curChar.aff.slice(0, 4).map((itIdx) => {
                  const det = MUTATION_DETAILS[itIdx];
                  const isFocused = hoveredAffMut === itIdx;
                  return (
                    <button
                      key={itIdx}
                      type="button"
                      data-testid={`title-aff-mut-${itIdx}`}
                      onMouseEnter={() => setHoveredAffMut(itIdx)}
                      onFocus={() => setHoveredAffMut(itIdx)}
                      onClick={() => setHoveredAffMut(itIdx)}
                      aria-label={`Inspecionar mutação de afinidade ${det?.name || ''}`}
                      className={`btn-jelly w-7 h-7 border flex items-center justify-center cursor-pointer ${
                        isFocused
                          ? 'bg-[#1b3b26] border-[#ffd54f]'
                          : 'bg-[#09160e] border-[#2e573c]'
                      }`}
                    >
                      <PixelIcon sprite={engine?.S?.items?.[itIdx]} size={16} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Affinity Mutation Tooltip Popover */}
            {activeAffDetail && (
              <div
                className="mb-2 p-2.5 bg-[#040c08] border-2 border-[#ffd54f] shadow-[4px_4px_0_#000] text-[9px] space-y-1"
                role="tooltip"
                data-testid="title-mutation-tooltip"
              >
                <div className="flex items-center justify-between border-b border-[#1e3a27] pb-1">
                  <span className="text-[#ffd54f]">{activeAffDetail.name}</span>
                  <span style={{ color: activeAffDetail.rarityColor }}>
                    {activeAffDetail.rarityName} · {activeAffDetail.category.toUpperCase()}
                  </span>
                </div>
                <div className="text-[#69f0ae]">
                  + BÔNUS: {activeAffDetail.bonuses[0]}
                </div>
                <div className="text-[#ff8a80]">
                  - PENALIDADE: {activeAffDetail.penalties[0]}
                </div>
                <div className="text-[#84ffff]">
                  AFINIDADE: {activeAffDetail.affinityText}
                </div>
              </div>
            )}

            <div className="text-[10px] text-[#dcedc8] mb-2">
              <span className="text-[#80cbc4]">PASSIVA:</span> {curChar.pas}
            </div>

            {/* Segmented Pixel Stat Bars with Pixel Icons */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] text-[#b0bec5]">
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
              <div className="mt-2 p-1.5 bg-[#381212] border-2 border-[#ef5350] text-center text-[9px] text-[#ffcdd2] flex items-center justify-center gap-1.5">
                <PixelIcon sprite={engine?.S?.lock} size={12} />
                <span>BLOQUEADO — {curChar.reqTxt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Concise Godot Pixel-Art Jelly Command Deck */}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {/* Primary Start Button: Campfire Sanctuary & Dungeon */}
          <button
            data-start="true"
            disabled={!isUnlocked}
            onClick={() => onStartSolo(selectedChar)}
            className="btn-jelly pixel-text-dark w-full py-3 px-4 text-xs sm:text-sm text-[#041007] bg-[#69f0ae] hover:bg-[#b9f6ca] border-2 border-[#ffffff] shadow-[0_4px_0_#1b5e20] disabled:opacity-45 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2.5 font-pixel-title"
          >
            <PixelIcon sprite={engine?.S?.playIc} size={16} />
            <span>JOGAR AGORA</span>
          </button>

          {/* Swamp Runes Preparation Button (Equip Runes before entering Dungeon) */}
          {onOpenRunes && (
            <button
              onClick={onOpenRunes}
              data-testid="title-btn-runes"
              className="btn-jelly w-full py-2.5 px-3 text-[10px] text-[#fff8e1] bg-[#4a148c] hover:bg-[#6a1b9a] border-2 border-[#ffd54f] shadow-[0_4px_0_#1a0536] cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.shrine} size={18} />
                <span>RUNAS DO PÂNTANO</span>
              </span>
              <span className="text-[9px] text-[#ffd54f] tabular-nums">
                {activeRunesList.length}/2
              </span>
            </button>
          )}

          {/* Real Online Co-op Room Box */}
          <div className="bg-[#09140ef5] border-2 border-[#00e5ff] p-2.5 flex flex-col gap-1.5 shadow-[4px_4px_0_#000]">
            <div className="flex justify-between items-center text-[9px] text-[#84ffff]">
              <span className="flex items-center gap-1.5">
                <PixelIcon sprite={engine?.S?.pIdle?.[1]} size={14} />
                <span>CO-OP ONLINE</span>
              </span>
              <span className="text-[#ffd54f]">MULTIPLAYER</span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toLowerCase().slice(0, 10))}
                placeholder="sala (ex: sapo01)"
                aria-label="Código da Sala Co-op Online"
                className="flex-1 bg-[#040806] text-[#ffd54f] text-center border-2 border-[#00838f] px-2 py-1 text-[10px] uppercase focus:outline-none focus:border-[#00e5ff]"
              />
              <button
                disabled={!isUnlocked}
                onClick={() => {
                  onStartCoop(selectedChar, roomCode || 'sapo01');
                }}
                data-testid="title-btn-coop"
                className="btn-jelly pixel-text-dark px-3 py-1 text-[10px] text-[#041014] bg-[#00e5ff] hover:bg-[#84ffff] border-2 border-[#ffffff] shadow-[0_3px_0_#004d40] cursor-pointer disabled:opacity-50"
              >
                ENTRAR
              </button>
            </div>
          </div>

          {/* Shaman Upgrade Cauldron */}
          <button
            onClick={onOpenShaman}
            className="btn-jelly w-full py-2.5 px-3 text-[10px] text-[#e0f7fa] bg-[#006064] hover:bg-[#00838f] border-2 border-[#00e5ff] shadow-[0_4px_0_#002f36] cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <PixelIcon sprite={engine?.S?.shaman} size={18} />
              <span>CALDEIRÃO DO XAMÃ</span>
            </span>
            <span className="flex items-center gap-1 text-[#ffd54f] tabular-nums">
              <span>{larvae}</span>
              <PixelIcon sprite={engine?.S?.larva} size={14} />
            </span>
          </button>

          {/* Compendium / Bestiary & Mutations */}
          {onOpenCodex && (
            <button
              onClick={onOpenCodex}
              className="btn-jelly w-full py-2.5 px-3 text-[10px] text-[#e8f5e9] bg-[#1e462d] hover:bg-[#265939] border-2 border-[#69f0ae] shadow-[0_4px_0_#09140e] cursor-pointer flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <PixelIcon sprite={engine?.S?.bookIc} size={18} />
                <span>BESTIÁRIO & MUTAÇÕES</span>
              </span>
              <span className="text-[9px] text-[#69f0ae]">GUIA</span>
            </button>
          )}

          {/* Two-Column Compact Row for Achievements & Options */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenAchievements}
              className="btn-jelly py-2.5 px-2 text-[10px] text-[#fff8e1] bg-[#e65100] hover:bg-[#ef6c00] border-2 border-[#ffd54f] shadow-[0_4px_0_#662200] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PixelIcon sprite={engine?.S?.trp} size={15} />
              <span>METAS ({Object.keys(engine?.achData || {}).length}/15)</span>
            </button>

            <button
              onClick={onOpenOptions}
              className="btn-jelly py-2.5 px-2 text-[10px] text-[#e0f2f1] bg-[#1b3b2b] hover:bg-[#254f3a] border-2 border-[#80cbc4] shadow-[0_4px_0_#09140e] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <PixelIcon sprite={engine?.S?.gear} size={15} />
              <span>OPÇÕES</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Spacer for Clean Balanced Fullscreen Frame (Zero Control Text Clutter) */}
      <div className="h-1 shrink-0" />
    </div>
  );
};
