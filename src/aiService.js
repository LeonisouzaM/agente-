const db = require('./db');
const evolution = require('./evolutionService');
require('dotenv').config();

// ──────────────────────────────────────────────
//  Helper: delay
// ──────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ──────────────────────────────────────────────
//  Base URL para os arquivos estáticos
// ──────────────────────────────────────────────
function getBase() {
    return process.env.BASE_URL || 'http://localhost:3000';
}

// ──────────────────────────────────────────────
//  Timers de follow-up por usuário (em memória)
// ──────────────────────────────────────────────
const followUpTimers = {};

function cancelFollowUp(waId) {
    if (followUpTimers[waId]) {
        clearTimeout(followUpTimers[waId]);
        delete followUpTimers[waId];
        console.log(`[FollowUp] Timer cancelado para ${waId}`);
    }
}

function scheduleFollowUp(waId) {
    cancelFollowUp(waId);

    // Primeiro lembrete: após 30 minutos
    followUpTimers[waId] = setTimeout(async () => {
        try {
            const stage = await db.getStage(waId);
            // Só envia se o usuário ainda está aguardando pagamento
            if (stage === 'aguardando_pagamento') {
                console.log(`[FollowUp] Enviando lembrete 1 para ${waId}`);
                await evolution.sendText(waId, 'Amiga, não consegui identificar o seu pagamento conforme combinamos, teria algum comprovante para me mandar?');
                await db.setStage(waId, 'followup_1');

                // Segundo lembrete: após mais 60 minutos
                followUpTimers[waId] = setTimeout(async () => {
                    try {
                        const stage2 = await db.getStage(waId);
                        if (stage2 === 'followup_1') {
                            console.log(`[FollowUp] Enviando lembrete 2 para ${waId}`);
                            const pixKey = process.env.PIX_KEY || 'COLE_SUA_CHAVE_PIX_AQUI';
                            const msg2 = `Passando rapidinho para lembrar com muito carinho sobre a contribuição simbólica de R$10 pelas receitas que preparei com tanto amor. 💚\n\nEsse valor ajuda a manter o projeto vivo e me motiva a continuar criando conteúdos especiais para você e todos que acompanham. ✨\n\nCHAVE PIX\n\nNome: Leoni de Souza Machado Medeiros (Financeiro)\nBanco: NU PAGAMENTOS\nPIX E-MAIL 👇\n${pixKey}`;
                            await evolution.sendText(waId, msg2);
                        }
                    } catch (e) {
                        console.error('[FollowUp] Erro no lembrete 2:', e);
                    }
                }, 60 * 60 * 1000); // 60 minutos
            }
        } catch (e) {
            console.error('[FollowUp] Erro no lembrete 1:', e);
        }
    }, 30 * 60 * 1000); // 30 minutos
}

// ──────────────────────────────────────────────
//  ETAPA 1 — Saudação inicial
// ──────────────────────────────────────────────
async function etapa1_saudacao(waId) {
    const msg = '✨ Oii, amada tudo bem?! Sou a Laura, e fico feliz em saber que você quer conhecer nossas deliciosas receitas!';
    await evolution.sendText(waId, msg);
    await sleep(2000);
    // Avança automaticamente para a proposta sem precisar que o cliente responda
    await etapa2_proposta(waId);
}

// ──────────────────────────────────────────────
//  ETAPA 2 — Áudio de apresentação + Proposta
// ──────────────────────────────────────────────
async function etapa2_proposta(waId) {
    const base = getBase();

    // Áudio 1
    await evolution.sendAudio(waId, `${base}/public/AUDIO-2026-03-30-20-29-17.m4a`);
    await sleep(3000);

    // IMG 1 com texto da proposta
    const textoProposta = `Conteúdo Completo | Por Apenas 10,99!!! 🫰🥳💰\n\nApostilas Completas 🔥 Receitas👩🏻‍🎓 ❤️📲🍰 \n✅ 120 Receita de Caseirinhos\n✅ Apostila com 100 Recheios irresistíveis\n✅ Recheios Que Não Vão ao Fogo\n✅ Panetones Recheados \n✅ Fatias de Sucesso\n\n✅ Apostila Bolos  com Mais de 100 receitas\n✅ Apostila Coberturas Magníficas\n✅ Apostila Massa Magnífica\n✅ Apostila Brigadeiros Lucrativos\n✅ Apostila Massa Perfeitas\n✅ Apostila Lucrando com Bolo Vulcão\n✅ Apostila Donuts \n✅ Apostila Brigadeiros \n✅ Apostila Trufas\n✅ Apostila Doce\n✅ Tabela de Precificação Profissional\n✅ Apostila Mestre das Massas\n✅ Apostila Bolos de Pote\n✅ Pacote com 100 Modelos de Forminhas Personalizadas\n✅ Pacote de Etiquetas \n✅ Acesso vitalício + todas as atualizações futuras \n🎂 Domine a Confeitaria com o Plano Completo 🎂`;
    await evolution.sendImage(waId, `${base}/public/IMG1.jpg`, textoProposta);
    await sleep(3000);

    // VIDEO 1
    const textoVideo = `💰 APRENDA TUDO ISSO 💥 POR APENAS R$10,99 VALOR UNICO!💥\n\nPara mostrar nossa confiança e compromisso, enviamos todo conteúdo após receber voce efetua o pagamento.`;
    await evolution.sendVideo(waId, `${base}/public/VIDEO1.mp4`, textoVideo);
    await sleep(3000);

    // Texto ATENÇÃO / confiança
    const textoConfianca = `ATENÇÃO\n\n🔔 O PIX PRECISA SER FEITO LOGO APÓS RECEBER AS RECEITAS🔔\n\nPodemos confiar em você  na sua palavra e na sua honestidade para realizar o pagamento via PIX de R$ 10,99  imediatamente após receber seu material?\n\n💛 CONFIO NA SUA INTEGRIDADE`;
    await evolution.sendText(waId, textoConfianca);
    await sleep(2000);

    await evolution.sendText(waId, '❤️ Pode ser?');
    await db.setStage(waId, 'aguardando_confirmacao_material');
}

// ──────────────────────────────────────────────
//  ETAPA 3 — Envia os materiais (PDFs + link)
// ──────────────────────────────────────────────
async function etapa3_material(waId) {
    const base = getBase();

    await evolution.sendText(waId, '🥰Certo, Agora eu vou enviar os conteúdos pra você, só peço que se comprometa a fazer o PIX depois para não prejudicar o meu trabalho, ta?\n\nAgora eu Conto com a sua honestidade.');
    await sleep(2000);

    // PDFs (todos os arquivos na pasta public)
    const pdfs = [
        { file: 'PANETONES E CHOCOTONES.pdf',           name: 'PANETONES E CHOCOTONES.pdf' },
        { file: '50 RECEITA DE MASSA DE BOLO.pdf',      name: '50 RECEITA DE MASSA DE BOLO.pdf' },
        { file: '120 RECEITAS DE CASEIRINHOS 2026.pdf', name: '120 RECEITAS DE CASEIRINHOS 2026.pdf' },
        { file: 'Ebook Creme Ninho 2026.pdf',           name: 'Ebook Creme Ninho 2026.pdf' },
        { file: 'Fatias Gourmet.pdf',                   name: 'Fatias Gourmet.pdf' },
        { file: '100 RECEITAS DE RECHEIO.pdf',          name: '100 RECEITAS DE RECHEIO.pdf' },
        { file: 'BRIGADEIROS SEM FOGO.pdf',             name: 'BRIGADEIROS SEM FOGO.pdf' },
        { file: 'RECEITAS LUCRATIVAS.pdf',              name: 'RECEITAS LUCRATIVAS.pdf' },
        { file: 'DONUTS.pdf',                           name: 'DONUTS.pdf' },
        { file: 'PRECIFICAÇÃO.pdf',                     name: 'PRECIFICAÇÃO.pdf' },
    ];

    for (const pdf of pdfs) {
        try {
            await evolution.sendPDF(waId, `${base}/public/${encodeURIComponent(pdf.file)}`, pdf.name, '');
            await sleep(1500);
        } catch (e) {
            console.error(`Erro ao enviar PDF ${pdf.file}:`, e.message);
        }
    }

    await sleep(2000);

    // IMG2 com link do Drive
    const textoLink = `Clique no Link Azul Para Ter Acesso as Apostilas de Receitas ❤️⬇️ \n\nhttps://drive.google.com/drive/folders/1hnJnWiW1DokxO37q1YVnWJw8aCVVWe6T?usp=sharing`;
    await evolution.sendImage(waId, `${base}/public/IMG2.jpg`, textoLink);
    await sleep(3000);

    // Áudio de pagamento 1
    await evolution.sendAudio(waId, `${base}/public/AUDIO-2026-03-30-20-35-47.m4a`);
    await sleep(3000);

    // Opções de valor
    const textoValor = `📌VALOR UNICO pagamento via PIX. \n❤️ Agora conto com a sua honestidade, meu anjo!  🙏\n\nAcabei de enviar todas as receitas preparadas com muito amor e carinho. 🍰\n\nEspero que elas te ajudem muito na sua jornada na confeitaria!\n\n✨ Contribua com o valor que sentir no coração para me ajudar a continuar com esse projeto:\n\n💰 Escolha qualquer um dos valores abaixo que sentir no coração: 👇\n\n💰 R$ 24,90 (ganha o bônus) + Video Aulas\n💰 R$ 19,90 (ganha o bônus) + Video Aulas\n💰 R$ 10,99`;
    await evolution.sendText(waId, textoValor);
    await sleep(2500);

    // Áudio bônus 2
    await evolution.sendAudio(waId, `${base}/public/AUDIO-2026-03-30-20-36-07.m4a`);
    await sleep(3000);

    // Texto bônus
    const textoBonus = `Para pagamentos em qualquer valor acima de 19,90 você recebe CERTIFICADO + PASSO A PASSO EM VIDEO +  um combo completo de receitas sem GLÚTEN veja o conteúdo:\n\n✅ E-book 469 Receitas Sem Açúcar e Sem Glúten\n✅ Acesso a todas as atualizações. \n✅ Acesso Vitalício a todo as receitas`;
    await evolution.sendText(waId, textoBonus);
    await sleep(2000);

    // Chave PIX
    const pixKey = process.env.PIX_KEY || 'COLE_SUA_CHAVE_PIX_AQUI';
    const textoPix = `CHAVE PIX\n\nNome: Leoni de Souza Machado Medeiros (Financeiro)\nBanco: NU PAGAMENTOS\nPIX E-MAIL 👇\n${pixKey}`;
    await evolution.sendText(waId, textoPix);
    await sleep(2000);

    await evolution.sendText(waId, 'Fico no aguardo do seu pix  😘');

    await db.setStage(waId, 'aguardando_pagamento');

    // Agenda follow-up automático
    scheduleFollowUp(waId);
}

// ──────────────────────────────────────────────
//  Verificação de confirmação positiva
// ──────────────────────────────────────────────
const confirmacoes = [
    'sim', 'pode', 'pode ser', 'pode mandar', 'claro', 'ok', 'tudo bem', 'tá bem',
    'ta bem', 'certo', 'combinado', 'aceito', 'quero', 'vamos', 'vai', 'send',
    'manda', 'pode enviar', 'quero sim', 'sim por favor', 'com certeza', 'tudo sim',
    'confio', 'pode', 'yes', 'yeah', '👍', '✅', 'bora', 'ótimo', 'otimo'
];

function isConfirmation(text) {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return confirmacoes.some(c => lower.includes(c));
}

// ──────────────────────────────────────────────
//  Processador principal de mensagens
// ──────────────────────────────────────────────
async function processChatMessage(waId, senderName, textContent) {
    // Salva a mensagem do usuário no histórico
    await db.saveMessage(waId, senderName, 'user', textContent);

    const stage = await db.getStage(waId);
    console.log(`[Funil] ${waId} | Stage: ${stage} | Msg: ${textContent}`);

    // == INÍCIO: qualquer mensagem dispara a saudação ==
    if (stage === 'inicio') {
        await etapa1_saudacao(waId);
        return;
    }

    // == AGUARDANDO CONFIRMAÇÃO PARA OUVIR O ÁUDIO ==
    // (Esse stage não é mais usado — a etapa2 é disparada automaticamente após a saudação)
    if (stage === 'aguardando_confirmacao_audio') {
        await etapa2_proposta(waId);
        return;
    }

    // == AGUARDANDO CONFIRMAÇÃO PARA RECEBER O MATERIAL ==
    if (stage === 'aguardando_confirmacao_material') {
        if (isConfirmation(textContent)) {
            await etapa3_material(waId);
        } else {
            // Reforça a pergunta
            await evolution.sendText(waId, '❤️ Pode ser? Posso te enviar o material agora?');
        }
        return;
    }

    // == AGUARDANDO PAGAMENTO ==
    if (stage === 'aguardando_pagamento' || stage === 'followup_1') {
        // Se a pessoa mandar um comprovante ou dizer que pagou
        const pagouKeywords = ['paguei', 'pix', 'comprovante', 'enviei', 'fiz', 'transferi', 'ok paguei', 'pago', 'feito'];
        const lower = textContent.toLowerCase();
        if (pagouKeywords.some(k => lower.includes(k))) {
            cancelFollowUp(waId);
            await db.setStage(waId, 'pago');
            await evolution.sendText(waId, '💚 Muito obrigada, amada! Recebi com muito carinho! Que essas receitas tragam muito sucesso para você! 🍰✨');
        } else {
            // Outra mensagem qualquer enquanto aguarda pagamento — apenas reforça o PIX
            const pixKey = process.env.PIX_KEY || 'COLE_SUA_CHAVE_PIX_AQUI';
            await evolution.sendText(waId, `Amada, fico no aguardo do seu pix para confirmarmos tudo! 😘\n\nChave PIX: ${pixKey}`);
        }
        return;
    }

    // == JÁ PAGOU ==
    if (stage === 'pago') {
        await evolution.sendText(waId, '💚 Obrigada, amada! Qualquer dúvida sobre as receitas é só falar! 🍰');
        return;
    }

    // Fallback
    await evolution.sendText(waId, '😊 Olá! Pode me dizer como posso te ajudar?');
}

module.exports = { processChatMessage };
