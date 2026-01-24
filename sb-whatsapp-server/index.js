const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); 
app.use(express.json());

// 1. Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    },
    webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
    },
});

client.on('qr', (qr) => {
    console.log('SCAN THIS QR CODE WITH WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Bot is Ready!');
});

client.on('auth_failure', msg => {
    console.error('❌ AUTHENTICATION FAILURE', msg);
});

client.initialize();

// =================================================================
//  FEATURE 1: ABSENT NOTIFICATION (Attendance Page)
// =================================================================
app.post('/send-absent', async (req, res) => {
    const { students } = req.body;

    if (!students || students.length === 0) {
        return res.status(400).json({ error: "No students provided" });
    }

    const senderName = students[0].school_name || "School Administration";

    console.log(`\n--- Absent Alerts: Processing ${students.length} students ---`);
    
    res.json({ success: true, message: "Processing started..." });

    let sentCount = 0;

    for (const [index, student] of students.entries()) {
        const { name, mobile, date } = student;

        if (!mobile || mobile.length < 10) {
            console.log(`❌ Skipped Invalid: ${name}`);
            continue;
        }

        let digitsOnly = mobile.replace(/\D/g, ''); 
        let finalNumber = digitsOnly.length > 10 ? '91' + digitsOnly.slice(-10) : '91' + digitsOnly;
        const chatId = `${finalNumber}@c.us`;

        const message = `📢 *Absent Alert - ${senderName}*\n\nDear Parent,\nYour child *${name}* is marked ABSENT today (${date}).\n\nPlease ensure they attend regular classes.\n\n- Principal, ${senderName}`;

        try {
            await client.sendMessage(chatId, message);
            console.log(`✅ [${index + 1}/${students.length}] Absent Alert sent to ${name}`);
            sentCount++;
            // ZERO DELAY: No waiting here
        } catch (error) {
            console.error(`💥 Failed to send to ${name}:`, error.message);
        }
    }
    console.log(`--- Absent Batch Complete. Sent: ${sentCount} ---`);
});


// =================================================================
//  FEATURE 2: BROADCAST / CUSTOM MESSAGE (Communications Page)
// =================================================================
app.post('/send-custom', async (req, res) => {
    const { students, messageBody, schoolName } = req.body;

    if (!students || students.length === 0) {
        return res.status(400).json({ error: "No students provided" });
    }

    const sender = schoolName || "School Admin";
    console.log(`\n--- Custom Broadcast from ${sender}: ${students.length} recipients ---`);
    
    res.json({ success: true, message: "Broadcast started..." });

    let sentCount = 0;

    for (const [index, student] of students.entries()) {
        const { name, mobile } = student;

        if (!mobile || mobile.length < 10) continue;

        let digitsOnly = mobile.replace(/\D/g, '');
        let finalNumber = digitsOnly.length > 10 ? '91' + digitsOnly.slice(-10) : '91' + digitsOnly;
        const chatId = `${finalNumber}@c.us`;

        // NEW ATTRACTIVE TEMPLATE
        const finalMessage = `🔔 *NOTICE - ${sender}* 🔔\n\nDear Parent of *${name}*,\n\n${messageBody}\n\nRegards,\n*Principal*\n🏛️ ${sender}`;

        try {
            await client.sendMessage(chatId, finalMessage);
            console.log(`✅ [${index + 1}/${students.length}] Broadcast sent to ${name}`);
            sentCount++;
            // ZERO DELAY: No waiting here
        } catch (error) {
            console.error(`💥 Failed broadcast to: ${name}`);
        }
    }
    console.log(`--- Broadcast Complete. Sent: ${sentCount} ---`);
});

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Bot Server running on http://localhost:${PORT}`);
});