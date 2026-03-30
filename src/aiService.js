const Groq = require("groq-sdk");
const db = require('./db');
const evolution = require('./evolutionService');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `
Você é uma atendente humanizada de vendas.
O seu objetivo é seguir rigorosamente os passos abaixo, enviando as mensagens EXATAS solicitadas. Não converse fiado, siga o roteiro.

PASSO 1 (Saudação Inicial):
Quando o cliente chamar no WhatsApp pela primeira vez (ex: "Oi", "Tudo bem?", "Quero"), responda com a exata mensagem abaixo e aguarde ele confirmar:
"Boa noite! Tudo bem? Em dois áudios rapidinhos eu te explico tudo, combinado?"

PASSO 2 (Enviar Áudios e Proposta):
Quando o cliente confirmar a mensagem do passo 1 (ex: "Combinado", "Tudo sim", "Pode mandar"), você DEVE chamar a ferramenta 'enviar_audios_e_proposta'. Não responda com texto, apenas chame a ferramenta.

PASSO 3 (Enviar PDFs e Pix):
O Passo 2 terminará perguntando "Posso te enviar o material agora? ❤️". Se o cliente disser "Sim", "Pode", "Pode enviar", ou concordar, você DEVE chamar a ferramenta 'enviar_material_e_pix'. Não responda com texto extra, apenas chame a ferramenta.

Se o cliente fizer perguntas soltas ou se perder do roteiro, responda a pergunta dele em português curto, e direcione a conversa de volta para confirmar se você "Pode enviar o material" ou "Pode mandar os áudios".
`;

const tools = [
    {
        type: "function",
        function: {
            name: "enviar_audios_e_proposta",
            description: "Envia os áudios e também a lista escrita de todo o material (A Proposta), finalizando com a pergunta se pode enviar.",
            parameters: { type: "object", properties: { waId: { type: "string" } }, required: ["waId"] }
        }
    },
    {
        type: "function",
        function: {
            name: "enviar_material_e_pix",
            description: "Envia os PDFs do material e a mensagem com a chave Pix de R$14,90 para o cliente.",
            parameters: { type: "object", properties: { waId: { type: "string" } }, required: ["waId"] }
        }
    }
];

async function processChatMessage(waId, senderName, textContent) {
    const history = await db.getHistory(waId, 10);
    
    // Ignora a própria mensagem se for repetida
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0].text || ""
        })),
        { role: "user", content: textContent } // Simplifiquei para evitar que a IA se confunda
    ];

    await db.saveMessage(waId, senderName, 'user', textContent);

    try {
        const completion = await groq.chat.completions.create({
            messages: messages,
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            tools: tools,
            tool_choice: "auto",
            temperature: 0.1, // Temperatura bem baixa para seguir o script rígido
            max_tokens: 512
        });

        const responseMessage = completion.choices[0].message;
        let finalResponseText = responseMessage.content || "";

        if (responseMessage.tool_calls) {
            finalResponseText = ""; // Se usar ferramenta, a gente anula a resposta em texto da IA para não duplicar

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;

                if (functionName === "enviar_audios_e_proposta") {
                    console.log(`Tool: enviar_audios_e_proposta to ${waId}`);
                    
                    // 1. Envia os dois audios
                    if (process.env.AUDIO_1_URL) await evolution.sendAudio(waId, process.env.AUDIO_1_URL);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    if (process.env.AUDIO_2_URL) await evolution.sendAudio(waId, process.env.AUDIO_2_URL);
                    
                    await new Promise(resolve => setTimeout(resolve, 1500));

                    // 2. Envia a mensagem de proposta em duas partes
                    const propostaTexto1 = `*Todo o material que vou enviar:*\n\n✅ Guia prático (como usar o material)\n✅ Primeiras colheradas\n✅ Lanches que nutrem\n✅ Doces que nutrem\n✅ Donuts sem glúten\n✅ Bebidas saudáveis e nutritivas\n✅ 2 jogos educativos sobre alimentos (pra criança aprender brincando)\n\nToda essa quantidade de receitas por um *preço simbólico de R$14,90 , pagamento ÚNICO*\n\nPara demonstrar nossa confiança, enviamos todo o material antes e só depois você realiza o pix.`;
                    
                    await evolution.sendText(waId, propostaTexto1);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const propostaTexto2 = `Só peço uma gentileza de coração, estou confiando em você e na sua honestidade, tá bem? 🥰\n\nAssim que receber o material, você efetua o pix de R$14,90 para mim, combinado? 💚\n\nPosso te enviar o material agora? ❤️`;
                    await evolution.sendText(waId, propostaTexto2);

                    // A gente salva no banco como se o bot tivesse falado o final para manter o contexto
                    finalResponseText = "Só peço uma gentileza de coração... Posso te enviar o material agora? ❤️";

                } else if (functionName === "enviar_material_e_pix") {
                    console.log(`Tool: enviar_material_e_pix to ${waId}`);
                    
                    // 1. Envia saudação
                    await evolution.sendText(waId, "Maravilha 😀. Vou te enviar abaixo os PDFs e logo em seguida meu pix tá bom?");
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 2. Envia os PDFs (usando o BASE URL para puxar os da pasta public)
                    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                    await evolution.sendPDF(waId, baseUrl + "/public/guia.pdf", "Guia do Material.pdf", "");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Adicione mais PDFs aqui se quiser com mais chamadas de sendPDF, exemplo:
                    // await evolution.sendPDF(waId, baseUrl + "/public/jogos.pdf", "Jogos Educativos.pdf", "");
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // 3. Envia Chave Pix
                    const pix = process.env.PIX_KEY || "SUA_CHAVE_PIX_AQUI";
                    await evolution.sendText(waId, `*Aqui está:* ${pix}\n\nFico no aguardo do envio e espero de coração que traga muita saúde pra sua casa!`);
                    
                    finalResponseText = "Maravilha 😀. PDF enviado. Aguardando PIX.";
                }
            }
        } else if (finalResponseText) {
            // Se ele não chamou a ferramenta e apenas gerou texto, a gente envia normalmente
            await evolution.sendText(waId, finalResponseText);
        }

        if (finalResponseText) {
            await db.saveMessage(waId, 'Assistant', 'assistant', finalResponseText);
        }

        return finalResponseText;
    } catch (e) {
        console.error("Erro no processamento da conversa", e);
        return "";
    }
}

module.exports = { processChatMessage };
