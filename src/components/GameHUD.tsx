import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine.ts';
import { CH, MUTATION_DETAILS, SWAMP_RUNES, RAR_INFO, IT } from '../game/constants.ts';
import { PixelIcon } from './TitleScreen.tsx';

interface GameHUDProps {
  engine: GameEngine | null;
  onGoCamp: () => void;
  onRestart: () => void;
  onOpenOptions: () => void;
  onOpenCodex?: () => void;
  onOpenRunes?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  onGoCamp,
  onRestart,
  onOpenOptions,
  onOpenCodex,
  onOpenRunes,
}) => {
  const [netRoom, setNetRoom] = useState<string>(engine?.netRoom || '');
  const [onlineCount, setOnlineCount] = useState<number>(
    engine ? Object.keys(engine.netPlayers).length : 0
  );
  const [showCoopPopover, setShowCoopPopover] = useState<boolean>(false);
  const [roomInput, setRoomInput] = useState<string>(engine?.netRoom || 'sapo01');
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
  const [mutations, setMutations] = useState<number[]>([]);
  const [activeRunes, setActiveRunes] = useState<string[]>([]);
  const [charIdx, setCharIdx] = useState<number>(0);
  const [stageState, setStageState] = useState<string>(engine?.ST || 'camp');

  // Active tooltip state for Mutations or Swamp Runes (supports mouse hover, keyboard focus, and mobile tap)
  const [inspectedMutId, setInspectedMutId] = useState<number | null>(null);
  const [inspectedRuneId, setInspectedRuneId] = useState<string | null>(null);

  const leftPadRef = useRef<HTMLDivElement | null>(null);
  const rightPadRef = useRef<HTMLDivElement | null>(null);
  const leftPointerId = useRef<number | null>(null);
  const rightPointerId = useRef<number | null>(null);

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

    const syncNet = () => {
      if (!engine) return;
      setNetRoom(engine.netRoom || '');
      setOnlineCount(Object.keys(engine.netPlayers).length);
    };

    const syncHudState = () => {
      if (!engine) return;
      checkTouchMode();
      syncNet();
      setInteractLabel(engine.getNearbyInteractable());
      setJumpReady((engine.me?.jumpCd || 0) <= 0.02);
      setMutations([...(engine.me?.its || [])]);
      setActiveRunes([...(engine.activeRunes || [])]);
      setCharIdx(engine.me?.ch ?? 0);
      setStageState(engine.ST);
    };

    syncHudState();
    window.addEventListener('resize', checkTouchMode);
    window.addEventListener('sapo-net-update', syncNet);
    window.addEventListener('sapo-progress-update', syncHudState);

    const interval = setInterval(syncHudState, 100);

    return () => {
      window.removeEventListener('resize', checkTouchMode);
      window.removeEventListener('sapo-net-update', syncNet);
      window.removeEventListener('sapo-progress-update', syncHudState);
      clearInterval(interval);
    };
  }, [engine]);

  const handleToggleCoopPopover = () => {
    if (engine?.netRoom) {
      setRoomInput(engine.netRoom);
    }
    setShowCoopPopover((v) => !v);
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

  // Right Analog Twin-Stick Handler (360° Aim & Whip/Spit)
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

  // Group collected mutations by ID with stack counts for a concise, clean bar
  const groupedMutations: Array<{ id: number; count: number }> = [];
  for (const mId of mutations) {
    const existing = groupedMutations.find((g) => g.id === mId);
    if (existing) existing.count++;
    else groupedMutations.push({ id: mId, count: 1 });
  }

  // If no mutations collected yet, show the current frog's affinity mutations so player can inspect tooltips anytime
  const affinityMutations = CH[charIdx]?.aff || [0, 1];
  const displayMutations: Array<{ id: number; count: number; isPreview?: boolean }> =
    groupedMutations.length > 0
      ? groupedMutations
      : affinityMutations.slice(0, 3).map((id) => ({ id, count: 0, isPreview: true }));

  const activeMutDetail = inspectedMutId !== null ? MUTATION_DETAILS[inspectedMutId] : null;
  const activeRuneDetail =
    inspectedRuneId !== null ? SWAMP_RUNES.find((r) => r.id === inspectedRuneId) || null : null;

  return (
    <>
      {/* Streamlined Top-Right Godot Pixel-Art Action Bar (Zero Unnecessary Buttons, Jelly Physics) */}
      <div className="fixed top-1.5 right-1.5 sm:top-2 sm:right-2.5 z-30 flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto select-none max-w-[76vw] font-pixel">
        {onOpenRunes && (
          <button
            onClick={onOpenRunes}
            data-testid="hud-btn-runes"
            className="btn-jelly px-2 py-1 bg-[#280e4a] hover:bg-[#3b156b] border-2 border-[#ffd54f] text-[9px] sm:text-[10px] font-black text-[#ffd54f] shadow-[0_3px_0_#0f041d] cursor-pointer flex items-center gap-1"
            title="Equipar Runas do Pântano (Modificadores Globais da Exploração)"
          >
            <PixelIcon sprite={engine?.S?.shrine} size={13} />
            <span>RUNAS ({activeRunes.length}/2)</span>
          </button>
        )}

        <button
          onClick={handleToggleCoopPopover}
          data-testid="hud-btn-coop"
          className={`btn-jelly px-2 py-1 border-2 text-[9px] sm:text-[10px] font-black shadow-[0_3px_0_#040805] cursor-pointer flex items-center gap-1 ${
            netRoom
              ? 'bg-[#004d40] border-[#00e5ff] text-[#84ffff]'
              : 'bg-[#0c1a12ee] hover:bg-[#162e20] border-[#66bb6a] text-[#e8f5e9]'
          }`}
          title="Sala Co-op Online em Tempo Real"
        >
          <PixelIcon sprite={engine?.S?.pIdle?.[1]} size={13} />
          <span className="hidden xs:inline">
            {netRoom ? `SALA: ${netRoom.toUpperCase()} (${onlineCount + 1}P)` : 'CO-OP'}
          </span>
        </button>

        {stageState === 'play' && (
          <button
            onClick={onGoCamp}
            data-testid="hud-btn-camp"
            className="btn-jelly px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] text-[9px] sm:text-[10px] font-black text-[#ffd54f] shadow-[0_3px_0_#040805] cursor-pointer flex items-center gap-1"
            title="Voltar ao Acampamento da Fogueira"
          >
            <PixelIcon sprite={engine?.S?.campfire?.[0]} size={13} />
            <span className="hidden sm:inline">ACAMP.</span>
          </button>
        )}

        {onOpenCodex && (
          <button
            onClick={onOpenCodex}
            data-testid="hud-btn-codex"
            className="btn-jelly px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#ab47bc] text-[9px] sm:text-[10px] font-black text-[#e1bee7] shadow-[0_3px_0_#040805] cursor-pointer flex items-center gap-1"
            title="Bestiário, Mutações & Runas"
          >
            <PixelIcon sprite={engine?.S?.bookIc} size={13} />
            <span className="hidden md:inline">GUIA</span>
          </button>
        )}

        <button
          onClick={() => {
            if (engine) {
              engine.toggleFullscreen();
            } else if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen?.().catch(() => {});
            } else {
              document.exitFullscreen?.().catch(() => {});
            }
          }}
          data-testid="hud-btn-fullscreen"
          className="btn-jelly px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] text-[9px] sm:text-[10px] text-[#e8f5e9] shadow-[0_3px_0_#040805] cursor-pointer flex items-center gap-1"
          title="Alternar Tela Cheia (F11)"
          aria-label="Alternar Tela Cheia"
        >
          <PixelIcon sprite={engine?.S?.fs} size={12} />
        </button>

        <button
          onClick={onOpenOptions}
          data-testid="hud-btn-options"
          className="btn-jelly px-2 py-1 bg-[#0c1a12ee] hover:bg-[#162e20] border-2 border-[#66bb6a] text-[9px] sm:text-[10px] text-[#e8f5e9] shadow-[0_3px_0_#040805] cursor-pointer flex items-center gap-1"
          title="Menu de Pausa, Opções, Tela Cheia e Controles (ESC)"
          aria-label="Opções e Pausa"
        >
          <PixelIcon sprite={engine?.S?.gear} size={12} />
          <span className="hidden sm:inline">MENU</span>
        </button>
      </div>

      {/* Concise Interactive Mutation & Swamp Rune Icon Bar (Top-Left below economy box — Zero text clutter!) */}
      <div
        className={`fixed z-30 pointer-events-auto select-none font-pixel left-2 ${
          stageState === 'camp' ? 'top-13' : 'top-21'
        } max-w-[65vw]`}
        data-testid="hud-mutation-bar"
      >
        {/* Pure Pixel Icon Strip of Equipped Runes & Active/Affinity Mutations */}
        <div className="flex flex-wrap items-center gap-1 bg-[#050d08dd] border-2 border-[#2e573c] px-1.5 py-1 shadow-[3px_3px_0_#000]">
          {/* Equipped Swamp Runes */}
          {activeRunes.map((rId) => {
            const rDef = SWAMP_RUNES.find((r) => r.id === rId);
            if (!rDef) return null;
            const isSel = inspectedRuneId === rId;
            return (
              <button
                key={rId}
                type="button"
                data-testid={`hud-rune-slot-${rId}`}
                onMouseEnter={() => {
                  setInspectedMutId(null);
                  setInspectedRuneId(rId);
                }}
                onMouseLeave={() => setInspectedRuneId((cur) => (cur === rId ? null : cur))}
                onFocus={() => {
                  setInspectedMutId(null);
                  setInspectedRuneId(rId);
                }}
                onClick={() => {
                  setInspectedMutId(null);
                  setInspectedRuneId(rId);
                }}
                aria-label={`Runa Equipada: ${rDef.nm}`}
                className={`btn-jelly relative w-7 h-7 border-2 flex items-center justify-center cursor-pointer ${
                  isSel ? 'bg-[#311b47] border-[#ffd54f]' : 'bg-[#1a0d2a] border-[#ea80fc]'
                }`}
              >
                <PixelIcon sprite={engine?.S?.items?.[rDef.ic]} size={16} />
                <span className="absolute -top-1 -right-1 text-[7px] bg-[#4a148c] text-[#ffd54f] px-0.5 border border-[#ffd54f]">
                  R
                </span>
              </button>
            );
          })}

          {activeRunes.length > 0 && <span className="text-[#2e573c] text-[10px]">|</span>}

          {displayMutations.map((m) => {
            const rar = RAR_INFO[IT[m.id]?.[2] || 0] || RAR_INFO[0];
            const det = MUTATION_DETAILS[m.id];
            const isSel = inspectedMutId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`hud-mutation-slot-${m.id}`}
                onMouseEnter={() => {
                  setInspectedRuneId(null);
                  setInspectedMutId(m.id);
                }}
                onMouseLeave={() => setInspectedMutId((cur) => (cur === m.id ? null : cur))}
                onFocus={() => {
                  setInspectedRuneId(null);
                  setInspectedMutId(m.id);
                }}
                onClick={() => {
                  setInspectedRuneId(null);
                  setInspectedMutId(m.id);
                }}
                aria-label={`Mutação ${det?.name || IT[m.id]?.[0] || m.id}`}
                style={{ borderColor: isSel ? '#ffd54f' : rar.col }}
                className={`btn-jelly relative w-7 h-7 border-2 flex items-center justify-center cursor-pointer ${
                  m.isPreview ? 'bg-[#08140d] opacity-80 hover:opacity-100' : 'bg-[#102418]'
                }`}
              >
                <PixelIcon sprite={engine?.S?.items?.[m.id]} size={16} />
                {m.count > 1 && (
                  <span className="absolute -bottom-1 -right-1 text-[8px] font-black bg-[#040a06] text-[#ffd54f] px-0.5 border border-[#ffd54f] tabular-nums">
                    x{m.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Rich Interactive Tooltip Card on Hover / Focus / Tap */}
        {(activeMutDetail || activeRuneDetail) && (
          <div
            role="tooltip"
            data-testid="hud-mutation-tooltip"
            className="mt-1.5 w-72 sm:w-80 bg-[#050d08f8] border-2 border-[#ffd54f] p-3 shadow-[5px_5px_0_#000] text-left space-y-1.5"
          >
            {activeMutDetail && (
              <>
                <div className="flex items-center justify-between gap-2 border-b-2 border-[#1e3a27] pb-1">
                  <div className="flex items-center gap-1.5">
                    <PixelIcon sprite={engine?.S?.items?.[activeMutDetail.id]} size={18} />
                    <span className="font-black text-xs text-[#ffd54f] font-pixel-title">
                      {activeMutDetail.name}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 border border-black/50"
                    style={{ color: activeMutDetail.rarityColor }}
                  >
                    {activeMutDetail.rarityName}
                  </span>
                </div>

                <div className="text-[10px] text-[#b0bec5]">{activeMutDetail.tagline}</div>

                {/* Bonuses */}
                <div className="bg-[#091c12] border border-[#2e7d32] p-1.5 space-y-0.5">
                  <div className="text-[9px] font-black text-[#69f0ae]">BÔNUS DA MUTAÇÃO:</div>
                  {activeMutDetail.bonuses.map((b, i) => (
                    <div key={i} className="text-[10px] text-[#e8f5e9] leading-tight">
                      + {b}
                    </div>
                  ))}
                </div>

                {/* Penalties / Trade-offs */}
                <div className="bg-[#1f0c0e] border border-[#c62828] p-1.5 space-y-0.5">
                  <div className="text-[9px] font-black text-[#ff8a80]">
                    PENALIDADE / RESTRIÇÃO:
                  </div>
                  {activeMutDetail.penalties.map((p, i) => (
                    <div key={i} className="text-[10px] text-[#ffcdd2] leading-tight">
                      - {p}
                    </div>
                  ))}
                </div>

                {/* Affinity & Synergies */}
                <div className="flex flex-col gap-0.5 pt-0.5 text-[9px]">
                  <span className="text-[#84ffff]">
                    <strong className="text-[#00e5ff]">AFINIDADE:</strong>{' '}
                    {activeMutDetail.affinityText}
                  </span>
                  {activeMutDetail.synergyNames.length > 0 && (
                    <span className="text-[#ffe082]">
                      <strong className="text-[#ffd54f]">SINERGIAS:</strong>{' '}
                      {activeMutDetail.synergyNames.join(' · ')}
                    </span>
                  )}
                </div>
              </>
            )}

            {activeRuneDetail && !activeMutDetail && (
              <>
                <div className="flex items-center justify-between gap-2 border-b-2 border-[#311b47] pb-1">
                  <div className="flex items-center gap-1.5">
                    <PixelIcon sprite={engine?.S?.items?.[activeRuneDetail.ic]} size={18} />
                    <span className="font-black text-xs text-[#ffd54f] font-pixel-title">
                      {activeRuneDetail.nm.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[9px] font-black text-[#ea80fc]">RUNA DO PÂNTANO</span>
                </div>
                <div className="text-[10px] text-[#e1bee7]">{activeRuneDetail.ds}</div>
                <div className="bg-[#091c12] border border-[#2e7d32] p-1.5 text-[10px] text-[#69f0ae]">
                  <strong>+ BÔNUS GLOBAL:</strong> {activeRuneDetail.boon}
                </div>
                <div className="bg-[#1f0c0e] border border-[#c62828] p-1.5 text-[10px] text-[#ff8a80]">
                  <strong>- PENALIDADE:</strong> {activeRuneDetail.penalty}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline Real Online Multiplayer Co-op Room Popover */}
      {showCoopPopover && engine && (
        <div
          className="fixed top-11 right-2 z-40 w-72 bg-[#071418f5] border-2 border-[#00e5ff] p-3 shadow-[6px_6px_0_#000] font-pixel text-xs select-none pointer-events-auto"
          data-testid="hud-coop-popover"
        >
          <div className="flex items-center justify-between border-b border-[#006064] pb-1.5 mb-2">
            <span className="font-black text-[#00e5ff] text-[10px]">
              CO-OP ONLINE REAL (SEM BOT)
            </span>
            <button
              onClick={() => setShowCoopPopover(false)}
              className="btn-jelly text-[10px] font-bold text-[#84ffff] hover:text-white cursor-pointer"
            >
              [X]
            </button>
          </div>
          <div className="flex gap-1.5 mb-2">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toLowerCase().slice(0, 12))}
              placeholder="código (ex: sapo01)"
              className="flex-1 bg-[#040a0c] border-2 border-[#00838f] text-[#ffd54f] font-bold px-2 py-1 text-xs uppercase focus:outline-none focus:border-[#00e5ff]"
            />
            <button
              onClick={() => {
                engine.joinMultiplayerRoom(roomInput || 'sapo01');
                setNetRoom(engine.netRoom);
              }}
              className="btn-jelly px-2.5 py-1 bg-[#00acc1] hover:bg-[#00e5ff] text-[#041014] font-black text-[10px] border border-white cursor-pointer"
            >
              CONECTAR
            </button>
          </div>
          {netRoom ? (
            <div className="space-y-1.5 text-[10px] text-[#b2ebf2]">
              <div className="flex items-center justify-between bg-[#040d10] px-2 py-1 border border-[#006064]">
                <span>
                  SALA ATIVA: <strong className="text-[#ffd54f]">{netRoom.toUpperCase()}</strong>
                </span>
                <span>{onlineCount + 1} JOGADOR(ES)</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(netRoom)}`;
                    navigator.clipboard?.writeText(url).catch(() => {});
                    engine.FT.push({
                      x: engine.me.x,
                      y: engine.me.y - 24,
                      s: 'LINK DA SALA COPIADO!',
                      c: '#00e5ff',
                      l: 1.4,
                    });
                  }}
                  className="btn-jelly flex-1 py-1 bg-[#0d262c] hover:bg-[#143942] border border-[#00e5ff] text-[#84ffff] font-bold cursor-pointer"
                >
                  COPIAR LINK
                </button>
                <button
                  onClick={() => {
                    engine.leaveMultiplayerRoom();
                    setNetRoom('');
                  }}
                  className="btn-jelly px-2.5 py-1 bg-[#4a1218] hover:bg-[#6d1b24] border border-[#ff5252] text-[#ffcdd2] font-bold cursor-pointer"
                >
                  SAIR
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-[#80cbc4]">
              Digite o mesmo código que seu amigo para explorarem a masmorra juntos!
            </div>
          )}
        </div>
      )}

      {/* Responsive Pixel-Art Mobile Twin-Stick & Action Controls */}
      {showTouch && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 pointer-events-none select-none flex items-end justify-between p-2.5 sm:p-5 font-pixel"
          data-testid="mobile-controls"
        >
          {/* LEFT PIXEL-ART ANALOG D-PAD (MOVEMENT) */}
          <div className="flex flex-col items-center gap-1 pointer-events-auto">
            <span className="text-[7px] sm:text-[8px] font-black tracking-wider text-[#a5d6a7] bg-[#06100acc] px-1.5 py-0.5 border border-[#2e573c] font-pixel-title">
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
              <div className="absolute inset-2.5 pointer-events-none flex items-center justify-center">
                <div className="w-full h-5 bg-[#0d2418] border border-[#1e462d]" />
              </div>
              <div className="absolute inset-2.5 pointer-events-none flex items-center justify-center">
                <div className="h-full w-5 bg-[#0d2418] border border-[#1e462d]" />
              </div>

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

          {/* RIGHT PIXEL-ART ACTION CLUSTER + 360° AIM & WHIP/SPIT STICK */}
          <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
            <div className="flex flex-col gap-2">
              {interactLabel && (
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    if (engine) engine.interactE();
                  }}
                  data-testid="mobile-btn-interact"
                  aria-label="Interagir ou Usar Objeto"
                  className="btn-jelly relative w-14 h-12 sm:w-16 sm:h-13 border-2 bg-[#2e7d32] border-[#ffd54f] text-[#fff9c4] font-black text-[10px] shadow-[3px_3px_0_#000] flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none"
                >
                  <PixelIcon sprite={engine?.S?.handIc} size={15} />
                  <span className="text-[7px] font-pixel-title">USAR!</span>
                  <span className="text-[8px] text-[#ffe082] truncate max-w-[52px]">
                    {interactLabel}
                  </span>
                </button>
              )}

              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (engine) engine.triggerJump();
                }}
                data-testid="mobile-btn-jump"
                aria-label="Pulo Esquiva Eixo Z"
                className={`btn-jelly relative w-14 h-12 sm:w-16 sm:h-14 border-2 font-black text-[10px] shadow-[3px_3px_0_#000] flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none ${
                  jumpReady
                    ? 'bg-[#0277bd] hover:bg-[#0288d1] border-[#81d4fa] text-white'
                    : 'bg-[#0b2230] border-[#264b62] text-[#78909c]'
                }`}
              >
                <PixelIcon sprite={engine?.S?.bootIc} size={15} />
                <span className="text-[7px] font-pixel-title">PULO</span>
                <span className="text-[8px] text-[#b3e5fc]">
                  {jumpReady ? 'PRONTO' : 'RECARG'}
                </span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[7px] sm:text-[8px] font-black tracking-wider text-[#ff8a80] bg-[#1a080bcc] px-1.5 py-0.5 border border-[#b71c1c] font-pixel-title">
                MIRAR / ATACAR
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
                <div className="absolute inset-3.5 border border-dashed border-[#ff525255] pointer-events-none" />
                <div className="absolute w-full h-[2px] bg-[#ff525233] pointer-events-none" />
                <div className="absolute h-full w-[2px] bg-[#ff525233] pointer-events-none" />

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
