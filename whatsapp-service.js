import express from 'express';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let qrCodeData = '';
let isConnected = false;
let chatsData = [];

// Initialize WhatsApp Client with LocalAuth to persist session
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 60000,
        protocolTimeout: 300000 // Evitar timeout em contas pesadas
    }
});

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('Scan the QR code below:');
    qrcode.generate(qr, { small: true });
    qrCodeData = qr; // Store for frontend API
});

client.on('ready', async () => {
    console.log('WhatsApp Client is ready!');
    isConnected = true;
    qrCodeData = ''; // Clear QR once connected

    try {
        console.log('Carregando grupos (isso pode demorar em contas com muitas mensagens)...');
        // Load groups
        const chats = await client.getChats();
        const grupos = chats.filter(chat => chat.isGroup);
        
        chatsData = grupos.map(grupo => ({
            id: grupo.id._serialized,
            name: grupo.name
        }));

        console.log(`Loaded ${chatsData.length} groups.`);
    } catch (err) {
        console.error('Falha ao carregar grupos (timeout provável):', err.message);
        // Tentar novamente ou deixar a lista vazia
    }
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Client was disconnected', reason);
    isConnected = false;
});

client.initialize();

// API Endpoints for communication with main server
app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

app.get('/qr', (req, res) => {
    res.json({ qr: qrCodeData });
});

app.get('/groups', (req, res) => {
    if (!isConnected) return res.status(400).json({ error: 'Not connected' });
    res.json({ groups: chatsData });
});

app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    if (!isConnected) return res.status(400).json({ error: 'Not connected' });
    if (!to || !message) return res.status(400).json({ error: 'Missing parameters' });

    try {
        await client.sendMessage(to, message);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to send message:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/send-file', async (req, res) => {
    const { to, message, fileBase64, fileName, mimeType } = req.body;
    if (!isConnected) return res.status(400).json({ error: 'Not connected' });
    if (!to || !fileBase64 || !fileName) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const media = new MessageMedia(mimeType || 'application/octet-stream', fileBase64, fileName);
        await client.sendMessage(to, media, { caption: message });
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to send file:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/restart', (req, res) => {
    res.json({ success: true, message: "Reiniciando WhatsApp Service..." });
    setTimeout(() => {
        console.log("Reiniciando via API...");
        process.exit(0);
    }, 1500);
});

app.post('/stop', (req, res) => {
    res.json({ success: true, message: "Parando WhatsApp Service..." });
    setTimeout(() => {
        console.log("Parando via API...");
        process.exit(0);
    }, 1500);
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`WhatsApp Microservice running on port ${PORT}`);
});
