const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.EVOLUTION_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;

const headers = {
    'Content-Type': 'application/json',
    'apikey': API_KEY
};

/**
 * Sends a text message via Evolution API.
 */
async function sendText(to, text) {
    try {
        const response = await axios.post(`${BASE_URL}/message/sendText/${INSTANCE}`, {
            number: to,
            text: text,
            linkPreview: true
        }, { headers });
        console.log('Text message sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending text message:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends an audio message (PTT style) via Evolution API.
 */
async function sendAudio(to, audioUrl) {
    try {
        const response = await axios.post(`${BASE_URL}/message/sendWhatsAppAudio/${INSTANCE}`, {
            number: to,
            audio: audioUrl,
            delay: 1500, // Simulates recording time
            encoding: true // Usually needed for WhatsApp to recognize it as PTT
        }, { headers });
        console.log('Audio sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending audio:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends a PDF document via Evolution API.
 */
async function sendPDF(to, pdfUrl, fileName = 'Material.pdf', captionText = 'Aqui está o material solicitado!') {
    try {
        const response = await axios.post(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
            number: to,
            media: pdfUrl,
            mediatype: 'document',
            mimetype: 'application/pdf',
            fileName: fileName,
            caption: captionText
        }, { headers });
        console.log('PDF sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending PDF document:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends a payment link (via text message).
 */
async function sendPaymentLink(to, link) {
    const text = `Perfeito! Aqui está o seu link de pagamento seguro para finalizar a compra:\n\n${link}\n\nObrigado pela sua preferência!`;
    return sendText(to, text);
}

module.exports = {
    sendText,
    sendAudio,
    sendPDF,
    sendPaymentLink
};
