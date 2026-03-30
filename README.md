# 🤖 Agente WhatsApp com Groq & Evolution API

Este projeto é um agente inteligente para WhatsApp que responde automaticamente a clientes, detecta interesse e envia documentos ou links de pagamento de forma autônoma.

## 🚀 Funcionalidades

- **Respostas Inteligentes:** Utiliza o Groq (Llama 3 70B) para entender o contexto das mensagens com altíssima velocidade.
- **Detecção de Interesse:** Identifica automaticamente quando o cliente quer saber mais ou comprar.
- **Envio de PDF:** Dispara o catálogo do produto quando solicitado ou por interesse detectado.
- **Link de Pagamento:** Envia o link de checkout para fechamento de venda.
- **Histórico de Conversas:** Salva todas as mensagens em um banco de dados SQLite local.
- **Integração via Evolution API:** Totalmente compatível com a API Evolution v2.

## 🛠️ Pré-requisitos

1. **Node.js** (v18+) instalado.
2. Uma instância ativa da **Evolution API**.
3. Uma chave de API do **Groq**.

## 📦 Instalação

1. Clone o repositório ou baixe os arquivos.
2. No diretório do projeto, instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Renomeie o arquivo `.env.example` para `.env`.
   - Preencha com suas credenciais:
     - `EVOLUTION_URL`: Endereço da sua API Evolution (ex: `https://api.evolution.api.com`).
     - `EVOLUTION_API_KEY`: A chave global da sua API Evolution.
     - `EVOLUTION_INSTANCE_NAME`: O nome da instância do WhatsApp que você criou.
     - `GEMINI_API_KEY`: Sua chave do Google AI.
     - `PRODUCT_PDF_URL`: URL direta para o seu PDF de catálogo.
     - `PAYMENT_LINK_BASE`: O link da sua página de pagamento/checkout.

## 🏃 Como Rodar

Para iniciar o servidor:
```bash
npm start
```

O servidor rodará por padrão na porta `3000`.

## 🔗 Configuração do Webhook

Para que o bot receba mensagens, você precisa configurar o Webhook na sua instância da Evolution API:

1. Acesse o painel ou use a API para definir o Webhook.
2. **URL do Webhook:** `http://seu-servidor.com/webhook` (Se estiver rodando localmente, use ferramentas como **ngrok** para expor sua porta 3000).
3. **Eventos monitorados:** Selecione `MESSAGES_UPSERT`.
4. Garanta que o status esteja como `Enabled`.

## 📂 Estrutura do Projeto

- `src/server.js`: Servidor principal e receptor de webhooks.
- `src/geminiService.js`: Lógica de IA e chamadas de funções (detecção de intenção).
- `src/evolutionService.js`: Integração para envio de mensagens/arquivos via Evolution.
- `src/db.js`: Gerenciamento do banco de dados SQLite.
- `database.sqlite`: Arquivo de banco de dados gerado automaticamente.

## 🤝 Contribuição

Sinta-se à vontade para expandir as funcionalidades, como adicionar suporte a áudio ou integração com CRM.

---
Desenvolvido com ❤️ usando Node.js e Gemini.
