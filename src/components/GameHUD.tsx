import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine.ts';
import { PixelIcon } from './TitleScreen.tsx';

interface GameHUDProps {
  engine: GameEngine | null;
  onGoCamp: () => void;
  onRestart: () => void;
  onOpenOptions: () => void;
  onOpenCodex?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  onGoCamp,
  onRestart,
  onOpenOptions,
  onOpenCodex,
}) => {
  const [partnerOn, setPartnerOn] = useState<boolean>(engine?.botPartner.active || false);
  const [showTouch, setShowTouch] = useState<boolean>(false);
  const [moveVec, setMoveVec] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const [aimVec, setAimVec] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const [interactLabel, setInteractLabel] = useState<string | null>(null);
  const [jumpReady, setJumpReady] = useState<boolean>(true);

  const leftPadRef = useRef<HTMLDivElement | null>(null);
  const rightPadRef = useRef<HTMLDivElement | null>(null);
  const leftPointerId = useRef<number | null>(null);
  const rightPointerId = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Detect mobile viewport or CFG.touch preference and poll lightweight HUD indicators
  useEffect(() => {
    const checkTouchMode = () => {
      if (!engine) return;
      const mode = engine.CFG.touch || 'auto';
      if (mode === 'on') {
        setShowTouch(true);
      } else if (mode === 'off') {
        setShowTouch(false);
      } else {
        const isSmallOrTouch =
          window.innerWidth < 860 ||
          window.matchMedia?.('(pointer: coarse)').matches ||
          'ontouchstart' in window;
        setShowTouch(isSmallOrTouch);
      }
    };

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    checkTouchMode();
    handleFsChange();
    window.addEventListener('resize', checkTouchMode);
    document.addEventListener('fullscreenchange', handleFsChange);

    const interval = setInterval(() => {
      if (!engine) return;
      checkTouchMode();
      setPartnerOn(engine.botPartner.active);
      setInteractLabel(engine.getNearbyInteractable());
      setJumpReady((engine.me?.jumpCd || 0) <= 0.02);
    }, 100);

    return () => {
      window.removeEventListener('resize', checkTouchMode);
      document.removeEventListener('fullscreenchange', handleFsChange);
      clearInterval(interval);
    };
  }, [engine]);

  const handleTogglePartner = () => {
    if (!engine) return;
    engine.toggleBotPartner();
    setPartnerOn(engine.botPartner.active);
  };

  const handleToggleTouchControls = () => {
    if (!engine) return;
    const next = showTouch ? 'off' : 'on';
    engine.CFG.touch = next;
    engine.saveProgress();
    setShowTouch(next === 'on');
    engine.snd(420, 0.08, 'triangle', 0.06, 120);
  };

  const handleToggleFullscreen = () => {
    if (engine) {
      engine.toggleFullscreen();
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Left Analog / D-Pad Stick Handler (Movement)
  const updateLeftStick = (clientX: number, clientY: number) => {
    const el = leftPadRef.current;
    if (!el || !engine) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);
    const nx = dist > 4 ? (dx / dist) * (clampedDist / maxR) : 0;
    const ny = dist > 4 ? (dy / dist) * (clampedDist / maxR) : 0;

    engine.touchState.lx = nx;
    engine.touchState.ly = ny;
    engine.touchState.lActive = true;
    engine.mouse.active = false;
    if (!engine.touchState.rActive && dist > 6 && engine.me) {
      const len = Math.hypot(nx, ny) || 1;
      engine.me.ax = nx / len;
      engine.me.ay = ny / len;
      engine.me.ang = Math.atan2(engine.me.ay, engine.me.ax);
      engine.mouse.x = Math.max(14, Math.min(466, engine.me.x + engine.me.ax * 58));
      engine.mouse.y = Math.max(14, Math.min(306, engine.me.y - 6 - engine.me.z + engine.me.ay * 58));
    }
    setMoveVec({ x: nx, y: ny, active: true });
  };

  const resetLeftStick = () => {
    leftPointerId.current = null;
    if (engine) {
      engine.touchState.lx = 0;
      engine.touchState.ly = 0;
      engine.touchState.lActive = false;
    }
    setMoveVec({ x: 0, y: 0, active: false });
  };

  // Right Analog Twin-Stick Handler (360° Aim & Auto-Spit)
  const updateRightStick = (clientX: number, clientY: number) => {
    const el = rightPadRef.current;
    if (!el || !engine) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxR);

    let nx = dist > 4 ? (dx / dist) * (clampedDist / maxR) : 0;
    let ny = dist > 4 ? (dy / dist) * (clampedDist / maxR) : 0;

    // If tapped near center, aim & fire in current facing direction
    if (dist <= 4 && engine.me) {
      nx = Math.cos(engine.me.ang) * 0.65;
      ny = Math.sin(engine.me.ang) * 0.65;
    }

    engine.touchState.rx = nx;
    engine.touchState.ry = ny;
    engine.touchState.rActive = true;
    engine.mouse.active = false;
    if (engine.me) {
      const sl = Math.hypot(nx, ny) || 1;
      engine.me.ax = nx / sl;
      engine.me.ay = ny / sl;
      engine.me.ang = Math.atan2(engine.me.ay, engine.me.ax);
      const aimDist = 36 + Math.min(1, sl) * 68;
      engine.mouse.x = Math.max(14, Math.min(466, engine.me.x + engine.me.ax * aimDist));
      engine.mouse.y = Math.max(
        14,
        Math.min(306, engine.me.y - 6 - engine.me.z + engine.me.ay * aimDist)
      );
    }
    setAimVec({ x: nx, y: ny, active: true });
  };

  const resetRightStick = () => {
    rightPointerId.current = null;
    if (engine) {
      engine.touchState.rx = 0;
      engine.touchState.ry = 0;
      engine.touchState.rActive = false;
    }
    setAimVec({ x: 0, y: 0, active: false });
  };

  return (
    <>
      {/* Top Right Pixel-Art Arcade Action Bar (Responsive & With Fullscreen Toggle) */}
      <div className="fixed top-1.5 right-1.5 sm:top-2 sm:right-2.5 z-30 flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 pointer-events-auto select-none max-w-[72vw]">
        <button
          onClick={handleTogglePartner}
          className={`px-1.5 sm:px-2 py-1 border-2 font-mono text-[9px] sm:text-[11px] font-black shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1 ${
            partnerOn
              ? 'bg-[#004d40] border-[#00e5ff] text-[#84ffff]'
              : 'bg-[#0c1a12ee] hover:bg-[#162e20] border-[#66bb6a] text-[#e8f5e9]'
          }`}
          title="Alternar Parceiro Co-op (TAB)"
        >
          <PixelIcon sprite={engine?.S?.pIdle?.[1]} size={13} />
          <span className="hidden xs:inline">{partnerOn ? 'CO-OP' : '+CO-OP'}</span>
        </button>

        <button
          onClick={onGoCamp}
          className="px-1.5 sm:px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] font-mono text-[9px] sm:text-[11px] font-black text-[#ffd54f] shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
          title="Voltar ao Acampamento da Fogueira"
        >
          <PixelIcon sprite={engine?.S?.campfire?.[0]} size={13} />
          <span className="hidden sm:inline">ACAMP.</span>
        </button>

        {onOpenCodex && (
          <button
            onClick={onOpenCodex}
            className="px-1.5 sm:px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#ab47bc] font-mono text-[9px] sm:text-[11px] font-black text-[#e1bee7] shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
            title="Bestiário & Habilidades"
          >
            <PixelIcon sprite={engine?.S?.bookIc} size={13} />
            <span className="hidden md:inline">GUIA</span>
          </button>
        )}

        <button
          onClick={handleToggleTouchControls}
          className={`px-1.5 sm:px-2 py-1 border-2 font-mono text-[9px] sm:text-[11px] font-black shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1 ${
            showTouch
              ? 'bg-[#004d40] border-[#00e5ff] text-[#84ffff]'
              : 'bg-[#0c1a12ee] hover:bg-[#162e20] border-[#66bb6a] text-[#a5d6a7]'
          }`}
          title="Alternar Controles Touch Mobile na Tela"
          aria-label="Alternar Controles Mobile"
        >
          <PixelIcon sprite={engine?.S?.joyIc} size={13} />
          <span className="hidden md:inline">TOUCH</span>
        </button>

        {/* Fullscreen Button Directly In-Game for Mobile & Desktop */}
        <button
          onClick={handleToggleFullscreen}
          data-testid="hud-btn-fullscreen"
          className={`px-1.5 sm:px-2 py-1 border-2 font-mono text-[9px] sm:text-[11px] font-black shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1 ${
            isFullscreen
              ? 'bg-[#004d40] border-[#ffd54f] text-[#ffd54f]'
              : 'bg-[#0c1a12ee] hover:bg-[#162e20] border-[#ffd54f] text-[#fff59d]'
          }`}
          title="Alternar Tela Cheia (Fullscreen)"
          aria-label="Tela Cheia"
        >
          <PixelIcon sprite={engine?.S?.fs} size={13} />
          <span className="hidden xs:inline">{isFullscreen ? 'SAIR' : 'TELA'}</span>
        </button>

        <button
          onClick={onRestart}
          className="px-1.5 sm:px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] font-mono text-[9px] sm:text-[11px] font-black text-[#e8f5e9] shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
          title="Nova Run (R)"
          aria-label="Reiniciar Partida"
        >
          <PixelIcon sprite={engine?.S?.rst} size={12} />
          <span className="hidden sm:inline">R</span>
        </button>

        <button
          onClick={onOpenOptions}
          className="px-1.5 sm:px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] font-mono text-[9px] sm:text-[11px] font-black text-[#e8f5e9] shadow-[0_3px_0_#040805] active:translate-y-0.5 cursor-pointer transition-all flex items-center gap-1"
          title="Opções / Pausa (ESC)"
          aria-label="Opções e Pausa"
        >
          <PixelIcon sprite={engine?.S?.gear} size={12} />
          <span className="hidden sm:inline">ESC</span>
        </button>
      </div>

      {/* Responsive Pixel-Art Mobile Twin-Stick & Action Controls */}
      {showTouch && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 pointer-events-none select-none flex items-end justify-between p-2.5 sm:p-5"
          data-testid="mobile-controls"
        >
          {/* LEFT PIXEL-ART ANALOG D-PAD (MOVEMENT - CLEAN KNOB WITHOUT FROG ICON) */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <span
              className="text-[7px] sm:text-[8px] font-black tracking-wider text-[#a5d6a7] bg-[#06100acc] px-1.5 py-0.5 border border-[#2e573c]"
              style={{ fontFamily: '"Press Start 2P", monospace' }}
            >
              ANDAR
            </span>
            <div
              ref={leftPadRef}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                leftPointerId.current = e.pointerId;
                updateLeftStick(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (leftPointerId.current === e.pointerId) {
                  updateLeftStick(e.clientX, e.clientY);
                }
              }}
              onPointerUp={(e) => {
                if (leftPointerId.current === e.pointerId) {
                  resetLeftStick();
                }
              }}
              onPointerCancel={(e) => {
                if (leftPointerId.current === e.pointerId) {
                  resetLeftStick();
                }
              }}
              data-testid="mobile-joystick-left"
              className={`relative w-24 h-24 sm:w-28 sm:h-28 bg-[#07140dd8] border-2 transition-colors shadow-[4px_4px_0_#000] touch-none flex items-center justify-center cursor-pointer ${
                moveVec.active ? 'border-[#69f0ae]' : 'border-[#4caf50]'
              }`}
            >
              {/* Pixel-Art Cross D-Pad Guides */}
              <div className="absolute inset-2.5 pointer-events-none flex items-center justify-center">
                <div className="w-full h-5 bg-[#0d2418] border border-[#1e462d]" />
              </div>
              <div className="absolute inset-2.5 pointer-events-none flex items-center justify-center">
                <div className="h-full w-5 bg-[#0d2418] border border-[#1e462d]" />
              </div>

              {/* Directional Pixel Highlights */}
              <div
                className={`absolute top-1.5 w-2.5 h-1.5 border ${
                  moveVec.y < -0.35
                    ? 'bg-[#69f0ae] border-white'
                    : 'bg-[#1b3b26] border-[#2e573c]'
                }`}
              />
              <div
                className={`absolute bottom-1.5 w-2.5 h-1.5 border ${
                  moveVec.y > 0.35
                    ? 'bg-[#69f0ae] border-white'
                    : 'bg-[#1b3b26] border-[#2e573c]'
                }`}
              />
              <div
                className={`absolute left-1.5 w-1.5 h-2.5 border ${
                  moveVec.x < -0.35
                    ? 'bg-[#69f0ae] border-white'
                    : 'bg-[#1b3b26] border-[#2e573c]'
                }`}
              />
              <div
                className={`absolute right-1.5 w-1.5 h-2.5 border ${
                  moveVec.x > 0.35
                    ? 'bg-[#69f0ae] border-white'
                    : 'bg-[#1b3b26] border-[#2e573c]'
                }`}
              />

              {/* Clean Geometric Pixel Thumbstick Knob (No Frog Sprite!) */}
              <div
                style={{
                  transform: `translate(${Math.round(moveVec.x * 28)}px, ${Math.round(
                    moveVec.y * 28
                  )}px)`,
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 border-2 flex items-center justify-center pointer-events-none transition-transform duration-75 ${
                  moveVec.active
                    ? 'bg-[#69f0ae] border-white shadow-[0_2px_0_#1b5e20]'
                    : 'bg-[#1e462d] border-[#81c784] shadow-[0_3px_0_#07120b]'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 border-2 ${
                    moveVec.active
                      ? 'bg-[#1b5e20] border-[#e8f5e9]'
                      : 'bg-[#0d2418] border-[#66bb6a]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* RIGHT PIXEL-ART ACTION CLUSTER + 360° AIM & MOUTH ATTACK STICK */}
          <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
            {/* Essential Action Buttons Column (PULO-Z & Contextual USAR [E] Only) */}
            <div className="flex flex-col gap-2">
              {/* Contextual USAR [E] Button - Prominent when near an interactable */}
              {interactLabel && (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (engine) engine.interactE();
                  }}
                  data-testid="mobile-btn-interact"
                  aria-label="Interagir ou Usar Objeto"
                  className="relative w-14 h-12 sm:w-16 sm:h-13 border-2 bg-[#2e7d32] border-[#ffd54f] text-[#fff9c4] font-mono font-black text-[10px] shadow-[3px_3px_0_#000] active:translate-y-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none animate-pulse"
                >
                  <PixelIcon sprite={engine?.S?.handIc} size={15} />
                  <span style={{ fontFamily: '"Press Start 2P", monospace' }} className="text-[7px]">
                    USAR!
                  </span>
                  <span className="text-[8px] text-[#ffe082] truncate max-w-[52px]">
                    {interactLabel}
                  </span>
                </button>
              )}

              {/* PULO-Z Dodge Jump Button */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (engine) engine.triggerJump();
                }}
                data-testid="mobile-btn-jump"
                aria-label="Pulo Esquiva Eixo Z"
                className={`relative w-14 h-12 sm:w-16 sm:h-14 border-2 font-mono font-black text-[10px] shadow-[3px_3px_0_#000] active:translate-y-0.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none transition-colors ${
                  jumpReady
                    ? 'bg-[#0277bd] hover:bg-[#0288d1] border-[#81d4fa] text-white'
                    : 'bg-[#0b2230] border-[#264b62] text-[#78909c]'
                }`}
              >
                <PixelIcon sprite={engine?.S?.bootIc} size={15} />
                <span style={{ fontFamily: '"Press Start 2P", monospace' }} className="text-[7px]">
                  PULO
                </span>
                <span className="text-[8px] text-[#b3e5fc]">
                  {jumpReady ? 'PRONTO' : 'RECARG'}
                </span>
              </button>
            </div>

            {/* Right 360° Aim & Mouth Spit Stick */}
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-[7px] sm:text-[8px] font-black tracking-wider text-[#ff8a80] bg-[#1a080bcc] px-1.5 py-0.5 border border-[#b71c1c]"
                style={{ fontFamily: '"Press Start 2P", monospace' }}
              >
                MIRAR / CUSPIR
              </span>
              <div
                ref={rightPadRef}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  rightPointerId.current = e.pointerId;
                  updateRightStick(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (rightPointerId.current === e.pointerId) {
                    updateRightStick(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={(e) => {
                  if (rightPointerId.current === e.pointerId) {
                    resetRightStick();
                  }
                }}
                onPointerCancel={(e) => {
                  if (rightPointerId.current === e.pointerId) {
                    resetRightStick();
                  }
                }}
                data-testid="mobile-joystick-right"
                className={`relative w-24 h-24 sm:w-28 sm:h-28 bg-[#16080bd8] border-2 transition-colors shadow-[4px_4px_0_#000] touch-none flex items-center justify-center cursor-pointer ${
                  aimVec.active ? 'border-[#ffd54f]' : 'border-[#ff5252]'
                }`}
              >
                {/* Pixel Reticle Grid Inside Right Pad */}
                <div className="absolute inset-3.5 border border-dashed border-[#ff525255] pointer-events-none" />
                <div className="absolute w-full h-[2px] bg-[#ff525233] pointer-events-none" />
                <div className="absolute h-full w-[2px] bg-[#ff525233] pointer-events-none" />

                {/* Movable Pixel Aim & Spit Knob */}
                <div
                  style={{
                    transform: `translate(${Math.round(aimVec.x * 28)}px, ${Math.round(
                      aimVec.y * 28
                    )}px)`,
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 border-2 flex items-center justify-center pointer-events-none transition-transform duration-75 ${
                    aimVec.active
                      ? 'bg-[#ffd54f] border-white shadow-[0_2px_0_#b71c1c]'
                      : 'bg-[#4a1218] border-[#ff8a80] shadow-[0_3px_0_#1a0508]'
                  }`}
                >
                  <PixelIcon sprite={engine?.S?.cross} size={16} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
