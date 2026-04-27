// =====================================================
//  Cat Battle Cards — Firebase Cloud Functions
// =====================================================

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');

admin.initializeApp();
const db = admin.database();

// ---- Helpers ----

async function getAdminConfig() {
  const snap = await db.ref('_adminConfig').once('value');
  return snap.val() || {};
}

async function getAdminPass() {
  const snap = await db.ref('pixConfig').once('value');
  return snap.val()?.adminPass || 'admin123';
}

function asaasClient(config) {
  const baseURL = config.environment === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
  return axios.create({
    baseURL,
    headers: { 'access_token': config.asaasApiKey }
  });
}

// =====================================================
//  saveAdminConfig
//  Chamado pelo admin para salvar a API Key do Asaas.
//  A chave fica em _adminConfig — bloqueada por regras
//  do banco e nunca exposta ao cliente.
// =====================================================
exports.saveAdminConfig = functions.https.onCall(async (data) => {
  const { adminPass, asaasApiKey, environment, webhookToken } = data;

  // Valida senha
  const storedPass = await getAdminPass();
  if (!adminPass || adminPass !== storedPass) {
    throw new functions.https.HttpsError('permission-denied', 'Senha incorreta.');
  }

  if (!asaasApiKey) {
    throw new functions.https.HttpsError('invalid-argument', 'API Key obrigatória.');
  }

  // Verifica se a chave é válida pingando o Asaas
  const client = asaasClient({ asaasApiKey, environment: environment || 'sandbox' });
  try {
    await client.get('/myAccount');
  } catch (e) {
    const msg = e.response?.data?.errors?.[0]?.description || e.message;
    throw new functions.https.HttpsError('invalid-argument', 'API Key inválida: ' + msg);
  }

  await db.ref('_adminConfig').set({
    asaasApiKey,
    environment:    environment    || 'sandbox',
    webhookToken:   webhookToken   || '',
    updatedAt:      Date.now()
  });

  return { success: true };
});

// =====================================================
//  createPixCharge
//  Cria a cobrança PIX no Asaas e devolve o QR code.
//  Armazena o pendingPayment no Firebase.
// =====================================================
exports.createPixCharge = functions.https.onCall(async (data) => {
  const { gameId, playerRole, playerName } = data;
  if (!gameId || !playerRole || !playerName) {
    throw new functions.https.HttpsError('invalid-argument', 'Dados incompletos.');
  }

  const config = await getAdminConfig();
  if (!config.asaasApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Asaas não configurado.');
  }

  const api = asaasClient(config);

  // Cria ou reutiliza cliente no Asaas
  let customerId;
  try {
    const search = await api.get('/customers', { params: { externalReference: gameId } });
    if (search.data.data.length > 0) {
      customerId = search.data.data[0].id;
    } else {
      const c = await api.post('/customers', {
        name:              playerName,
        externalReference: gameId
      });
      customerId = c.data.id;
    }
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Erro ao criar cliente: ' + (e.response?.data?.errors?.[0]?.description || e.message));
  }

  // Cria cobrança PIX
  const due = new Date();
  due.setDate(due.getDate() + 1);

  let chargeId;
  try {
    const charge = await api.post('/payments', {
      customer:          customerId,
      billingType:       'PIX',
      value:             1.00,
      dueDate:           due.toISOString().split('T')[0],
      description:       `Carta do Rato — Jogo ${gameId}`,
      externalReference: `${gameId}__${playerRole}`
    });
    chargeId = charge.data.id;
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Erro ao criar cobrança: ' + (e.response?.data?.errors?.[0]?.description || e.message));
  }

  // Obtém QR Code PIX
  let qrCode, qrCodeText;
  try {
    const pix = await api.get(`/payments/${chargeId}/pixQrCode`);
    qrCode     = pix.data.encodedImage; // base64
    qrCodeText = pix.data.payload;      // copia-e-cola
  } catch (e) {
    throw new functions.https.HttpsError('internal', 'Erro ao gerar QR Code: ' + e.message);
  }

  // Grava pagamento pendente no Firebase
  const paymentId = `${gameId}_${playerRole}_${Date.now()}`;
  await db.ref(`pendingPayments/${paymentId}`).set({
    gameId,
    playerRole,
    playerName,
    asaasId:   chargeId,
    status:    'pending',
    createdAt: Date.now()
  });

  return { paymentId, qrCode, qrCodeText };
});

// =====================================================
//  asaasWebhook
//  Recebe notificações do Asaas e aprova o pagamento
//  automaticamente ao confirmar o PIX.
// =====================================================
exports.asaasWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  // Valida token opcional (configure em Integrações → Webhooks → Chave de autenticação)
  const config = await getAdminConfig();
  if (config.webhookToken) {
    const token = req.headers['asaas-access-token'] || req.headers['authorization'];
    if (token !== config.webhookToken) {
      res.status(401).send('Unauthorized');
      return;
    }
  }

  const event = req.body;
  const type  = event?.event;

  // Só processa pagamento confirmado
  if (type !== 'PAYMENT_CONFIRMED' && type !== 'PAYMENT_RECEIVED') {
    res.status(200).send('ignored');
    return;
  }

  const asaasId = event.payment?.id;
  if (!asaasId) { res.status(200).send('no id'); return; }

  // Encontra o pendingPayment correspondente pelo asaasId
  const snap = await db.ref('pendingPayments')
    .orderByChild('asaasId').equalTo(asaasId)
    .once('value');

  if (!snap.exists()) { res.status(200).send('not found'); return; }

  const entries = Object.entries(snap.val());
  for (const [paymentId, payment] of entries) {
    if (payment.status === 'pending') {
      await db.ref(`pendingPayments/${paymentId}`).update({ status: 'approved' });
      await db.ref(`games/${payment.gameId}/${payment.playerRole}`).update({ mouseCard: true });
    }
  }

  res.status(200).send('ok');
});
