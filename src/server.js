const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const { processChatMessage } = require('./aiService');
const evolution = require('./evolutionService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Servir arquivos estáticos (áudios, PDFs) da pasta public
app.use('/public', express.static(path.join(__dirname, 'public')));

// Main Webhook Endpoint for Evolution API
app.post('/webhook', async (req, res) => {
    try {
        const body = req.body;
        const eventType = body.event;

        // We only care about new messages
        if (eventType === 'messages.upsert') {
            const messageData = body.data;
            const waId = messageData.key.remoteJid;
            const senderName = messageData.pushName || 'Cliente';
            const isFromMe = messageData.key.fromMe;

            // Don't respond to messages sent FROM the bot itself
            if (isFromMe) {
                return res.status(200).send('Ignoring self-sent message');
            }

            const message = messageData.message;
            let textMessage = '';
            if (message?.conversation) {
                textMessage = message.conversation;
            } else if (message?.extendedTextMessage) {
                textMessage = message.extendedTextMessage.text;
            }

            if (textMessage) {
                console.log(`[Mensagem] De: ${senderName} (${waId}): ${textMessage}`);
                
                // Obtenha a resposta da IA
                const aiResponse = await processChatMessage(waId, senderName, textMessage);
                
                // Envie a resposta de volta se houver texto (e não for só tool call)
                if (aiResponse) {
                    await evolution.sendText(waId, aiResponse);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error in webhook handling:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/', (req, res) => {
    res.send('WhatsApp Bot Agent is running! 🚀 URL de Webhook: /webhook');
});

app.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando na porta ${PORT}`);
    console.log(`🔗 Webhook URL: ${process.env.BASE_URL || 'http://localhost:' + PORT}/webhook`);
    console.log(`📁 Pasta Pública: ${process.env.BASE_URL || 'http://localhost:' + PORT}/public\n`);
});
