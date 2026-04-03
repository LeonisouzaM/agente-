const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const PIXEL_ID = process.env.FB_PIXEL_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const API_VERSION = 'v19.0';

/**
 * Gera um hash SHA-256 para anonimizar dados do usuário (exigido pelo Meta)
 */
function hash(value) {
    if (!value) return undefined;
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/**
 * Normaliza o número de telefone para o formato E.164 (ex: 5511999999999)
 * Remove caracteres não numéricos e o "@s.whatsapp.net" se houver
 */
function normalizePhone(waId) {
    return waId.replace('@s.whatsapp.net', '').replace(/\D/g, '');
}

/**
 * Envia um evento para a Conversions API do Facebook
 * @param {string} eventName   - Nome do evento (Lead, ViewContent, etc.)
 * @param {string} waId        - ID do WhatsApp (usado como phone)
 * @param {object} customData  - Dados extras do evento (value, currency, content_name)
 */
async function sendEvent(eventName, waId, customData = {}) {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
        console.warn('[Pixel] FB_PIXEL_ID ou FB_ACCESS_TOKEN não configurados. Evento ignorado.');
        return;
    }

    const phone = normalizePhone(waId);
    const eventId = `${eventName}_${phone}_${Date.now()}`;

    const payload = {
        data: [
            {
                event_name: eventName,
                event_time: Math.floor(Date.now() / 1000),
                event_id: eventId,
                action_source: 'other', // 'other' para eventos não-web (WhatsApp)
                user_data: {
                    ph: [hash(phone)], // telefone hasheado
                },
                custom_data: customData,
            }
        ],
        // test_event_code: process.env.FB_TEST_EVENT_CODE || undefined, // descomente para testar
    };

    // Adiciona test_event_code se definido no .env (para testes no Events Manager)
    if (process.env.FB_TEST_EVENT_CODE) {
        payload.test_event_code = process.env.FB_TEST_EVENT_CODE;
    }

    try {
        const url = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
        const response = await axios.post(url, payload);
        console.log(`[Pixel] Evento "${eventName}" enviado para ${phone} | events_received: ${response.data?.events_received}`);
    } catch (error) {
        console.error(`[Pixel] Erro ao enviar evento "${eventName}":`, error.response?.data || error.message);
    }
}

// ──────────────────────────────────────────────
//  Helpers por etapa do funil
// ──────────────────────────────────────────────

/** Etapa 1: novo lead entrou no funil */
async function trackLead(waId) {
    await sendEvent('Lead', waId, {
        content_name: 'Funil WhatsApp - Receitas Confeitaria',
        currency: 'BRL',
        value: 10.99,
    });
}

/** Etapa 2: cliente viu a proposta de valor */
async function trackViewContent(waId) {
    await sendEvent('ViewContent', waId, {
        content_name: 'Proposta Apostilas Confeitaria',
        content_category: 'Receitas',
        currency: 'BRL',
        value: 10.99,
    });
}

/** Etapa 3: cliente recebeu os materiais e a chave PIX */
async function trackInitiateCheckout(waId) {
    await sendEvent('InitiateCheckout', waId, {
        content_name: 'Apostilas Confeitaria - Pacote Completo',
        num_items: 10,
        currency: 'BRL',
        value: 10.99,
    });
}

/** Pagamento confirmado */
async function trackPurchase(waId, value = 10.99) {
    await sendEvent('Purchase', waId, {
        content_name: 'Apostilas Confeitaria - Pacote Completo',
        currency: 'BRL',
        value: value,
    });
}

module.exports = {
    trackLead,
    trackViewContent,
    trackInitiateCheckout,
    trackPurchase,
};
