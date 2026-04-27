// =====================================================
//  CONFIGURAÇÃO DO FIREBASE
//  1. Acesse: https://console.firebase.google.com/
//  2. Crie um novo projeto (ex: "catbattlecards")
//  3. Vá em "Realtime Database" → Criar banco de dados
//  4. Escolha região e modo "iniciar em modo de teste"
//  5. Vá em Configurações do projeto → Seus apps → Web (</> )
//  6. Copie os valores do firebaseConfig abaixo
// =====================================================

const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  databaseURL: "https://SEU_PROJETO-default-rtdb.firebaseio.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
