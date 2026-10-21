# 🐸 Sapinhos Sapecas

Um **Action Roguelite 2D em Pixel Art** de sapos mutantes tentando sobreviver nas profundezas tóxicas do pântano! É aquele esquema clássico e frenético: entrou no brejo, acumulou mutações genéticas insanas, enfrentou chefões colossais e, se bater as botas, volta para o Acampamento para evoluir no Caldeirão do Velho Xamã.

O jogo roda **100% direto no navegador (PC e Mobile)** com estética inspirada em *indie games* de Godot, botões elásticos estilo *Jelly* (geleia) e suporte a **Multiplayer Co-op Online P2P**.

---

## 🎮 Principais Mecânicas & Novidades

- **Língua Tipo Chicote (Mecânica Retrátil & Responsiva):**
  - Quando em repouso, a língua do sapo fica pequenininha e discreta na ponta da boca.
  - Ao clicar ou segurar o ataque, ela se estica rapidamente como um **chicote orgânico** com controle direcional fluido, varrendo inimigos, coletando Moscas Douradas/Corações à distância e aplicando empurrão (*knockback*) controlado que nunca joga os inimigos para fora da arena.
- **Sistema de Runas do Pântano (Modificadores Globais de Run):**
  - Antes de mergulhar no Poço da Masmorra (pelo Menu Inicial, Acampamento ou Pedra das Runas), o jogador pode equipar até **2 Runas Ancestrais** (*Runa da Voracidade*, *Carapaça Antiga*, *Frenesi Ácido*, *Cobiça Dourada*, *Chicote Elástico* e *Bio-Tempestade*).
  - Cada runa concede **Bônus Globais poderosos** combinados com uma **Penalidade Tática**, além de orbitar visualmente o sapo durante a exploração.
- **Mutações Visuais & Tooltips Detalhados na UI:**
  - Mais de **20 Mutações Genéticas** que alteram o corpo do sapo em tempo real (chifres venenosos, auréola de esporos, glândulas ácidas, terceiro olho hipnótico, presas vampíricas).
  - **Tooltips Informativos (Mouse, Teclado e Toque Mobile):** Passe o mouse ou toque em qualquer mutação na barra concisa do HUD, Menu ou Bestiário para inspecionar estatísticas exatas de **▲ Bônus**, **▼ Penalidades/Restrições**, **★ Afinidades Genéticas** e **Sinergias**.
- **5 Sapos Jogáveis com Habilidades Bucais Únicas:**
  - **Ribbit** (*Cuspe Ácido*), **Bull** (*Arroto de Girinos*), **Peeper** (*Metralha de Bolha*), **Dart** (*Língua-Chicote*) e **Goliath** (*Bomba de Muco*).
- **Mapas Procedurais & Clima Dinâmico:**
  - Masmorras geradas proceduralmente com salas multi-ondas, Lojas do Mercador Sapo, Altares de Pacto do Brejo e 5 Chefões únicos.
- **Multiplayer Co-op P2P Real:**
  - Conecte-se direto com seus amigos usando códigos de sala via WebRTC/PeerJS para explorar o pântano juntos sem bots.

---

## ✨ Inspirações

O projeto nasceu da paixão por *roguelites* de ação rápida e *juiciness* retrô:
- **Enter the Gungeon & Nuclear Throne:** Combate ágil, esquiva aérea (*Pulo-Z*), *screen shake* calibrado, *hit-stop* e armas/habilidades com personalidade.
- **The Binding of Isaac:** Mutações que se acumulam visualmente no personagem e criam sinergias malucas a cada *run*.
- **Forager & Estética Godot Indie:** Interface vibrante em Pixel Art, animações elásticas *squash-and-stretch* (botões *jelly*) e feedback visual imediato.

---

## 🛠️ Como Está Sendo Feito (Arquitetura & Tecnologias)

Construído com foco em performance de 60 FPS constantes tanto em desktops quanto em celulares:
- **HTML5 Canvas + Sprites Matriciais Procedurais:** Todos os sprites de sapos, mutações, chefões e partículas são desenhados em matrizes de pixel art renderizadas em *offscreen canvases* com `image-rendering: pixelated`.
- **TypeScript + React 19 + Tailwind CSS:** Arquitetura modular separando a física pura (`physics.ts`), geração de masmorras (`dungeon.ts`), sinergias (`synergies.ts`), renderizador pixel-art (`renderer.ts`) e motor de jogo (`engine.ts`).
- **Web Audio API Sintetizada:** Efeitos sonoros retrô gerados proceduralmente sem depender de arquivos externos pesados.
- **Controles Híbridos Adaptativos (PC & Mobile):** Suporte completo a Teclado + Mouse (com atalhos 100% reconfiguráveis) e **Joysticks Virtuais Multi-Touch** dedicados para telas móveis.

---

## 🎯 Objetivos & Roadmap (Lançamento PC e Mobile)

O grande objetivo do **Sapinhos Sapecas** é evoluir para um lançamento completo multiplataforma:
1. **Versão PC (Steam / Itch.io / Web):** Empacotamento desktop com suporte a controles (Gamepad API), conquistas integradas e *leaderboards* de desafios diários (*Daily Seed*).
2. **Versão Mobile (Android & iOS via PWA / Capacitor):** Experiência *touch-first* calibrada com HUD compacto, tooltips acionáveis por toque, vibração háptica e modo retrato/paisagem fluido.
3. **Expansão do Brejo:** Novos biomas subterrâneos, mais combinações de Runas do Pântano e chefes secretos.

---

## 🚀 Como Rodar no Seu PC

1. Clone este repositório no seu computador.
2. Instale as dependências com `npm install`.
3. Inicie o servidor de desenvolvimento com `npm run dev`.
4. Acesse `http://localhost:3000` no seu navegador favorito e divirta-se!

---

## 🕹️ Controles

- **PC:** `WASD` ou `Setas` para mover | `Mouse` para mirar | `Clique Esquerdo` para usar a Língua-Chicote / Cuspir | `Espaço` ou `Clique Direito` para Pulo-Z | `E` para interagir com Altares, Runas, Baús e Xamã.
- **Mobile:** Joystick esquerdo para mover | Joystick direito para mirar e atacar | Botões de ação *Jelly* para Pulo-Z e Interação.

---

## 👨‍💻 Quem Fez

Criado por **Guilherme Fonseca da Silva**.

uebeti 🐸