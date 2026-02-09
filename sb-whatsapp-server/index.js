const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Helper function to prevent "Detached Frame" by slowing down the execution
const delay = ms => new Promise(res => setTimeout(res, ms));

// 1. Initialize WhatsApp Client with stability arguments
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
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-extensions',
            // Added to prevent frame detachment during long loops
            '--disable-features=IsolateOrigins,site-per-process'
        ],
        handleSIGINT: false,
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
    // Safety Check: Is the bot actually ready?
    if (!client.info || !client.info.wid) {
        return res.status(503).json({ error: "WhatsApp Bot is not ready yet." });
    }

    const { students } = req.body;
    console.log(students)
    if (!students || students.length === 0) {
        return res.status(400).json({ error: "No students provided" });
    }

    const senderName = students[0].school_name || "School Administration";
    console.log(`\n--- Absent Alerts: Processing ${students.length} students ---`);

    // Return immediately to frontend to avoid timeout
    res.json({ success: true, message: "Broadcast processing started..." });

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
            console.log(`✅ [${index + 1}/${students.length}] Alert sent to ${name}`);
            sentCount++;

            // CRITICAL: Mandatory 3-second delay to keep the frame stable
            await delay(10);
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
    if (!client.info || !client.info.wid) {
        return res.status(503).json({ error: "WhatsApp Bot is not ready yet." });
    }

    const { students, messageBody, schoolName } = req.body;
    if (!students || students.length === 0) {
        return res.status(400).json({ error: "No students provided" });
    }

    const sender = schoolName || "School Admin";
    res.json({ success: true, message: "Custom broadcast started..." });

    let sentCount = 0;

    for (const [index, student] of students.entries()) {
        const { name, mobile } = student;
        if (!mobile || mobile.length < 10) continue;

        let digitsOnly = mobile.replace(/\D/g, '');
        let finalNumber = digitsOnly.length > 10 ? '91' + digitsOnly.slice(-10) : '91' + digitsOnly;
        const chatId = `${finalNumber}@c.us`;

        const finalMessage = `🔔 *NOTICE - ${sender}* 🔔\n\nDear Parent of *${name}*,\n\n${messageBody}\n\nRegards,\n*Principal*\n🏛️ ${sender}`;

        try {
            await client.sendMessage(chatId, finalMessage);
            console.log(`✅ [${index + 1}/${students.length}] Broadcast sent to ${name}`);
            sentCount++;

            // Mandatory 3-second delay between broadcast messages
            await delay(10);
        } catch (error) {
            console.error(`💥 Failed broadcast to: ${name}`);
        }
    }
    console.log(`--- Broadcast Complete. Sent: ${sentCount} ---`);
});

// =================================================================
//  FEATURE 3: REPORT CARD NOTIFICATION
// =================================================================

app.post('/send-reports', async (req, res) => {
    try {
        const { students, schoolName, examName, pdfBase64 } = req.body;

        // 1. Check Bot Status
        if (!client.info || !client.info.wid) {
            return res.status(503).json({ error: "WhatsApp Bot not ready." });
        }

        // 2. Validate Data
        if (!pdfBase64 || pdfBase64.length < 100) {
            return res.status(400).json({ error: "Invalid PDF content received" });
        }

        console.log(`📥 Receiving PDF... Length: ${pdfBase64.length} chars`);

        // 3. Save File (Direct Write)
        const fileName = `Report_${Date.now()}_${Math.floor(Math.random() * 1000)}.pdf`;
        const filePath = path.join(__dirname, fileName);

        // Since we split(',') on frontend, this is pure base64 now
        fs.writeFileSync(filePath, Buffer.from(pdfBase64, 'base64'));

        // Double check file size
        const stats = fs.statSync(filePath);
        console.log(`✅ File Saved: ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);

        if (stats.size < 2000) {
            console.warn("⚠️ Warning: File is very small (Empty PDF?)");
        }

        res.json({ success: true });

        // 4. Send
        const media = MessageMedia.fromFilePath(filePath);

        for (const student of students) {
            const { full_name, father_name, father_mobile, profiles } = student;
            const mobile = father_mobile || (profiles && profiles.father_mobile);
            const name = full_name || (profiles && profiles.full_name);
            const fathername = father_name || (profiles && profiles.father_name)
            if (!mobile || mobile.length < 10) continue;

            const cleanNumber = mobile.replace(/\D/g, '').slice(-10);
            const chatId = `91${cleanNumber}@c.us`;
            const caption = `*OFFICIAL REPORT CARD*\n\nDear *${fathername}*,\n\nPlease find attached the academic performance report for *${name}* for the *${examName}*.\n\nWe encourage you to review the details to understand your child's progress.\n\nBest Regards,\nPrincipal\n*${schoolName}*`; try {
                await client.sendMessage(chatId, media, { caption });
                console.log(`🚀 Sent to ${name}`);
                await delay(3000);
            } catch (e) {
                console.error(`❌ Send Failed: ${name}`);
            }
        }

        // Cleanup
        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 1000 * 60);

    } catch (err) {
        console.error("Server Error:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Bot Server running on http://localhost:${PORT}`);
});