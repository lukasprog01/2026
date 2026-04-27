// =====================================================
//  Cat Battle Cards — Admin Panel Logic
// =====================================================

const isLocal = ['localhost','127.0.0.1',''].includes(location.hostname);

async function adminLogin() {
  const pass = document.getElementById('admin-pass-input').value.trim();
  if (!pass) { showLoginError('Digite a senha!'); return; }

  const snap   = await db.ref('pixConfig').once('value');
  const config = snap.val() || {};
  const stored = config.adminPass || 'admin123';

  if (pass !== stored) { showLoginError('Senha incorreta!'); return; }

  document.getElementById('admin-login').style.display    = 'none';
  document.getElementById('admin-dashboard').style.display = 'block';

  if (config.key)     document.getElementById('pix-key').value      = config.key;
  if (config.keyType) document.getElementById('pix-key-type').value  = config.keyType;
  if (config.name)    document.getElementById('pix-name').value      = config.name;
  if (config.city)    document.getElementById('pix-city').value      = config.city;

  db.ref('pendingPayments').on('value', snap => {
    renderPendingPayments(snap.val() || {});
  });

  initAsaasSection(pass);
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

function adminLogout() {
  document.getElementById('admin-login').style.display    = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
  document.getElementById('admin-pass-input').value = '';
}

async function savePixConfig() {
  const key     = document.getElementById('pix-key').value.trim();
  const keyType = document.getElementById('pix-key-type').value;
  const name    = document.getElementById('pix-name').value.trim();
  const city    = document.getElementById('pix-city').value.trim();
  const newPass = document.getElementById('pix-new-pass').value.trim();

  if (!key || !name || !city) {
    showSaveMsg('Preencha Chave, Nome e Cidade!', false); return;
  }

  const snap    = await db.ref('pixConfig').once('value');
  const cur     = snap.val() || {};
  const adminPass = newPass || cur.adminPass || 'admin123';

  await db.ref('pixConfig').set({ key, keyType, name, city, adminPass });
  document.getElementById('pix-new-pass').value = '';
  showSaveMsg('✅ Configuração salva!', true);
}

function showSaveMsg(msg, ok) {
  const el = document.getElementById('pix-save-msg');
  el.textContent = msg;
  el.style.color   = ok ? '#2ecc71' : '#e74c3c';
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

function renderPendingPayments(payments) {
  const list = document.getElementById('payments-list');
  const pending = Object.entries(payments)
    .filter(([, p]) => p.status === 'pending')
    .sort(([, a], [, b]) => a.createdAt - b.createdAt);

  if (pending.length === 0) {
    list.innerHTML = '<p class="no-payments">Nenhum pagamento pendente.</p>';
    return;
  }

  list.innerHTML = pending.map(([id, p]) => {
    const time = new Date(p.createdAt).toLocaleTimeString('pt-BR');
    return `
      <div class="payment-item">
        <div class="payment-info">
          <span class="payer-name">🐱 ${esc(p.playerName)}</span>
          <span class="payer-detail">Jogo: <code>${esc(p.gameId)}</code> · ${time}</span>
          <span class="payer-amount">R$ 1,00 — Carta do Rato</span>
        </div>
        <div class="payment-btns">
          <button class="btn btn-approve" onclick="approvePayment('${id}','${esc(p.gameId)}','${esc(p.playerRole)}')">✅ Aprovar</button>
          <button class="btn btn-reject"  onclick="rejectPayment('${id}')">❌ Rejeitar</button>
        </div>
      </div>`;
  }).join('');
}

async function approvePayment(paymentId, gameId, playerRole) {
  await db.ref(`pendingPayments/${paymentId}`).update({ status: 'approved' });
  await db.ref(`games/${gameId}/${playerRole}`).update({ mouseCard: true });
}

async function rejectPayment(paymentId) {
  await db.ref(`pendingPayments/${paymentId}`).update({ status: 'rejected' });
}

// ---- Asaas Integration ----

function initAsaasSection(adminPass) {
  // Show warning if local
  if (isLocal) {
    document.getElementById('asaas-local-warn').style.display = 'block';
    return;
  }

  // Show webhook URL using the Firebase project ID
  try {
    const projectId = firebase.app().options.projectId;
    if (projectId) {
      const url = `https://us-central1-${projectId}.cloudfunctions.net/asaasWebhook`;
      document.getElementById('webhook-url-display').textContent = url;
      document.getElementById('webhook-box').style.display = 'block';
    }
  } catch (_) {}

  // Store admin pass for use in saveAsaasConfig
  window._adminPassForAsaas = adminPass;
}

async function saveAsaasConfig() {
  if (isLocal) {
    showAsaasMsg('Disponível apenas em produção.', false);
    return;
  }

  const apiKey       = document.getElementById('asaas-api-key').value.trim();
  const environment  = document.getElementById('asaas-env').value;
  const webhookToken = document.getElementById('asaas-webhook-token').value.trim();
  const adminPass    = window._adminPassForAsaas || '';

  if (!apiKey) { showAsaasMsg('Informe a API Key do Asaas.', false); return; }

  const btn = document.querySelector('[onclick="saveAsaasConfig()"]');
  btn.disabled    = true;
  btn.textContent = '⏳ Validando...';

  try {
    const fn = firebase.functions().httpsCallable('saveAdminConfig');
    await fn({ adminPass, asaasApiKey: apiKey, environment, webhookToken });

    document.getElementById('asaas-api-key').value       = '';
    document.getElementById('asaas-webhook-token').value = '';
    showAsaasMsg('✅ API Key salva com segurança! Asaas pronto.', true);
  } catch (e) {
    showAsaasMsg('❌ ' + (e.message || 'Erro desconhecido'), false);
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔐 Salvar com segurança';
  }
}

function showAsaasMsg(msg, ok) {
  const el = document.getElementById('asaas-save-msg');
  el.textContent   = msg;
  el.style.color   = ok ? '#2ecc71' : '#e74c3c';
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

function copyWebhookUrl() {
  const url = document.getElementById('webhook-url-display').textContent;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('[onclick="copyWebhookUrl()"]');
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = '📋 Copiar', 2000);
  });
}

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]
  );
}
