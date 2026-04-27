const HAND_SIZE = 6;

// ---- Cat SVG Generator ----

function generateCatSVG(card) {
  const raw      = card.color || '#888';
  const isRainbow = card.id === 54;
  const isGhost   = card.id === 55;

  const fill    = isRainbow ? 'url(#rbg)' : isGhost ? '#b0b0b0' : raw;
  const opacity = isGhost ? '0.45' : '1';

  const atk  = card.attack  || 0;
  const def  = card.defense || 0;

  // Personality based on dominant stat
  const ratio   = def === 0 ? 99 : atk / def;
  const fierce  = atk >= 10;
  const angry   = atk >= 6  && ratio > 1.5;
  const cool    = def >= 7  && ratio < 0.8;
  const happy   = (card.heal || 0) > 0 && atk < 5;
  // else mystery

  const pupil = fierce ? '#cc0000' : angry ? '#cc5500' : cool ? '#0088cc' : happy ? '#00aa55' : '#9933cc';

  const brows = (fierce || angry) ? `
    <line x1="27" y1="41" x2="44" y2="46" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="56" y1="46" x2="73" y2="41" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>` : '';

  let eyes = '';
  if (fierce) {
    eyes = `
      <path d="M29,51 Q38,43 47,51" fill="${pupil}"/>
      <path d="M53,51 Q62,43 71,51" fill="${pupil}"/>
      <circle cx="38" cy="49" r="2" fill="#0a0000"/>
      <circle cx="62" cy="49" r="2" fill="#0a0000"/>`;
  } else if (angry) {
    eyes = `
      <ellipse cx="38" cy="51" rx="7" ry="6.5" fill="white"/>
      <ellipse cx="62" cy="51" rx="7" ry="6.5" fill="white"/>
      <ellipse cx="38" cy="52" rx="4"   ry="4.5" fill="${pupil}"/>
      <ellipse cx="62" cy="52" rx="4"   ry="4.5" fill="${pupil}"/>
      <circle  cx="36" cy="49" r="1.5" fill="black"/>
      <circle  cx="60" cy="49" r="1.5" fill="black"/>
      <circle  cx="40" cy="50" r="1"   fill="white"/>
      <circle  cx="64" cy="50" r="1"   fill="white"/>`;
  } else if (cool) {
    eyes = `
      <ellipse cx="38" cy="52" rx="7" ry="4" fill="white"/>
      <ellipse cx="62" cy="52" rx="7" ry="4" fill="white"/>
      <ellipse cx="38" cy="52" rx="4" ry="3" fill="${pupil}"/>
      <ellipse cx="62" cy="52" rx="4" ry="3" fill="${pupil}"/>
      <circle  cx="39" cy="51" r="1"   fill="white"/>
      <circle  cx="63" cy="51" r="1"   fill="white"/>
      <line x1="31" y1="48" x2="45" y2="48" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="55" y1="48" x2="69" y2="48" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (happy) {
    eyes = `
      <ellipse cx="38" cy="50" rx="8" ry="8" fill="white"/>
      <ellipse cx="62" cy="50" rx="8" ry="8" fill="white"/>
      <ellipse cx="38" cy="51" rx="5" ry="5" fill="${pupil}"/>
      <ellipse cx="62" cy="51" rx="5" ry="5" fill="${pupil}"/>
      <circle  cx="36" cy="48" r="2" fill="white"/>
      <circle  cx="60" cy="48" r="2" fill="white"/>`;
  } else {
    eyes = `
      <ellipse cx="38" cy="51" rx="7.5" ry="7" fill="white"/>
      <ellipse cx="38" cy="52" rx="4.5" ry="4.5" fill="${pupil}"/>
      <circle  cx="36" cy="49" r="1.5" fill="white"/>
      <path d="M54,51 Q62,46 70,51" stroke="#222" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }

  let mouth = '';
  if (fierce)      mouth = `<path d="M43,64 L50,71 L57,64" stroke="#222" stroke-width="1.5" fill="none" stroke-linecap="round"/><line x1="46" y1="66" x2="46" y2="71" stroke="white" stroke-width="1.5"/><line x1="54" y1="66" x2="54" y2="71" stroke="white" stroke-width="1.5"/>`;
  else if (angry)  mouth = `<path d="M45,66 Q50,63 55,66" stroke="#333" stroke-width="1.5" fill="none"/>`;
  else if (happy)  mouth = `<path d="M42,64 Q50,74 58,64" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  else             mouth = `<path d="M45,65 Q50,69 55,65" stroke="#333" stroke-width="1.5" fill="none"/>`;

  const blush  = happy ? `<ellipse cx="27" cy="61" rx="7" ry="4" fill="#ff9eb5" opacity="0.5"/><ellipse cx="73" cy="61" rx="7" ry="4" fill="#ff9eb5" opacity="0.5"/>` : '';
  const stars  = (!fierce && !angry && !cool && !happy) ? `<circle cx="14" cy="26" r="2.5" fill="#cc44ff" opacity="0.65"/><circle cx="84" cy="20" r="2" fill="#cc44ff" opacity="0.5"/>` : '';
  const gGlow  = isGhost   ? `style="filter:drop-shadow(0 0 5px rgba(220,220,255,0.9))"` : '';
  const rbDef  = isRainbow ? `<defs><linearGradient id="rbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ff0000"/><stop offset="17%" stop-color="#ff7700"/><stop offset="33%" stop-color="#ffff00"/><stop offset="50%" stop-color="#00ff00"/><stop offset="67%" stop-color="#0000ff"/><stop offset="83%" stop-color="#8b00ff"/><stop offset="100%" stop-color="#ff0000"/></linearGradient></defs>` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 95" width="100%" height="100%" ${gGlow}>
  ${rbDef}
  <polygon points="17,44 28,12 43,44" fill="${fill}" opacity="${opacity}"/>
  <polygon points="22,42 29,20 39,42" fill="#ffb3c6" opacity="0.85"/>
  <polygon points="57,44 72,12 83,44" fill="${fill}" opacity="${opacity}"/>
  <polygon points="61,42 71,20 77,42" fill="#ffb3c6" opacity="0.85"/>
  <ellipse cx="50" cy="60" rx="37" ry="33" fill="${fill}" opacity="${opacity}"/>
  ${brows}${eyes}
  <path d="M47,63 L50,67 L53,63 Q50,61 47,63Z" fill="#ff9eb5"/>
  ${mouth}
  <line x1="6"  y1="62" x2="41" y2="64" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
  <line x1="6"  y1="67" x2="41" y2="67" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
  <line x1="59" y1="64" x2="94" y2="62" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
  <line x1="59" y1="67" x2="94" y2="67" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
  ${blush}${stars}
</svg>`;
}

// ---- Mouse Card ----
const MOUSE_CARD = {
  id: 'mouse', name: 'Carta do Rato', color: '#5a3a1a', emoji: '🐭',
  attack: 0, defense: 0, heal: 0,
  abilityName: 'Armadilha do Rato',
  description: 'Anula o próximo ataque imediato do oponente!',
  special: 'cancel_next_attack', cost: 20
};

// =====================================================
//  55 Cartas — todas com ATK e DEF
//  Mecânica: dano = max(0, ATK - escudo do oponente)
//            DEF da carta é adicionado ao seu escudo
// =====================================================
const CARDS = [
  // ── OFENSIVAS (ATK alto, DEF baixo) ──────────────────────────────────────
  { id:1,  name:"Gato Vermelho",        color:"#e74c3c", attack:7,  defense:2,  heal:0,  abilityName:"Ataque de Fogo",      description:"⚔️7 🛡️2 — Chama que perfura defesas",             special:null },
  { id:4,  name:"Gato Amarelo",         color:"#f1c40f", attack:6,  defense:3,  heal:0,  abilityName:"Raio Solar",          description:"⚔️6 🛡️3 — Energia do sol",                        special:null },
  { id:6,  name:"Gato Laranja",         color:"#e67e22", attack:8,  defense:2,  heal:-3, abilityName:"Explosão Flamejante", description:"⚔️8 🛡️2 💔3 — Grande dano, custa vida",           special:null },
  { id:14, name:"Gato Turquesa",        color:"#1abc9c", attack:7,  defense:2,  heal:0,  abilityName:"Onda Mágica",         description:"⚔️7 🛡️2 — Onda que rompe escudos",               special:null },
  { id:17, name:"Gato Vinho",           color:"#722f37", attack:8,  defense:2,  heal:-1, abilityName:"Sangue Ardente",      description:"⚔️8 🛡️2 💔1 — Poder com sacrifício",             special:null },
  { id:18, name:"Gato Neon",            color:"#39ff14", attack:7,  defense:3,  heal:0,  abilityName:"Choque Elétrico",     description:"⚔️7 🛡️3 — Descarga de alta tensão",              special:null },
  { id:20, name:"Gato Escarlate",       color:"#c0392b", attack:9,  defense:1,  heal:0,  abilityName:"Fúria",               description:"⚔️9 🛡️1 — Máximo ataque, mínima defesa",         special:"self_reduce_defense" },
  { id:22, name:"Gato Coral",           color:"#ff6b6b", attack:7,  defense:3,  heal:0,  abilityName:"Explosão Marinha",    description:"⚔️7 🛡️3 — Impacto das profundezas",              special:null },
  { id:25, name:"Gato Rubi",            color:"#9b111e", attack:10, defense:2,  heal:0,  abilityName:"Chama Eterna",        description:"⚔️10 🛡️2 — Fogo inextinguível",                  special:null },
  { id:27, name:"Gato Topázio",         color:"#ffc87c", attack:7,  defense:3,  heal:0,  abilityName:"Energia Solar",       description:"⚔️7 🛡️3 — Força concentrada do sol",             special:null },
  { id:30, name:"Gato Diamante",        color:"#b9f2ff", attack:11, defense:2,  heal:0,  abilityName:"Brilho Supremo",      description:"⚔️11 🛡️2 — O golpe mais brilhante",              special:null },
  { id:33, name:"Gato Magenta",         color:"#cc00cc", attack:9,  defense:2,  heal:-2, abilityName:"Magia Caótica",       description:"⚔️9 🛡️2 💔2 — Caos puro",                        special:null },
  { id:36, name:"Gato Vermelho-claro",  color:"#ff6666", attack:7,  defense:3,  heal:0,  abilityName:"Fogo Rápido",         description:"⚔️7 🛡️3 — Golpe veloz e ardente",                special:null },
  { id:40, name:"Gato Preto-azulado",   color:"#191970", attack:9,  defense:3,  heal:0,  abilityName:"Trevas",              description:"⚔️9 🛡️3 — Poder das sombras",                    special:null },
  { id:44, name:"Gato Vermelho-escuro", color:"#8b0000", attack:10, defense:2,  heal:-3, abilityName:"Fúria Sangrenta",     description:"⚔️10 🛡️2 💔3 — Devastação total",                special:null },
  { id:48, name:"Gato Roxo-escuro",     color:"#6a0dad", attack:8,  defense:3,  heal:0,  abilityName:"Magia Profunda",      description:"⚔️8 🛡️3 — Feitiço das trevas",                   special:null },
  { id:50, name:"Gato Azul-neon",       color:"#00e5ff", attack:8,  defense:3,  heal:0,  abilityName:"Choque Aquático",     description:"⚔️8 🛡️3 — Corrente elétrica subaquática",        special:null },
  { id:51, name:"Gato Vermelho-neon",   color:"#ff073a", attack:11, defense:2,  heal:-2, abilityName:"Explosão Neon",       description:"⚔️11 🛡️2 💔2 — Explosão máxima",                 special:null },

  // ── DEFENSIVAS (ATK baixo, DEF alto) ─────────────────────────────────────
  { id:2,  name:"Gato Azul",            color:"#3498db", attack:2,  defense:7,  heal:0,  abilityName:"Escudo de Água",      description:"⚔️2 🛡️7 — Muralha líquida",                      special:null },
  { id:9,  name:"Gato Cinza",           color:"#95a5a6", attack:2,  defense:8,  heal:0,  abilityName:"Armadura Metálica",   description:"⚔️2 🛡️8 — Aço impenetrável",                     special:null },
  { id:13, name:"Gato Marrom",          color:"#8e6b3e", attack:2,  defense:7,  heal:0,  abilityName:"Terra Firme",         description:"⚔️2 🛡️7 — Defesa sólida como rocha",             special:null },
  { id:24, name:"Gato Safira",          color:"#0f52ba", attack:2,  defense:9,  heal:0,  abilityName:"Escudo Cristal",      description:"⚔️2 🛡️9 — Cristal de proteção suprema",          special:null },
  { id:28, name:"Gato Onix",            color:"#353839", attack:2,  defense:10, heal:0,  abilityName:"Pedra Negra",         description:"⚔️2 🛡️10 — Defesa máxima da pedra negra",        special:null },
  { id:31, name:"Gato Bronze",          color:"#cd7f32", attack:3,  defense:7,  heal:0,  abilityName:"Resistência",         description:"⚔️3 🛡️7 — Dureza do bronze",                     special:null },
  { id:35, name:"Gato Azul-escuro",     color:"#00008b", attack:3,  defense:8,  heal:0,  abilityName:"Mar Profundo",        description:"⚔️3 🛡️8 — Pressão das profundezas",              special:null },
  { id:37, name:"Gato Cinza-escuro",    color:"#4a4a4a", attack:3,  defense:8,  heal:0,  abilityName:"Sombra Metálica",     description:"⚔️3 🛡️8 — Metal das sombras",                    special:null },
  { id:43, name:"Gato Azul-claro",      color:"#add8e6", attack:3,  defense:6,  heal:0,  abilityName:"Escudo Leve",         description:"⚔️3 🛡️6 — Proteção ágil",                        special:null },
  { id:52, name:"Gato Branco-neon",     color:"#e8e8e8", attack:3,  defense:10, heal:3,  abilityName:"Luz Suprema",         description:"⚔️3 🛡️10 💚3 — Luz que cura e protege",          special:null },

  // ── EQUILIBRADAS (ATK ≈ DEF) ──────────────────────────────────────────────
  { id:11, name:"Gato Dourado",         color:"#f39c12", attack:5,  defense:5,  heal:0,  abilityName:"Tesouro Mágico",      description:"⚔️5 🛡️5 — Poder equilibrado",                    special:null },
  { id:16, name:"Gato Celeste",         color:"#87ceeb", attack:5,  defense:3,  heal:0,  abilityName:"Vento Rápido",        description:"⚔️5 🛡️3 — Joga novamente!",                      special:"play_again" },
  { id:45, name:"Gato Dourado-claro",   color:"#ffd700", attack:6,  defense:6,  heal:0,  abilityName:"Tesouro Duplo",       description:"⚔️6 🛡️6 — Equilíbrio perfeito",                  special:null },
  { id:54, name:"Gato Multicolorido",   color:"#a855f7", attack:12, defense:12, heal:0,  abilityName:"Poder Arco-íris",     description:"⚔️12 🛡️12 — Poder absoluto do arco-íris",        special:null },

  // ── DE CURA (heal + ATK/DEF moderados) ───────────────────────────────────
  { id:3,  name:"Gato Verde",           color:"#2ecc71", attack:2,  defense:3,  heal:3,  abilityName:"Cura Leve",           description:"⚔️2 🛡️3 💚3 — Pequena recuperação",              special:null },
  { id:8,  name:"Gato Branco",          color:"#dfe6e9", attack:3,  defense:6,  heal:2,  abilityName:"Luz Divina",          description:"⚔️3 🛡️6 💚2 — Defende e regenera",              special:null },
  { id:19, name:"Gato Pastel",          color:"#ffb3de", attack:3,  defense:5,  heal:2,  abilityName:"Aura Suave",          description:"⚔️3 🛡️5 💚2 — Energia suave",                    special:null },
  { id:23, name:"Gato Jade",            color:"#00a86b", attack:2,  defense:3,  heal:5,  abilityName:"Cura Média",          description:"⚔️2 🛡️3 💚5 — Cura significativa",              special:null },
  { id:26, name:"Gato Esmeralda",       color:"#50c878", attack:5,  defense:3,  heal:4,  abilityName:"Natureza Viva",       description:"⚔️5 🛡️3 💚4 — Ataca e regenera",                special:null },
  { id:29, name:"Gato Pérola",          color:"#f0ead6", attack:3,  defense:6,  heal:3,  abilityName:"Proteção Divina",     description:"⚔️3 🛡️6 💚3 — Escudo sagrado e cura",           special:null },
  { id:39, name:"Gato Amarelo-claro",   color:"#ffe066", attack:6,  defense:3,  heal:2,  abilityName:"Luz Solar",           description:"⚔️6 🛡️3 💚2 — Sol que ataca e restaura",        special:null },
  { id:41, name:"Gato Branco-prateado", color:"#c0c0c0", attack:3,  defense:7,  heal:2,  abilityName:"Pureza",              description:"⚔️3 🛡️7 💚2 — Pureza defensiva",                special:null },
  { id:42, name:"Gato Verde-musgo",     color:"#6b8e5e", attack:2,  defense:3,  heal:6,  abilityName:"Regeneração",         description:"⚔️2 🛡️3 💚6 — Grande regeneração",              special:null },
  { id:47, name:"Gato Marrom-claro",    color:"#c4a882", attack:3,  defense:5,  heal:2,  abilityName:"Terra Suave",         description:"⚔️3 🛡️5 💚2 — Solo fértil que cura",            special:null },
  { id:49, name:"Gato Verde-escuro",    color:"#006400", attack:2,  defense:3,  heal:8,  abilityName:"Cura Suprema",        description:"⚔️2 🛡️3 💚8 — A maior cura do jogo",            special:null },

  // ── ESPECIAIS ─────────────────────────────────────────────────────────────
  { id:5,  name:"Gato Roxo",            color:"#9b59b6", attack:5,  defense:3,  heal:0,  abilityName:"Magia Sombria",       description:"⚔️5 🛡️3 — Remove 3 do escudo inimigo",          special:"reduce_enemy_defense" },
  { id:7,  name:"Gato Preto",           color:"#2c3e50", attack:3,  defense:4,  heal:0,  abilityName:"Invisibilidade",      description:"⚔️3 🛡️4 — Bloqueia 1 ataque futuro",            special:"block_one_attack" },
  { id:10, name:"Gato Rosa",            color:"#e91e8c", attack:4,  defense:3,  heal:0,  abilityName:"Encanto",             description:"⚔️4 🛡️3 — Confunde o oponente (1 turno)",       special:"confuse_1" },
  { id:12, name:"Gato Prateado",        color:"#bdc3c7", attack:3,  defense:5,  heal:0,  abilityName:"Reflexo",             description:"⚔️3 🛡️5 — Reflete 2 dano de volta",             special:"reflect_2" },
  { id:15, name:"Gato Bege",            color:"#c8a87e", attack:2,  defense:4,  heal:0,  abilityName:"Camuflagem",          description:"⚔️2 🛡️4 — Evita 1 dano no próximo ataque",      special:"avoid_1_damage" },
  { id:21, name:"Gato Índigo",          color:"#4b0082", attack:6,  defense:3,  heal:0,  abilityName:"Mistério",            description:"⚔️6 🛡️3 — Oponente perde próximo turno",        special:"skip_enemy_turn" },
  { id:32, name:"Gato Platina",         color:"#e5e4e2", attack:3,  defense:8,  heal:0,  abilityName:"Reflexo Supremo",     description:"⚔️3 🛡️8 — Reflete 3 dano de volta",             special:"reflect_3" },
  { id:34, name:"Gato Verde-limão",     color:"#32cd32", attack:6,  defense:3,  heal:0,  abilityName:"Veneno",              description:"⚔️6 🛡️3 — Envenena: -2 pts/turno por 3 turnos", special:"poison_2" },
  { id:38, name:"Gato Rosa-claro",      color:"#ffb6c1", attack:5,  defense:3,  heal:0,  abilityName:"Encanto Duplo",       description:"⚔️5 🛡️3 — Confunde o oponente (2 turnos)",      special:"confuse_2" },
  { id:46, name:"Gato Prateado-claro",  color:"#d3d3d3", attack:4,  defense:6,  heal:0,  abilityName:"Reflexo Leve",        description:"⚔️4 🛡️6 — Reflete 1 dano de volta",             special:"reflect_1" },
  { id:53, name:"Gato Preto-neon",      color:"#0d0d0d", attack:3,  defense:5,  heal:0,  abilityName:"Invisib. Suprema",    description:"⚔️3 🛡️5 — Bloqueia 2 ataques futuros",          special:"block_two_attacks" },
  { id:55, name:"Gato Transparente",    color:"#b0b0b0", attack:0,  defense:0,  heal:0,  abilityName:"Mistério Absoluto",   description:"Copia a última carta jogada",                     special:"copy_last_card" },
];

function shuffleDeck(cards) {
  const d = [...cards];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function dealCards(deck) {
  const mid = Math.ceil(deck.length / 2);
  const p1  = deck.slice(0, mid);
  const p2  = deck.slice(mid);
  return {
    player1Hand: p1.slice(0, HAND_SIZE),
    player1Deck: p1.slice(HAND_SIZE),
    player2Hand: p2.slice(0, HAND_SIZE),
    player2Deck: p2.slice(HAND_SIZE)
  };
}
