import React, { useState, useEffect } from 'react';
import {
  ACH_LIST,
  SHAMAN_UPG,
  ENEMY_INFO,
  WP,
  IT,
  RAR_INFO,
  DEFAULT_BINDS,
  KeyBindings,
  formatKeyLabel,
  AchievementDef,
  ShamanUpgradeDef,
  PACT_LIST,
  SWAMP_RUNES,
  SwampRuneDef,
  MUTATION_DETAILS,
  CH,
} from '../game/constants.ts';
import { GameEngine, ToastItem } from '../game/engine.ts';
import { PixelIcon } from './TitleScreen.tsx';

interface ModalsProps {
  engine: GameEngine | null;
  activeModal: 'shaman' | 'achievements' | 'options' | 'codex' | 'runes' | null;
  onClose: () => void;
  toast: ToastItem | null;
  onBackToTitle?: () => void;
  onGoCamp?: () => void;
  onRestart?: () => void;
  onOpenCodex?: () => void;
  onOpenRunes?: () => void;
}

const KEYBIND_ROWS: Array<{
  key: keyof KeyBindings;
  label: string;
  desc: string;
  highlight?: boolean;
}> = [
  {
    key: 'shoot',
    label: 'Habilidade Bucal (Cuspir / Língua)',
    desc: 'Dispara a habilidade orgânica da boca',
    highlight: true,
  },
  {
    key: 'jump',
    label: 'Habilidade Pulo-Z (Esquiva Aérea)',
    desc: 'Salta sobre projéteis e armadilhas',
    highlight: true,
  },
  {
    key: 'interact',
    label: 'Interagir / Usar Altar & Baú',
    desc: 'Abre baús, fala com Xamã, Runas e Mercador',
    highlight: true,
  },
  {
    key: 'restart',
    label: 'Reiniciar Run Rápida',
    desc: 'Inicia uma nova tentativa na masmorra',
  },
  {
    key: 'up',
    label: 'Mover para Cima',
    desc: 'Deslocamento vertical norte',
  },
  {
    key: 'down',
    label: 'Mover para Baixo',
    desc: 'Deslocamento vertical sul',
  },
  {
    key: 'left',
    label: 'Mover para Esquerda',
    desc: 'Deslocamento horizontal oeste',
  },
  {
    key: 'right',
    label: 'Mover para Direita',
    desc: 'Deslocamento horizontal leste',
  },
];

export const Modals: React.FC<ModalsProps> = ({
  engine,
  activeModal,
  onClose,
  toast,
  onBackToTitle,
  onGoCamp,
  onRestart,
  onOpenCodex,
  onOpenRunes,
}) => {
  const [, setTick] = useState(0);
  const [codexTab, setCodexTab] = useState<'enemies' | 'weapons' | 'relics' | 'pacts'>('relics');
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [playerNameInput, setPlayerNameInput] = useState<string>(engine?.playerName || 'Sapo');
  const [coopCodeInput, setCoopCodeInput] = useState<string>(engine?.netRoom || 'sapo01');
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    if (engine) {
      setPlayerNameInput(engine.playerName || 'Sapo');
      if (engine.netRoom) setCoopCodeInput(engine.netRoom);
    }
  }, [engine, activeModal]);

  useEffect(() => {
    const syncFs = () => {
      const doc: any = document;
      const nativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(nativeFs || !!engine?.isFullscreen);
    };
    syncFs();
    window.addEventListener('sapo-fullscreen', syncFs);
    document.addEventListener('fullscreenchange', syncFs);
    return () => {
      window.removeEventListener('sapo-fullscreen', syncFs);
      document.removeEventListener('fullscreenchange', syncFs);
    };
  }, [engine]);

  useEffect(() => {
    const syncProgress = () => forceUpdate();
    window.addEventListener('sapo-progress-update', syncProgress);
    return () => window.removeEventListener('sapo-progress-update', syncProgress);
  }, []);

  // Clear rebinding state when modal closes or changes
  useEffect(() => {
    if (activeModal !== 'options') {
      setListeningKey(null);
      (window as any).__SAPO_REBINDING__ = false;
    }
  }, [activeModal]);

  // Listen for custom key press when rebinding an ability or movement key
  useEffect(() => {
    if (!listeningKey || !engine) {
      (window as any).__SAPO_REBINDING__ = false;
      return;
    }
    (window as any).__SAPO_REBINDING__ = true;

    const handleRebindKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        setListeningKey(null);
        (window as any).__SAPO_REBINDING__ = false;
        engine.snd(260, 0.08, 'triangle', 0.05, -80);
        return;
      }

      const newCode = e.code;
      if (!engine.CFG.binds) {
        engine.CFG.binds = { ...DEFAULT_BINDS };
      }

      const prevCode = engine.CFG.binds[listeningKey];
      // If another action already uses newCode, swap them cleanly so there are no conflicts
      (Object.keys(engine.CFG.binds) as Array<keyof KeyBindings>).forEach((k) => {
        if (k !== listeningKey && engine.CFG.binds[k] === newCode) {
          engine.CFG.binds[k] = prevCode;
        }
      });

      engine.CFG.binds[listeningKey] = newCode;
      engine.saveProgress();
      engine.snd(580, 0.12, 'triangle', 0.08, 260);
      setListeningKey(null);
      (window as any).__SAPO_REBINDING__ = false;
      forceUpdate();
    };

    window.addEventListener('keydown', handleRebindKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleRebindKeyDown, { capture: true });
      (window as any).__SAPO_REBINDING__ = false;
    };
  }, [listeningKey, engine]);

  if (!engine && !toast) return null;

  const binds: KeyBindings = engine?.CFG?.binds || DEFAULT_BINDS;
  const activeRunes: string[] = engine?.activeRunes || [];

  return (
    <>
      {/* Pixel-Art Toast Notification (Top on Mobile to Keep Joysticks Clear, Bottom-Right on Desktop) */}
      {toast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 sm:top-auto sm:bottom-5 sm:left-auto sm:right-5 sm:translate-x-0 z-50 flex items-center gap-3 p-2.5 sm:p-3 bg-[#0c1812f2] border-2 border-[#ffd54f] shadow-[4px_4px_0_#000] max-w-[90vw] sm:max-w-sm select-none pointer-events-none">
          <div className="w-10 h-10 bg-[#14281d] border-2 border-[#ffd54f] flex items-center justify-center shrink-0">
            <PixelIcon
              sprite={engine?.S?.items?.[toast.ic] || engine?.S?.crownSm}
              size={24}
            />
          </div>
          <div className="flex flex-col overflow-hidden text-left font-mono">
            <span className="text-[10px] font-black text-[#ffd54f] tracking-wider">
              {toast.lbl}
            </span>
            <span className="font-bold text-xs text-white truncate">{toast.nm}</span>
            <span className="text-[11px] text-[#a5d6a7] truncate">{toast.ds}</span>
          </div>
        </div>
      )}

      {/* Swamp Runes Modal (Pre-Run Global Modifiers) */}
      {activeModal === 'runes' && engine && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/85 select-none"
          data-testid="runes-modal"
        >
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col bg-[#12091c] border-2 border-[#e040fb] p-4 sm:p-5 shadow-[6px_6px_0_#000] font-mono">
            <div className="flex justify-between items-center border-b-2 border-[#4a148c] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <PixelIcon sprite={engine.S.shrine} size={26} />
                <div>
                  <h2
                    className="text-xs sm:text-sm md:text-base font-black text-[#ea80fc]"
                    style={{ fontFamily: '"Press Start 2P", monospace' }}
                  >
                    RUNAS DO PÂNTANO
                  </h2>
                  <p className="text-[10px] text-[#ce93d8] mt-0.5">
                    Equipe até 2 Runas Ancestrais antes da exploração para ativar modificadores globais!
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                data-testid="runes-close-btn"
                className="btn-jelly px-3 py-1.5 bg-[#2a1240] hover:bg-[#3d1b5c] border-2 border-[#ea80fc] text-xs text-[#f3e5f5] font-bold cursor-pointer"
              >
                PRONTO [ESC]
              </button>
            </div>

            {/* Equipped Runes Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#0a0510] border-2 border-[#7b1fa2] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#ea80fc]">
                  SLOTS DE RUNA ATIVOS:
                </span>
                <span
                  className="px-2 py-0.5 bg-[#311042] border border-[#e040fb] text-xs font-black text-[#ffd54f]"
                  data-testid="runes-active-count"
                >
                  {activeRunes.length} / 2
                </span>
              </div>
              {activeRunes.length > 0 ? (
                <button
                  onClick={() => {
                    engine.activeRunes = [];
                    engine.saveProgress();
                    if (engine.me) engine.initPlayer(engine.ch);
                    engine.snd(300, 0.1, 'triangle', 0.06, -90);
                    forceUpdate();
                  }}
                  className="btn-jelly px-2.5 py-1 bg-[#3b1022] hover:bg-[#591833] border border-[#ff5252] text-[10px] font-bold text-[#ff8a80] cursor-pointer"
                >
                  LIMPAR RUNAS
                </button>
              ) : (
                <span className="text-[10px] text-[#9575cd]">
                  Toque em uma runa abaixo para gravá-la no seu sapo
                </span>
              )}
            </div>

            {/* Runes Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {SWAMP_RUNES.map((rune: SwampRuneDef) => {
                const isEquipped = activeRunes.includes(rune.id);
                return (
                  <div
                    key={rune.id}
                    data-testid={`rune-card-${rune.id}`}
                    onClick={() => {
                      engine.toggleRune(rune.id);
                      forceUpdate();
                    }}
                    className={`flex flex-col justify-between p-3 border-2 transition-all cursor-pointer ${
                      isEquipped
                        ? 'bg-[#261138] border-[#ffd54f] shadow-[0_0_12px_rgba(224,64,251,0.35)]'
                        : 'bg-[#160b22] hover:bg-[#1e102e] border-[#4a2366]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-9 h-9 bg-[#0a0510] border-2 flex items-center justify-center shrink-0"
                            style={{ borderColor: rune.col }}
                          >
                            <PixelIcon sprite={engine.S.items?.[rune.ic]} size={22} />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-[10px] sm:text-[11px] font-black leading-tight"
                              style={{ color: rune.col }}
                            >
                              {rune.nm.toUpperCase()}
                            </div>
                            <div className="text-[9px] text-[#b39ddb]">
                              {rune.sub.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            engine.toggleRune(rune.id);
                            forceUpdate();
                          }}
                          data-testid={`rune-toggle-${rune.id}`}
                          className={`btn-jelly px-2.5 py-1 border-2 text-[10px] font-black shrink-0 cursor-pointer ${
                            isEquipped
                              ? 'bg-[#ffd54f] border-white text-[#12091c]'
                              : 'bg-[#28143b] border-[#ba68c8] text-[#e1bee7]'
                          }`}
                        >
                          {isEquipped ? 'EQUIPADA' : 'EQUIPAR'}
                        </button>
                      </div>

                      <div className="space-y-1 mt-2 pt-1.5 border-t border-[#34184d]">
                        <div className="text-[11px] font-bold text-[#69f0ae] flex items-start gap-1">
                          <span>▲ BÔNUS:</span>
                          <span>{rune.boon}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#ff8a80] flex items-start gap-1">
                          <span>▼ PENALIDADE:</span>
                          <span>{rune.penalty}</span>
                        </div>
                        <div className="text-[10px] text-[#ce93d8] italic pt-0.5">
                          {rune.ds}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shaman Upgrade Cauldron Modal */}
      {activeModal === 'shaman' && engine && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 select-none">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-[#071418] border-2 border-[#00e5ff] p-5 shadow-[6px_6px_0_#000]">
            <div className="flex justify-between items-center border-b-2 border-[#006064] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <PixelIcon sprite={engine.S.shaman} size={30} />
                <h2
                  className="text-sm md:text-base font-black text-[#00e5ff]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  CALDEIRÃO DO VELHO XAMÃ
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-jelly px-3 py-1 bg-[#0d262c] hover:bg-[#143942] border-2 border-[#00e5ff] text-xs font-mono text-[#84ffff] font-bold cursor-pointer"
              >
                FECHAR [ESC]
              </button>
            </div>

            <div className="flex justify-between items-center px-3.5 py-2 bg-[#040d10] border-2 border-[#00838f] mb-4 font-mono">
              <span className="text-xs font-bold text-[#84ffff] flex items-center gap-2">
                <PixelIcon sprite={engine.S.larva} size={18} />
                <span>LARVAS CRISTALIZADAS DISPONÍVEIS:</span>
              </span>
              <span className="font-black text-base text-[#ffd54f] tabular-nums">
                {engine.achStats.larvae}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono">
              {SHAMAN_UPG.map((u: ShamanUpgradeDef) => {
                const lvl = (engine.achStats.upg as any)[u.id] || 0;
                const isMax = lvl >= 5;
                const cost = isMax ? 0 : u.costs[lvl];
                const canBuy = !isMax && engine.achStats.larvae >= cost;

                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-[#0a1c22] border-2 border-[#006064] gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-[#051014] border border-[#00acc1] flex items-center justify-center shrink-0">
                        <PixelIcon sprite={engine.S.items?.[u.ic]} size={22} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-xs md:text-sm text-[#e0f7fa]">
                          {u.nm}{' '}
                          <span className="text-xs text-[#00e5ff] tabular-nums">
                            [NÍVEL {lvl}/5]
                          </span>
                        </div>
                        <div className="text-[11px] text-[#80cbc4] mt-0.5">{u.ds}</div>
                        <div className="flex gap-1.5 mt-1.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <span
                              key={idx}
                              className={`w-3 h-2.5 border ${
                                idx < lvl
                                  ? 'bg-[#00e5ff] border-[#e0f7fa]'
                                  : 'bg-[#040a0c] border-[#004d40]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!canBuy}
                      onClick={() => {
                        if (canBuy) {
                          engine.achStats.larvae -= cost;
                          (engine.achStats.upg as any)[u.id] = lvl + 1;
                          engine.saveProgress();
                          engine.initPlayer(engine.ch);
                          engine.snd(540, 0.25, 'triangle', 0.09, 380);
                          forceUpdate();
                        }
                      }}
                      className={`btn-jelly px-3 py-2 border-2 font-bold text-xs cursor-pointer transition-all shrink-0 tabular-nums ${
                        isMax
                          ? 'bg-[#121e22] text-[#4f6b75] border-[#1f333a] cursor-not-allowed'
                          : canBuy
                          ? 'bg-[#00838f] hover:bg-[#00acc1] text-white border-[#84ffff] shadow-[0_3px_0_#00363a]'
                          : 'bg-[#0c181c] text-[#546e7a] border-[#1c3138] cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'MÁXIMO' : `EVOLUIR (${cost})`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compendium / Bestiary & Abilities Modal */}
      {activeModal === 'codex' && engine && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 select-none"
          data-testid="codex-modal"
        >
          <div className="w-full max-w-2xl max-h-[86vh] flex flex-col bg-[#120c1c] border-2 border-[#b388ff] p-5 shadow-[6px_6px_0_#000] font-mono">
            <div className="flex justify-between items-center border-b-2 border-[#4a148c] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <PixelIcon sprite={engine.S.bookIc} size={24} />
                <h2
                  className="text-sm md:text-base font-black text-[#e1bee7]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  BESTIÁRIO & MUTAÇÕES
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-jelly px-3 py-1 bg-[#28163e] hover:bg-[#381f57] border-2 border-[#b388ff] text-xs text-[#ede7f6] font-bold cursor-pointer"
              >
                FECHAR [ESC]
              </button>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => setCodexTab('relics')}
                data-testid="codex-tab-relics"
                className={`btn-jelly py-2 border-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  codexTab === 'relics'
                    ? 'bg-[#4a148c] border-[#ea80fc] text-white shadow-[0_2px_0_#1a0633]'
                    : 'bg-[#1a1026] border-[#311b47] text-[#9575cd] hover:text-white'
                }`}
              >
                <PixelIcon sprite={engine.S.items?.[0]} size={15} />
                <span>MUTAÇÕES ({IT.length})</span>
              </button>
              <button
                onClick={() => setCodexTab('enemies')}
                data-testid="codex-tab-enemies"
                className={`btn-jelly py-2 border-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  codexTab === 'enemies'
                    ? 'bg-[#4a148c] border-[#ea80fc] text-white shadow-[0_2px_0_#1a0633]'
                    : 'bg-[#1a1026] border-[#311b47] text-[#9575cd] hover:text-white'
                }`}
              >
                <PixelIcon sprite={engine.S.m} size={15} />
                <span>CRIATURAS ({ENEMY_INFO.length})</span>
              </button>
              <button
                onClick={() => setCodexTab('weapons')}
                data-testid="codex-tab-weapons"
                className={`btn-jelly py-2 border-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  codexTab === 'weapons'
                    ? 'bg-[#4a148c] border-[#ea80fc] text-white shadow-[0_2px_0_#1a0633]'
                    : 'bg-[#1a1026] border-[#311b47] text-[#9575cd] hover:text-white'
                }`}
              >
                <PixelIcon sprite={engine.S.weapons?.[0]} size={15} />
                <span>HABILIDADES ({WP.length})</span>
              </button>
              <button
                onClick={() => setCodexTab('pacts')}
                data-testid="codex-tab-pacts"
                className={`btn-jelly py-2 border-2 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  codexTab === 'pacts'
                    ? 'bg-[#4a148c] border-[#ea80fc] text-white shadow-[0_2px_0_#1a0633]'
                    : 'bg-[#1a1026] border-[#311b47] text-[#9575cd] hover:text-white'
                }`}
              >
                <PixelIcon sprite={engine.S.shrine} size={15} />
                <span>PACTOS ({PACT_LIST.length})</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-1">
              {codexTab === 'enemies' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ENEMY_INFO.map((en) => (
                    <div
                      key={en.id}
                      className={`flex items-center gap-3 p-2.5 border-2 ${
                        en.isBoss
                          ? 'bg-[#260e1e] border-[#ff4081]'
                          : 'bg-[#1a1128] border-[#4a2c6d]'
                      }`}
                    >
                      <div className="w-12 h-12 bg-[#0c0714] border border-[#7c4dff] flex items-center justify-center shrink-0">
                        <PixelIcon sprite={engine.S[en.id]} size={34} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-white truncate">{en.nm}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 border shrink-0 ${
                              en.isBoss
                                ? 'bg-[#880e4f] border-[#ff80ab] text-[#fce4ec]'
                                : 'bg-[#311b92] border-[#b388ff] text-[#ede7f6]'
                            }`}
                          >
                            {en.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#ce93d8] mt-0.5 leading-snug">
                          {en.ds}
                        </div>
                        <div className="text-[9px] font-bold text-[#ffd54f] mt-1">
                          VIDA BASE: {en.hp} HP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {codexTab === 'weapons' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {WP.map((w, idx) => (
                    <div
                      key={w.nm}
                      className="flex items-center gap-3 p-2.5 bg-[#1a1128] border-2 border-[#4a2c6d]"
                    >
                      <div className="w-11 h-11 bg-[#0c0714] border border-[#ffd54f] flex items-center justify-center shrink-0">
                        <PixelIcon sprite={engine.S.weapons?.[idx]} size={28} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ffd54f] truncate">
                            {w.nm}
                          </span>
                          <span className="text-[9px] font-bold text-[#80cbc4]">
                            DANO {w.dm}x
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-[10px] text-[#b39ddb]">
                          <span>CADÊNCIA: {Math.round(10 / w.rt) / 10}x</span>
                          <span>PROJÉTEIS: {w.n || 1}</span>
                          <span>VELOC.: {w.sp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {codexTab === 'relics' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {IT.map((it, idx) => {
                    const rar = RAR_INFO[it[2]] || RAR_INFO[0];
                    const detail = MUTATION_DETAILS[idx];
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2.5 bg-[#1a1128] border-2 border-[#4a2c6d] hover:border-[#b388ff] transition-colors"
                      >
                        <div className="w-11 h-11 bg-[#0c0714] border border-[#69f0ae] flex items-center justify-center shrink-0 mt-0.5">
                          <PixelIcon sprite={engine.S.items?.[idx]} size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-[#69f0ae] truncate">
                              {it[0]}
                            </span>
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 border border-black/40"
                              style={{ color: rar.col }}
                            >
                              {rar.nm}
                            </span>
                          </div>
                          {detail ? (
                            <div className="mt-1 space-y-0.5 text-[10px]">
                              <div className="text-[#69f0ae] font-bold">
                                ▲ BÔNUS: {detail.bonuses[0]}
                              </div>
                              <div className="text-[#ff8a80] font-bold">
                                ▼ PENALIDADE: {detail.penalties[0]}
                              </div>
                              <div className="text-[#b39ddb] text-[9px]">
                                * AFINIDADE: {detail.affinityText}
                                {detail.synergyNames.length > 0
                                  ? ` · SINERGIA: ${detail.synergyNames.join(', ')}`
                                  : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#e1bee7] mt-0.5">{it[1]}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {codexTab === 'pacts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {PACT_LIST.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2.5 bg-[#1a1128] border-2 border-[#ea80fc]"
                    >
                      <div className="w-11 h-11 bg-[#0c0714] border border-[#ea80fc] flex items-center justify-center shrink-0">
                        <PixelIcon sprite={engine.S.shrine} size={26} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-[#ffd54f] truncate">
                            {p.nm}
                          </span>
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 border border-black/40"
                            style={{ color: p.col }}
                          >
                            ALTAR DO BREJO
                          </span>
                        </div>
                        <div className="text-[10px] text-[#69f0ae] mt-0.5">
                          BÔNUS: {p.boon}
                        </div>
                        <div className="text-[10px] text-[#ff8a80] mt-0.5">
                          PREÇO: {p.curse}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {activeModal === 'achievements' && engine && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 select-none">
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col bg-[#0b160f] border-2 border-[#ffd54f] p-5 shadow-[6px_6px_0_#000]">
            <div className="flex justify-between items-center border-b-2 border-[#2e573c] pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <PixelIcon sprite={engine.S.crown} size={24} />
                <h2
                  className="text-sm md:text-base font-black text-[#ffd54f]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  CONQUISTAS DO BREJO
                </h2>
              </div>
              <button
                onClick={onClose}
                className="btn-jelly px-3 py-1 bg-[#162b1e] hover:bg-[#213f2c] border-2 border-[#66bb6a] text-xs font-mono text-[#b9f6ca] font-bold cursor-pointer"
              >
                FECHAR [ESC]
              </button>
            </div>

            <div className="flex justify-between items-center px-3 py-2 bg-[#060d09] border-2 border-[#2e573c] mb-3 font-mono">
              <span className="text-[11px] text-[#a5d6a7] font-bold">
                Cada conquista concede +1 Larva e bônus passivo permanente!
              </span>
              <button
                onClick={() => {
                  engine.achStats.kills = Math.max(engine.achStats.kills, 20);
                  engine.achStats.maxItems = Math.max(engine.achStats.maxItems, 5);
                  engine.achStats.maxDmg = Math.max(engine.achStats.maxDmg, 5.0);
                  engine.achStats.larvae += 15;
                  ACH_LIST.forEach((a) => (engine.achData[a.id] = Date.now()));
                  engine.saveProgress();
                  engine.snd(600, 0.3, 'triangle', 0.09, 400);
                  forceUpdate();
                }}
                className="btn-jelly text-[11px] font-bold px-2.5 py-1 bg-[#006064] hover:bg-[#00838f] border border-[#00e5ff] text-[#e0f7fa] cursor-pointer shrink-0"
              >
                LIBERAR TUDO (SANDBOX)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono">
              {ACH_LIST.map((a: AchievementDef) => {
                const unlocked = !!engine.achData[a.id];
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-2.5 border-2 transition-colors ${
                      unlocked
                        ? 'bg-[#112418] border-[#66bb6a] text-white'
                        : 'bg-[#08100b] border-[#192b1f] text-[#607d8b] opacity-70'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 flex items-center justify-center border shrink-0 ${
                        unlocked
                          ? 'bg-[#1b3b26] border-[#ffd54f]'
                          : 'bg-[#050a07] border-[#192b1f]'
                      }`}
                    >
                      <PixelIcon
                        sprite={unlocked ? engine.S.items?.[a.ic] : engine.S.lock}
                        size={20}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs text-[#e8f5e9] flex justify-between">
                        <span>{a.nm}</span>
                        {unlocked && <span className="text-[10px] text-[#ffd54f]">DESBLOQUEADO</span>}
                      </div>
                      <div className="text-[11px] text-[#a5d6a7]">{a.ds}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Options & Custom Keybinds Modal */}
      {activeModal === 'options' && engine && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 select-none"
          data-testid="options-modal"
        >
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[#0a1610] border-2 border-[#66bb6a] p-4 sm:p-5 shadow-[6px_6px_0_#000] font-mono">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-[#1e3a27] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <PixelIcon sprite={engine.S.gear} size={20} />
                <h2
                  className="text-xs sm:text-sm font-black text-[#b9f6ca]"
                  style={{ fontFamily: '"Press Start 2P", monospace' }}
                >
                  OPÇÕES & ATALHOS
                </h2>
              </div>
              <button
                onClick={onClose}
                data-testid="options-close-btn"
                className="btn-jelly px-3 py-1 bg-[#163624] hover:bg-[#204a33] border-2 border-[#66bb6a] text-xs text-[#e8f5e9] font-bold cursor-pointer"
              >
                CONTINUAR [ESC]
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Real Online Multiplayer Co-op Room Section */}
              <div className="p-3 bg-[#061318] border-2 border-[#00e5ff] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#00e5ff] tracking-wider">
                    MULTIPLAYER CO-OP ONLINE REAL (P2P)
                  </span>
                  <span className="text-[10px] font-bold text-[#ffd54f]">
                    {engine.netRoom
                      ? `SALA: ${engine.netRoom.toUpperCase()} (${Object.keys(engine.netPlayers).length + 1}P)`
                      : 'DESCONECTADO'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={playerNameInput}
                    onChange={(e) => setPlayerNameInput(e.target.value.slice(0, 12))}
                    placeholder="Seu apelido"
                    className="bg-[#040a0c] border border-[#00838f] text-[#e0f7fa] px-2 py-1 text-xs font-bold"
                  />
                  <input
                    type="text"
                    value={coopCodeInput}
                    onChange={(e) => setCoopCodeInput(e.target.value.toLowerCase().slice(0, 12))}
                    placeholder="Código da sala"
                    className="bg-[#040a0c] border border-[#00838f] text-[#ffd54f] px-2 py-1 text-xs font-bold uppercase"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        engine.joinMultiplayerRoom(coopCodeInput || 'sapo01', playerNameInput);
                        forceUpdate();
                      }}
                      className="btn-jelly flex-1 py-1 bg-[#00acc1] hover:bg-[#00e5ff] text-[#041014] font-black text-xs border border-white cursor-pointer"
                    >
                      ENTRAR SALA
                    </button>
                    {engine.netRoom && (
                      <button
                        onClick={() => {
                          engine.leaveMultiplayerRoom();
                          forceUpdate();
                        }}
                        className="btn-jelly px-2.5 py-1 bg-[#4a1218] hover:bg-[#6d1b24] text-[#ffcdd2] font-bold text-xs border border-[#ff5252] cursor-pointer"
                      >
                        SAIR
                      </button>
                    )}
                  </div>
                </div>
                {Object.keys(engine.netPlayers).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.values(engine.netPlayers).map((rp) => (
                      <div
                        key={rp.id}
                        className="flex items-center gap-1.5 px-2 py-1 bg-[#040d10] border border-[#00acc1] text-[10px] text-[#84ffff]"
                      >
                        <PixelIcon sprite={engine.S.pIdle?.[rp.ch || 0]} size={13} />
                        <span>{rp.name} ({CH[rp.ch || 0]?.n})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick In-Game Session Actions */}
              {(engine.ST === 'play' || engine.ST === 'camp') && (
                <div className="p-2.5 bg-[#06100a] border-2 border-[#1e3a27]">
                  <div className="text-[10px] font-black text-[#ffd54f] mb-2 tracking-wider">
                    AÇÕES DA PARTIDA
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {onGoCamp && (
                      <button
                        onClick={() => {
                          onClose();
                          onGoCamp();
                        }}
                        className="btn-jelly px-2 py-1.5 bg-[#112418] hover:bg-[#193322] border-2 border-[#ffd54f] text-[10px] font-bold text-[#ffd54f] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PixelIcon sprite={engine.S.campfire?.[0]} size={14} />
                        <span>ACAMPAMENTO</span>
                      </button>
                    )}

                    {onRestart && (
                      <button
                        onClick={() => {
                          onClose();
                          onRestart();
                        }}
                        className="btn-jelly px-2 py-1.5 bg-[#112418] hover:bg-[#193322] border-2 border-[#66bb6a] text-[10px] font-bold text-[#e8f5e9] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PixelIcon sprite={engine.S.rst} size={13} />
                        <span>NOVA RUN</span>
                      </button>
                    )}

                    {onOpenRunes && (
                      <button
                        onClick={() => {
                          onOpenRunes();
                        }}
                        className="btn-jelly px-2 py-1.5 bg-[#221030] hover:bg-[#331847] border-2 border-[#e040fb] text-[10px] font-bold text-[#f3e5f5] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PixelIcon sprite={engine.S.shrine} size={14} />
                        <span>RUNAS ({activeRunes.length}/2)</span>
                      </button>
                    )}

                    {onOpenCodex && (
                      <button
                        onClick={() => {
                          onOpenCodex();
                        }}
                        className="btn-jelly px-2 py-1.5 bg-[#1f1230] hover:bg-[#2d1a45] border-2 border-[#b388ff] text-[10px] font-bold text-[#e1bee7] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PixelIcon sprite={engine.S.bookIc} size={14} />
                        <span>BESTIÁRIO</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section 1: Audio, Display & Mobile Controls */}
              <div className="p-3 bg-[#07120c] border-2 border-[#1e3a27] space-y-2.5 text-xs">
                <div className="text-[10px] font-black text-[#69f0ae] tracking-wider mb-1">
                  ÁUDIO, TELA & CONTROLES MOBILE
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#b9f6ca]">Volume de Efeitos (SFX)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={engine.CFG.muted ? 0 : Math.round(engine.CFG.sfx * 100)}
                      onChange={(e) => {
                        engine.CFG.sfx = +e.target.value / 100;
                        if (engine.CFG.sfx > 0) engine.CFG.muted = false;
                        engine.saveProgress();
                        forceUpdate();
                      }}
                      className="w-24 accent-[#66bb6a]"
                    />
                    <button
                      onClick={() => {
                        engine.CFG.muted = !engine.CFG.muted;
                        engine.saveProgress();
                        forceUpdate();
                      }}
                      className="btn-jelly px-2 py-1 bg-[#142b1d] border border-[#66bb6a] font-bold text-[#ffd54f] tabular-nums cursor-pointer"
                    >
                      {engine.CFG.muted ? 'MUDO' : `${Math.round(engine.CFG.sfx * 100)}%`}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center justify-between bg-[#0b1c12] px-2.5 py-1.5 border border-[#1e3a27]">
                    <span className="font-bold text-[#b9f6ca]">Tremor (Shake)</span>
                    <button
                      onClick={() => {
                        engine.CFG.shake =
                          engine.CFG.shake === 1 ? 1.8 : engine.CFG.shake === 1.8 ? 0 : 1;
                        engine.saveProgress();
                        forceUpdate();
                      }}
                      className="btn-jelly px-2 py-0.5 bg-[#142b1d] border border-[#66bb6a] font-bold text-[#e8f5e9] cursor-pointer"
                    >
                      {engine.CFG.shake === 0
                        ? 'OFF'
                        : engine.CFG.shake === 1
                        ? 'NORMAL'
                        : 'INTENSO'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#0b1c12] px-2.5 py-1.5 border border-[#1e3a27]">
                    <span className="font-bold text-[#b9f6ca]">Impacto Hit-Stop</span>
                    <button
                      onClick={() => {
                        engine.CFG.hitstop = !engine.CFG.hitstop;
                        engine.saveProgress();
                        forceUpdate();
                      }}
                      className="btn-jelly px-2 py-0.5 bg-[#142b1d] border border-[#66bb6a] font-bold text-[#e8f5e9] cursor-pointer"
                    >
                      {engine.CFG.hitstop ? 'LIGADO' : 'OFF'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#0b1c12] px-2.5 py-1.5 border border-[#1e3a27]">
                    <span className="font-bold text-[#b9f6ca]">Botões Mobile</span>
                    <button
                      onClick={() => {
                        const cur = engine.CFG.touch || 'auto';
                        engine.CFG.touch =
                          cur === 'auto' ? 'on' : cur === 'on' ? 'off' : 'auto';
                        engine.saveProgress();
                        forceUpdate();
                      }}
                      className="btn-jelly px-2 py-0.5 bg-[#142b1d] border border-[#00e5ff] font-bold text-[#84ffff] cursor-pointer"
                    >
                      {(engine.CFG.touch || 'auto').toUpperCase()}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#0b1c12] px-2.5 py-1.5 border border-[#1e3a27]">
                    <span className="font-bold text-[#b9f6ca]">Tela Cheia</span>
                    <button
                      onClick={() => {
                        engine.toggleFullscreen();
                        forceUpdate();
                      }}
                      data-testid="options-fullscreen-btn"
                      className="btn-jelly px-2 py-0.5 bg-[#142b1d] border border-[#ffd54f] font-bold text-[#ffd54f] cursor-pointer"
                    >
                      {isFullscreen ? 'SAIR TELA CHEIA' : 'ATIVAR TELA CHEIA'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Custom Keyboard Shortcuts for Abilities & Movement */}
              <div
                className="p-3 bg-[#07120c] border-2 border-[#66bb6a] space-y-2"
                data-testid="keybinds-section"
              >
                <div className="flex items-center justify-between border-b border-[#1e3a27] pb-2">
                  <div>
                    <div className="text-[11px] font-black text-[#ffd54f] tracking-wider">
                      ATALHOS DO TECLADO (HABILIDADES & AÇÕES)
                    </div>
                    <div className="text-[10px] text-[#a5d6a7]">
                      Clique em um atalho e pressione qualquer tecla para personalizar:
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      engine.CFG.binds = { ...DEFAULT_BINDS };
                      setListeningKey(null);
                      engine.saveProgress();
                      engine.snd(440, 0.1, 'triangle', 0.07, 180);
                      forceUpdate();
                    }}
                    data-testid="reset-binds-btn"
                    className="btn-jelly px-2.5 py-1 bg-[#1b3324] hover:bg-[#254732] border border-[#81c784] text-[10px] font-bold text-[#e8f5e9] cursor-pointer shrink-0"
                  >
                    RESTAURAR PADRÃO
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {KEYBIND_ROWS.map((row) => {
                    const isListening = listeningKey === row.key;
                    const curCode = binds[row.key] || DEFAULT_BINDS[row.key];
                    return (
                      <div
                        key={row.key}
                        className={`flex items-center justify-between p-2 border transition-colors ${
                          row.highlight
                            ? 'bg-[#0f2418] border-[#4caf50]'
                            : 'bg-[#09170f] border-[#1e3a27]'
                        }`}
                      >
                        <div className="pr-2 min-w-0">
                          <div className="text-[11px] font-bold text-[#e8f5e9] truncate">
                            {row.label}
                          </div>
                          <div className="text-[9px] text-[#80cbc4] truncate">{row.desc}</div>
                        </div>

                        <button
                          onClick={() => {
                            setListeningKey(isListening ? null : row.key);
                            engine.snd(480, 0.06, 'sine', 0.05, 140);
                          }}
                          data-testid={`bind-btn-${row.key}`}
                          className={`btn-jelly px-2.5 py-1 border-2 font-black text-[10px] min-w-[76px] text-center cursor-pointer transition-all shrink-0 ${
                            isListening
                              ? 'bg-[#ffd54f] border-white text-[#050a07] animate-pulse'
                              : 'bg-[#142e1f] hover:bg-[#1e462f] border-[#69f0ae] text-[#ffd54f] shadow-[0_2px_0_#040805]'
                          }`}
                        >
                          {isListening ? 'TECLA...' : formatKeyLabel(curCode)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {onBackToTitle && (
              <div className="mt-3 pt-3 border-t-2 border-[#1e3a27] flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onBackToTitle();
                  }}
                  className="btn-jelly flex-1 py-2 font-bold text-xs bg-[#b71c1c] hover:bg-[#d32f2f] text-white border-2 border-[#ef5350] shadow-[0_3px_0_#4a0b0b] cursor-pointer"
                >
                  VOLTAR AO MENU PRINCIPAL
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
