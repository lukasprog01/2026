// =====================================================
//  Cat Battle Cards — Game Engine
// =====================================================

const MAX_SCORE = 100;

let gameId   = null;
let myRole   = null;   // 'player1' | 'player2'
let myName   = '';
let gameRef  = null;
let gameState = null;
let selectedCardIndex = null;
let isMyTurn = false;
let battleFieldTimer      = null;
let battleFieldFading     = false;
let battleFieldWinnerRole = null;

// ---- Utilities ----

function generateGameId() {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}
function getGameIdFromURL() {
  return new URLSearchParams(window.location.search).get('game');
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ---- Lobby (index.html) ----

function initLobby() {
  const gameIdInURL = getGameIdFromURL();

  if (gameIdInURL) {
    document.getElementById('create-section').style.display = 'none';
    document.getElementById('join-section').style.display   = 'flex';
    document.getElementById('join-game-id').textContent     = gameIdInURL;
    document.getElementById('btn-accept').addEventListener('click', () => {
      const name = document.getElementById('join-name').value.trim();
      if (!name) { showLobbyError('Digite seu nome!'); return; }
      joinGame(gameIdInURL, name);
    });
  } else {
    document.getElementById('create-section').style.display = 'flex';
    document.getElementById('join-section').style.display   = 'none';
    document.getElementById('btn-create').addEventListener('click', () => {
      const name = document.getElementById('create-name').value.trim();
      if (!name) { showLobbyError('Digite seu nome!'); return; }
      createGame(name);
    });
  }
}

function showLobbyError(msg) {
  const el = document.getElementById('lobby-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

async function createGame(name) {
  const id = generateGameId();
  const shuffled = shuffleDeck(CARDS);
  const { player1Hand, player1Deck, player2Hand, player2Deck } = dealCards(shuffled);

  const state = {
    status: 'waiting',
    _created: Date.now(),
    player1: { name, score: MAX_SCORE, hand: player1Hand, deck: player1Deck, shield: 0, blockAttacks: 0, poisoned: 0, confused: 0, skipTurn: 0, mouseCard: false },
    player2: { name: '', score: MAX_SCORE, hand: player2Hand, deck: player2Deck, shield: 0, blockAttacks: 0, poisoned: 0, confused: 0, skipTurn: 0, mouseCard: false },
    currentTurn: 'player1',
    lastAction: null,
    lastPlayedCards: { player1: null, player2: null },
    winner: null
  };

  await db.ref(`games/${id}`).set(state);

  sessionStorage.setItem('gameId', id);
  sessionStorage.setItem('role', 'player1');
  sessionStorage.setItem('name', name);

  document.getElementById('create-section').style.display  = 'none';
  document.getElementById('waiting-section').style.display = 'flex';

  const link = `${window.location.origin}${window.location.pathname}?game=${id}`;
  document.getElementById('battle-link').value = link;
  const badge = document.getElementById('battle-link-id');
  if (badge) badge.textContent = id;

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(link).then(() => {
      document.getElementById('btn-copy-link').textContent = '✅ Copiado!';
      setTimeout(() => document.getElementById('btn-copy-link').textContent = '📋 Copiar link', 2000);
    });
  });

  const redirectToGame = () => {
    window.location.href = `game.html?game=${id}&role=player1&name=${encodeURIComponent(name)}`;
  };

  // Primary: listener on full game ref (fires on any change)
  db.ref(`games/${id}`).on('value', snap => {
    if (snap.exists() && snap.val()?.status === 'playing') {
      redirectToGame();
    }
  });

  // Fallback: poll every 500ms in case BroadcastChannel misses a message
  const poll = setInterval(async () => {
    const s = await db.ref(`games/${id}/status`).once('value');
    if (s.val() === 'playing') {
      clearInterval(poll);
      redirectToGame();
    }
  }, 500);
}

async function joinGame(id, name) {
  const snap = await db.ref(`games/${id}`).once('value');
  if (!snap.exists()) { showLobbyError('Batalha não encontrada!'); return; }
  const state = snap.val();
  if (state.status !== 'waiting') { showLobbyError('Esta batalha já começou!'); return; }

  // Single atomic update so player1's listener fires exactly once
  const current = snap.val();
  await db.ref(`games/${id}`).update({
    status: 'playing',
    player2: { ...current.player2, name }
  });

  window.location.href = `game.html?game=${id}&role=player2&name=${encodeURIComponent(name)}`;
}

// ---- Game Board (game.html) ----

function initGame() {
  const params = new URLSearchParams(window.location.search);
  gameId  = params.get('game');
  myRole  = params.get('role');
  myName  = decodeURIComponent(params.get('name') || '');

  if (!gameId || !myRole) { window.location.href = 'index.html'; return; }

  gameRef = db.ref(`games/${gameId}`);
  gameRef.on('value', snap => {
    if (!snap.exists()) return;
    gameState = snap.val();
    window.renderGame();
  });
}

// ---- Render ----

function renderGame() {
  if (!gameState) return;

  const enemyRole = myRole === 'player1' ? 'player2' : 'player1';
  const me    = gameState[myRole]    || {};
  const enemy = gameState[enemyRole] || {};

  // Scores
  document.getElementById('my-score').textContent    = me.score    ?? 100;
  document.getElementById('enemy-score').textContent = enemy.score ?? 100;
  document.getElementById('my-name-display').textContent    = me.name    || myName;
  document.getElementById('enemy-name-display').textContent = enemy.name || 'Oponente';

  const myPct    = clamp((me.score    / MAX_SCORE) * 100, 0, 100);
  const enemyPct = clamp((enemy.score / MAX_SCORE) * 100, 0, 100);
  document.getElementById('my-score-bar').style.width    = myPct    + '%';
  document.getElementById('enemy-score-bar').style.width = enemyPct + '%';

  // Turn
  isMyTurn = gameState.currentTurn === myRole;
  const turnEl = document.getElementById('turn-indicator');
  if (gameState.winner) {
    const win = gameState.winner === myRole;
    turnEl.textContent = win ? '🏆 Você venceu!' : '💀 Você perdeu!';
    turnEl.className = 'turn-indicator ' + (win ? 'win' : 'lose');
  } else if (me.skipTurn > 0 && isMyTurn) {
    turnEl.textContent = '⏸️ Seu turno foi pulado!';
    turnEl.className = 'turn-indicator skip';
  } else {
    turnEl.textContent = isMyTurn ? '⚔️ Seu turno!' : '⏳ Vez do oponente...';
    turnEl.className = 'turn-indicator ' + (isMyTurn ? 'my-turn' : 'enemy-turn');
  }

  // Effects
  renderStatusEffects(me,    'my-effects');
  renderStatusEffects(enemy, 'enemy-effects');

  // Deck counters
  const myDeckCount    = (me.deck    || []).length;
  const enemyDeckCount = (enemy.deck || []).length;
  const myHandCount    = (me.hand    || []).length;
  const enemyHandCount = (enemy.hand || []).length;

  setEl('my-deck-badge',    `📦 Baralho: ${myDeckCount}`);
  setEl('enemy-deck-badge', `📦 Baralho: ${enemyDeckCount}`);
  setEl('cards-remaining',  `🐱 ${myHandCount} vs ${enemyHandCount}`);

  // Hands
  renderHand(me.hand    || [], 'my-hand',    true);
  renderHand(enemy.hand || [], 'enemy-hand', false);

  // Battle field
  renderBattleField();

  // Action log
  if (gameState.lastAction) {
    document.getElementById('action-log').innerHTML = gameState.lastAction;
  }

  // Play button
  const playBtn = document.getElementById('btn-play-card');
  if (playBtn) {
    playBtn.disabled = !isMyTurn || selectedCardIndex === null || !!gameState.winner || (me.skipTurn > 0);
  }

  // Mouse card UI
  renderMouseCardUI(me, enemy);

  // Skip turn auto-advance
  checkSkipTurn();

  // Win screen
  if (gameState.winner) window.showEndScreen();
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderStatusEffects(player, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const fx = [];
  if (player.poisoned    > 0) fx.push(`☠️ Veneno (${player.poisoned} turnos)`);
  if (player.confused    > 0) fx.push(`😵 Confuso (${player.confused})`);
  if (player.skipTurn    > 0) fx.push(`⏸️ Turno pulado`);
  if (player.blockAttacks> 0) fx.push(`🛡️ Bloqueio (${player.blockAttacks})`);
  if (player.shield      > 0) fx.push(`🔰 Escudo: ${player.shield}`);
  el.innerHTML = fx.map(t => `<span class="effect-tag">${t}</span>`).join('');
}

function renderMouseCardUI(me, enemy) {
  const enemyRole = myRole === 'player1' ? 'player2' : 'player1';
  const buyBtn      = document.getElementById('btn-buy-mouse');
  const activeBadge = document.getElementById('mouse-active-badge');
  const enemyBadge  = document.getElementById('mouse-enemy-badge');

  if (buyBtn) {
    buyBtn.disabled   = !!me.mouseCard || !!gameState.winner;
    buyBtn.textContent = me.mouseCard ? '🐭 Rato ativo' : '🐭 Comprar Carta do Rato (R$ 1,00)';
  }

  if (activeBadge) activeBadge.classList.toggle('visible', !!me.mouseCard);

  if (enemyBadge) {
    const en = gameState[enemyRole] || {};
    enemyBadge.style.display = en.mouseCard ? 'block' : 'none';
  }

  // Auto-close payment modal when admin approves
  const payModal = document.getElementById('payment-modal');
  if (payModal && payModal.style.display !== 'none' && me.mouseCard) {
    payModal.style.display = 'none';
    showGameMsg('🐭 Carta do Rato ativada! Próximo ataque será anulado.');
  }
}

function renderHand(hand, containerId, isMe) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  hand.forEach((card, index) => {
    if (!card) return;
    const el = document.createElement('div');
    el.className = 'card ' + (isMe ? 'my-card' : 'enemy-card');

    if (!isMe) {
      el.innerHTML = `<div class="card-back"><span class="card-back-emoji">🐱</span><span class="card-back-label">Cat Battle</span></div>`;
    } else {
      if (selectedCardIndex === index) el.classList.add('selected');

      let statsHtml = '';
      if (card.attack  > 0) statsHtml += `<span class="stat atk">⚔️ ${card.attack}</span>`;
      if (card.defense > 0) statsHtml += `<span class="stat def">🛡️ ${card.defense}</span>`;
      if (card.heal    > 0) statsHtml += `<span class="stat heal">💚 +${card.heal}</span>`;
      if (card.heal    < 0) statsHtml += `<span class="stat dmg">💔 ${card.heal}</span>`;

      el.style.setProperty('--cat-tint', card.color);

      el.innerHTML = `
        <div class="card-image">${generateCatSVG(card)}</div>
        <div class="card-info">
          <div class="card-name">${card.name}</div>
          <div class="card-stats">${statsHtml}</div>
          <div class="card-ability-name">${card.abilityName}</div>
        </div>`;

      el.addEventListener('click', () => {
        if (!isMyTurn || gameState.winner) return;
        selectedCardIndex = selectedCardIndex === index ? null : index;
        renderHand(hand, containerId, true);
        const pb = document.getElementById('btn-play-card');
        if (pb) pb.disabled = selectedCardIndex === null;
      });
    }
    container.appendChild(el);
  });
}

function renderBattleField() {
  if (battleFieldFading) return;

  const lpc          = gameState.lastPlayedCards  || {};
  const lastPlayedAt = gameState.lastPlayedAt     || 0;
  const winnerRole   = gameState.lastPlayedWinner || null;
  const SHOW_MS      = 2500;
  const elapsed      = Date.now() - lastPlayedAt;
  const enemyRole    = myRole === 'player1' ? 'player2' : 'player1';

  if (lastPlayedAt > 0 && elapsed < SHOW_MS) {
    battleFieldWinnerRole = null; // new play resets winner tracking
    renderBattleSlot('battle-slot-enemy', lpc[enemyRole], 'enemy-bc', 'Última carta<br>do oponente');
    renderBattleSlot('battle-slot-mine',  lpc[myRole],   'mine-bc',  'Sua última<br>carta');

    if (battleFieldTimer) clearTimeout(battleFieldTimer);
    battleFieldTimer = setTimeout(() => {
      battleFieldFading = true;
      const slotE = document.getElementById('battle-slot-enemy');
      const slotM = document.getElementById('battle-slot-mine');

      const fadeEnemy = winnerRole !== enemyRole;
      const fadeMine  = winnerRole !== myRole;

      if (fadeEnemy && slotE) slotE.classList.add('battle-slot-exiting');
      if (fadeMine  && slotM) slotM.classList.add('battle-slot-exiting');

      setTimeout(() => {
        if (fadeEnemy && slotE) { slotE.classList.remove('battle-slot-exiting'); slotE.innerHTML = '<div class="battle-slot-empty">Última carta<br>do oponente</div>'; }
        if (fadeMine  && slotM) { slotM.classList.remove('battle-slot-exiting'); slotM.innerHTML = '<div class="battle-slot-empty">Sua última<br>carta</div>'; }
        battleFieldWinnerRole = winnerRole; // winner card stays in DOM
        battleFieldTimer  = null;
        battleFieldFading = false;
      }, 450);
    }, SHOW_MS - elapsed);

  } else {
    // After show window: only clear non-winner slots
    if (battleFieldTimer) { clearTimeout(battleFieldTimer); battleFieldTimer = null; }
    if (battleFieldWinnerRole !== enemyRole) {
      renderBattleSlot('battle-slot-enemy', null, 'enemy-bc', 'Última carta<br>do oponente');
    }
    if (battleFieldWinnerRole !== myRole) {
      renderBattleSlot('battle-slot-mine', null, 'mine-bc', 'Sua última<br>carta');
    }
  }
}

function renderBattleSlot(slotId, card, colorClass, emptyLabel) {
  const slot = document.getElementById(slotId);
  if (!slot) return;

  if (!card) {
    slot.innerHTML = `<div class="battle-slot-empty">${emptyLabel}</div>`;
    return;
  }

  let statsHtml = '';
  if (card.attack  > 0) statsHtml += `<span class="stat atk">⚔️ ${card.attack}</span>`;
  if (card.defense > 0) statsHtml += `<span class="stat def">🛡️ ${card.defense}</span>`;
  if (card.heal    > 0) statsHtml += `<span class="stat heal">💚 +${card.heal}</span>`;
  if (card.heal    < 0) statsHtml += `<span class="stat dmg">💔 ${card.heal}</span>`;

  slot.innerHTML = `
    <div class="battle-card ${colorClass}" style="--cat-tint:${card.color}">
      <div class="card-image">${generateCatSVG(card)}</div>
      <div class="card-info">
        <div class="card-name">${card.name}</div>
        <div class="card-stats">${statsHtml}</div>
        <div class="card-ability-name">${card.abilityName}</div>
      </div>
    </div>`;
}

// ---- Buy Mouse Card (PIX flow) ----

const _isLocal = ['localhost','127.0.0.1',''].includes(location.hostname);

async function buyMouseCard() {
  if (!gameState || gameState.winner) return;
  const me = gameState[myRole];
  if (me.mouseCard) { showGameMsg('Você já tem a Carta do Rato!'); return; }

  // Verifica se já há pagamento pendente
  const snap = await db.ref('pendingPayments').once('value');
  const payments = snap.val() || {};
  const hasPending = Object.values(payments).some(p =>
    p.gameId === gameId && p.playerRole === myRole && p.status === 'pending'
  );
  if (hasPending) { openPaymentModal('waiting'); return; }

  if (_isLocal) {
    // Modo local: fluxo manual com chave PIX configurada no admin
    const pixSnap = await db.ref('pixConfig').once('value');
    const pix = pixSnap.val();
    if (!pix || !pix.key) { showGameMsg('PIX não configurado no admin.'); return; }
    openPaymentModal('pix', pix);
  } else {
    // Produção: Cloud Function cria a cobrança no Asaas automaticamente
    openPaymentModal('loading');
    try {
      const createCharge = firebase.functions().httpsCallable('createPixCharge');
      const result = await createCharge({ gameId, playerRole: myRole, playerName: me.name });
      openPaymentModal('pix-asaas', result.data);
    } catch (e) {
      closePaymentModal();
      showGameMsg('Erro ao criar cobrança: ' + (e.message || 'tente novamente'));
    }
  }
}

function openPaymentModal(step, data) {
  const modal = document.getElementById('payment-modal');
  modal.style.display = 'flex';

  ['payment-step-loading','payment-step-pix','payment-step-waiting'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (step === 'loading') {
    document.getElementById('payment-step-loading').style.display = 'block';
    return;
  }
  if (step === 'waiting') {
    document.getElementById('payment-step-waiting').style.display = 'block';
    return;
  }

  document.getElementById('payment-step-pix').style.display = 'block';
  const confirmBtn = document.getElementById('payment-confirm-btn');

  if (step === 'pix' && data) {
    // Modo local: QR gerado a partir da chave PIX configurada
    const payload = generatePixPayload(data.key, data.name, data.city, 1.00, gameId);
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payload)}&size=200x200&margin=10`;
    document.getElementById('pix-qr-img').src              = qrUrl;
    document.getElementById('pix-key-display').textContent = data.key;
    if (confirmBtn) confirmBtn.style.display = 'block';
  }

  if (step === 'pix-asaas' && data) {
    // Produção: QR code real gerado pelo Asaas (base64)
    const img = document.getElementById('pix-qr-img');
    img.src = data.qrCode ? `data:image/png;base64,${data.qrCode}` : '';
    document.getElementById('pix-key-display').textContent = data.qrCodeText || '';
    // No fluxo automático não precisa clicar — pagamento confirma pelo webhook
    if (confirmBtn) confirmBtn.style.display = 'none';
  }
}

function generatePixPayload(key, name, city, amount, txRef) {
  function f(id, val) { return `${id}${String(val.length).padStart(2,'0')}${val}`; }
  const txid        = (txRef + '0000000000000000000000000').substring(0, 25);
  const merchantInfo = f('00','BR.GOV.BCB.PIX') + f('01', key);
  let payload = '000201' +
    f('26', merchantInfo) +
    '52040000' + '5303986' +
    f('54', amount.toFixed(2)) +
    '5802BR' +
    f('59', name.substring(0,25)) +
    f('60', (city || 'Brasil').substring(0,15)) +
    f('62', f('05', txid)) +
    '6304';
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    crc &= 0xFFFF;
  }
  return payload + crc.toString(16).toUpperCase().padStart(4,'0');
}

async function confirmPayment() {
  const me = gameState[myRole];
  const paymentId = `${gameId}_${myRole}_${Date.now()}`;
  await db.ref(`pendingPayments/${paymentId}`).set({
    gameId,
    playerRole: myRole,
    playerName: me.name,
    status:     'pending',
    createdAt:  Date.now()
  });
  document.getElementById('payment-step-pix').style.display     = 'none';
  document.getElementById('payment-step-waiting').style.display = 'block';

  // Watch only for rejection; approval is handled by the main game listener
  db.ref(`pendingPayments/${paymentId}`).on('value', snap => {
    if (!snap.exists()) return;
    if (snap.val().status === 'rejected') {
      closePaymentModal();
      showGameMsg('❌ Pagamento não confirmado. Tente novamente.');
    }
  });
}

function closePaymentModal() {
  document.getElementById('payment-modal').style.display = 'none';
}

function copyPixKey() {
  const key = document.getElementById('pix-key-display').textContent;
  navigator.clipboard.writeText(key).then(() => {
    const btn = document.getElementById('btn-copy-pix');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar', 2000);
  });
}

function showGameMsg(msg) {
  const el = document.getElementById('action-log');
  if (el) { el.innerHTML = `<span style="color:var(--accent)">${msg}</span>`; }
}

// ---- Play Card ----

async function playCard() {
  if (!isMyTurn || selectedCardIndex === null || !gameState || gameState.winner) return;

  const me        = { ...gameState[myRole] };
  const enemyRole = myRole === 'player1' ? 'player2' : 'player1';
  const enemy     = { ...gameState[enemyRole] };

  const hand    = [...(me.hand || [])];
  const myDeck  = [...(me.deck || [])];

  if (selectedCardIndex >= hand.length) return;

  const card = hand.splice(selectedCardIndex, 1)[0];
  selectedCardIndex = null;

  // Auto-draw from deck
  if (myDeck.length > 0) hand.push(myDeck.shift());
  me.deck = myDeck;

  let logLines  = [];
  let playAgain = false;
  let lastCard  = card;

  // Resolve copy ability
  let actualCard = card;
  if (card.special === 'copy_last_card') {
    const lpc = gameState.lastPlayedCards || {};
    const prev = lpc[myRole] || lpc[enemyRole];
    if (prev && prev.id !== 'mouse') {
      actualCard = { ...prev };
      logLines.push(`👻 <b>${me.name}</b> copia <b>${prev.name}</b>!`);
    } else {
      logLines.push(`👻 <b>${me.name}</b> usa Mistério Absoluto — sem carta para copiar.`);
    }
  }

  logLines.push(`🐱 <b>${me.name}</b> jogou <b>${card.name}</b> — ${actualCard.abilityName}!`);

  // Confusion miss
  if (me.confused > 0) {
    me.confused = Math.max(0, me.confused - 1);
    if (Math.random() < 0.5) {
      logLines.push(`😵 <b>${me.name}</b> está confuso e errou!`);
      await applyTurnEnd(me, enemy, hand, enemyRole, logLines, lastCard, false, null);
      return;
    }
  }

  let rawAtk  = actualCard.attack  || 0;
  let rawDef  = actualCard.defense || 0;
  let rawHeal = actualCard.heal    || 0;

  // Self heal / self damage
  if (rawHeal !== 0) {
    me.score = clamp(me.score + rawHeal, 0, 150);
    logLines.push(rawHeal > 0
      ? `💚 <b>${me.name}</b> recuperou ${rawHeal} pts!`
      : `💔 <b>${me.name}</b> perdeu ${Math.abs(rawHeal)} pts!`);
  }

  // Self reduce defense (Fúria)
  if (actualCard.special === 'self_reduce_defense') {
    me.shield = Math.max(0, (me.shield || 0) - 2);
    logLines.push(`⚠️ Fúria reduz 2 de escudo de <b>${me.name}</b>!`);
  }

  // Shield gain
  if (rawDef > 0) {
    me.shield = (me.shield || 0) + rawDef;
    logLines.push(`🛡️ <b>${me.name}</b> ganhou ${rawDef} de escudo!`);
  }

  // Block effects
  if (actualCard.special === 'block_one_attack') {
    me.blockAttacks = (me.blockAttacks || 0) + 1;
    logLines.push(`⚫ <b>${me.name}</b> ativou invisibilidade — 1 ataque será bloqueado!`);
  }
  if (actualCard.special === 'block_two_attacks') {
    me.blockAttacks = (me.blockAttacks || 0) + 2;
    logLines.push(`🌚 <b>${me.name}</b> ativou invisibilidade suprema — 2 ataques bloqueados!`);
  }

  // Play again
  if (actualCard.special === 'play_again') {
    playAgain = true;
    logLines.push(`🌤️ <b>${me.name}</b> ativa Vento Rápido — joga novamente!`);
  }

  // Reduce enemy defense
  if (actualCard.special === 'reduce_enemy_defense') {
    enemy.shield = Math.max(0, (enemy.shield || 0) - 2);
    logLines.push(`🟣 Magia Sombria: escudo de <b>${enemy.name}</b> -2!`);
  }

  // Avoid 1 damage
  if (actualCard.special === 'avoid_1_damage') {
    me.blockAttacks = (me.blockAttacks || 0) + 0; // no full block, just note
    logLines.push(`🏔️ <b>${me.name}</b> camuflou-se.`);
  }

  // ---- Attack ----
  let roundWinner = myRole; // default: card player "wins" the exchange visually
  if (rawAtk > 0) {
    const originalAtk = rawAtk;

    // Mouse card check
    if (enemy.mouseCard) {
      enemy.mouseCard = false;
      rawAtk = 0;
      roundWinner = enemyRole;
      logLines.push(`🐭 <b>${enemy.name}</b> usou a <b>Carta do Rato</b> e anulou o ataque!`);
    }

    // Invisibility block
    if (rawAtk > 0 && (enemy.blockAttacks || 0) > 0) {
      enemy.blockAttacks -= 1;
      rawAtk = 0;
      roundWinner = enemyRole;
      logLines.push(`🛡️ <b>${enemy.name}</b> bloqueou com invisibilidade!`);
    }

    if (rawAtk > 0) {
      // Absorb by enemy shield
      const absorbed = Math.min(enemy.shield || 0, rawAtk);
      rawAtk -= absorbed;
      if (absorbed > 0) {
        enemy.shield = (enemy.shield || 0) - absorbed;
      }

      // Reflect damage back
      let reflectDmg = actualCard.special === 'reflect_3' ? 3 : actualCard.special === 'reflect_2' ? 2 : actualCard.special === 'reflect_1' ? 1 : 0;

      if (rawAtk > 0) {
        enemy.score = clamp(enemy.score - rawAtk, 0, 150);
        roundWinner = myRole;
        if (absorbed > 0) {
          logLines.push(`💥 <b>${me.name}</b> atacou com ${originalAtk} ⚔️ — 🔰 ${absorbed} absorvido — <b>${enemy.name}</b> sofreu ${rawAtk} de dano! (Score: ${enemy.score})`);
        } else {
          logLines.push(`💥 <b>${enemy.name}</b> sofreu ${rawAtk} de dano direto! (Score: ${enemy.score})`);
        }
      } else if (absorbed > 0) {
        roundWinner = enemyRole;
        logLines.push(`🔰 Escudo de <b>${enemy.name}</b> bloqueou tudo! (${originalAtk} ⚔️ vs ${absorbed} 🔰)`);
      }

      if (reflectDmg > 0) {
        const abs2 = Math.min(me.shield || 0, reflectDmg);
        reflectDmg -= abs2;
        if (reflectDmg > 0) {
          me.score = clamp(me.score - reflectDmg, 0, 150);
          logLines.push(`🔮 <b>${me.name}</b> sofreu ${reflectDmg} de dano refletido!`);
        }
      }
    }
  }

  // Special effects on enemy
  if (actualCard.special === 'skip_enemy_turn') {
    enemy.skipTurn = (enemy.skipTurn || 0) + 1;
    logLines.push(`🌌 <b>${enemy.name}</b> perderá o próximo turno!`);
  }
  if (actualCard.special === 'confuse_1') {
    enemy.confused = Math.max(enemy.confused || 0, 1);
    logLines.push(`😵 <b>${enemy.name}</b> ficou confuso por 1 turno!`);
  }
  if (actualCard.special === 'confuse_2') {
    enemy.confused = Math.max(enemy.confused || 0, 2);
    logLines.push(`💕 <b>${enemy.name}</b> ficou confuso por 2 turnos!`);
  }
  if (actualCard.special === 'poison_2') {
    enemy.poisoned = Math.max(enemy.poisoned || 0, 3);
    logLines.push(`☠️ <b>${enemy.name}</b> envenenado! Perde 2 pts/turno por 3 turnos.`);
  }

  // Tick poison on enemy
  if ((enemy.poisoned || 0) > 0) {
    enemy.score    = clamp(enemy.score - 2, 0, 150);
    enemy.poisoned = enemy.poisoned - 1;
    logLines.push(`☠️ Veneno: <b>${enemy.name}</b> -2 pts (${enemy.poisoned} turnos restantes).`);
  }

  await applyTurnEnd(me, enemy, hand, enemyRole, logLines, lastCard, playAgain, roundWinner);
}

// ---- Apply End of Turn ----

async function applyTurnEnd(me, enemy, myHand, enemyRole, logLines, lastCard, playAgain, roundWinner) {
  let winner = null;
  if (enemy.score <= 0) winner = myRole;
  else if (me.score <= 0) winner = enemyRole;

  // Cards exhausted
  const enemyState = gameState[enemyRole] || {};
  const enemyCardsLeft = (enemyState.hand || []).length + (enemyState.deck || []).length;
  const myCardsLeft    = myHand.length + (me.deck || []).length;

  if (!winner && myCardsLeft === 0 && enemyCardsLeft === 0) {
    winner = me.score >= enemy.score ? myRole : enemyRole;
    logLines.push(`🏁 Cartas esgotadas! Placar: ${me.name} (${me.score}) vs ${enemy.name} (${enemy.score}).`);
  }

  const nextTurn = playAgain ? myRole : (myRole === 'player1' ? 'player2' : 'player1');

  // Update lastPlayedCards
  const lpc = { ...(gameState.lastPlayedCards || {}), [myRole]: lastCard };

  const updates = {
    [myRole]:    { ...gameState[myRole],    ...me,    hand: myHand,           deck: me.deck },
    [enemyRole]: { ...gameState[enemyRole], ...enemy },
    currentTurn:      winner ? gameState.currentTurn : nextTurn,
    lastAction:       logLines.join('<br>'),
    lastPlayedCards:   lpc,
    lastPlayedAt:      Date.now(),
    lastPlayedWinner:  roundWinner || null,
    winner:            winner || null
  };

  selectedCardIndex = null;
  await gameRef.update(updates);
}

// ---- Skip Turn ----

async function handleSkipTurn() {
  if (!gameState) return;
  const me = { ...gameState[myRole] };
  me.skipTurn = Math.max(0, (me.skipTurn || 0) - 1);
  const nextTurn = myRole === 'player1' ? 'player2' : 'player1';

  await gameRef.update({
    [myRole]:    me,
    currentTurn: nextTurn,
    lastAction:  `⏸️ <b>${me.name}</b> perdeu o turno!`
  });
}

function checkSkipTurn() {
  if (!gameState) return;
  const skipBtn = document.getElementById('btn-skip-turn');
  const me = gameState[myRole] || {};
  if (!skipBtn) return;

  if (isMyTurn && (me.skipTurn || 0) > 0) {
    skipBtn.style.display = 'block';
    const playBtn = document.getElementById('btn-play-card');
    if (playBtn) playBtn.disabled = true;
    setTimeout(() => {
      if (gameState && (gameState[myRole]?.skipTurn || 0) > 0 && gameState.currentTurn === myRole)
        handleSkipTurn();
    }, 2000);
  } else {
    skipBtn.style.display = 'none';
  }
}

// ---- End Screen ----

function showEndScreen() {
  const overlay = document.getElementById('end-overlay');
  if (!overlay || overlay.style.display === 'flex') return;

  const isWinner  = gameState.winner === myRole;
  const enemyRole = myRole === 'player1' ? 'player2' : 'player1';
  const me    = gameState[myRole]    || {};
  const enemy = gameState[enemyRole] || {};

  document.getElementById('end-emoji').textContent = isWinner ? '🏆' : '💀';
  document.getElementById('end-title').textContent = isWinner ? '🏆 Você Venceu!' : '💀 Você Perdeu!';
  document.getElementById('end-title').className   = isWinner ? 'win-title' : 'lose-title';
  document.getElementById('end-scores').innerHTML  = `
    <div class="final-score ${myRole === gameState.winner ? 'winner-score' : ''}">
      ${me.name}: <strong>${me.score} pts</strong> ${myRole === gameState.winner ? '👑' : ''}
    </div>
    <div class="final-score ${enemyRole === gameState.winner ? 'winner-score' : ''}">
      ${enemy.name}: <strong>${enemy.score} pts</strong> ${enemyRole === gameState.winner ? '👑' : ''}
    </div>`;

  overlay.style.display = 'flex';
}

function playAgainBtn() {
  window.location.href = 'index.html';
}
