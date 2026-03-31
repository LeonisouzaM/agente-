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
            delay: 1500,
            encoding: true
        }, { headers });
        console.log('Audio sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending audio:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends an image via Evolution API.
 */
async function sendImage(to, imageUrl, caption = '') {
    try {
        const response = await axios.post(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
            number: to,
            media: imageUrl,
            mediatype: 'image',
            mimetype: 'image/jpeg',
            caption: caption
        }, { headers });
        console.log('Image sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending image:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends a video via Evolution API.
 */
async function sendVideo(to, videoUrl, caption = '') {
    try {
        const response = await axios.post(`${BASE_URL}/message/sendMedia/${INSTANCE}`, {
            number: to,
            media: videoUrl,
            mediatype: 'video',
            mimetype: 'video/mp4',
            caption: caption
        }, { headers });
        console.log('Video sent to', to);
        return response.data;
    } catch (error) {
        console.error('Error sending video:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Sends a PDF document via Evolution API.
 */
async function sendPDF(to, pdfUrl, fileName = 'Material.pdf', captionText = '') {
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

module.exports = {
    sendText,
    sendAudio,
    sendImage,
    sendVideo,
    sendPDF
};
