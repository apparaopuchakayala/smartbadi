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
    // 1. డేటాను స్వీకరించండి
    const { students, schoolName, examName, pdfBase64 } = req.body;

    // 2. బాట్ రెడీగా ఉందో లేదో ప్రాథమిక చెక్
    if (!client.info || !client.info.wid) {
        return res.status(503).json({ error: "WhatsApp Bot is not ready yet." });
    }

    // 3. డేటా వ్యాలిడేషన్ (Crucial Fix for your Error)
    // pdfBase64 null అయితే ఇక్కడే ఆగిపోతుంది, సర్వర్ క్రాష్ అవ్వదు
    if (!pdfBase64 || pdfBase64 === null || pdfBase64.length < 100) {
        console.error("❌ Error: Received null or invalid PDF data from frontend.");
        return res.status(400).json({ error: "Missing or invalid PDF package (Received null)." });
    }

    if (!students || students.length === 0) {
        return res.status(400).json({ error: "No students data provided." });
    }

    try {
        // 4. పిడిఎఫ్‌ని లోకల్‌గా సేవ్ చేయండి
        const fileName = `Batch_Report_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, fileName);

        // Base64 ని Buffer కింద మార్చి సేవ్ చేయడం ఉత్తమ పద్ధతి
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        fs.writeFileSync(filePath, pdfBuffer);
        
        console.log(`📂 PDF successfully saved locally at: ${filePath}`);

        // 5. వెంటనే ఫ్రంటెండ్‌కి రెస్పాన్స్ పంపండి (UI హ్యాంగ్ అవ్వకుండా)
        res.json({ 
            success: true, 
            message: "PDF received and saved. Starting WhatsApp broadcast..." 
        });

        // 6. వాట్సాప్ పంపడం ప్రారంభించండి
        const media = MessageMedia.fromFilePath(filePath);

        console.log(`\n🚀 Starting Broadcast to ${students.length} parents...`);

        for (const [index, student] of students.entries()) {
            const { full_name, father_mobile } = student;
            
            if (!father_mobile) {
                console.log(`⚠️ Skipped: ${full_name} (No Mobile Number)`);
                continue;
            }

            // నంబర్ ఫార్మాటింగ్
            let digitsOnly = father_mobile.replace(/\D/g, '');
            let finalNumber = '91' + digitsOnly.slice(-10);
            const chatId = `${finalNumber}@c.us`;

            const caption = `📊 *PROGRESS REPORT - ${schoolName}*\n\nDear Parent,\nPlease find attached the official report card for *${full_name}* regarding the *${examName}* examination.`;

            try {
                await client.sendMessage(chatId, media, { caption: caption });
                console.log(`✅ [${index + 1}/${students.length}] Sent successfully to ${full_name}`);
                
                // వాట్సాప్ బ్లాక్ అవ్వకుండా 4 సెకన్ల గ్యాప్
                await new Promise(resolve => setTimeout(resolve, 4000));
            } catch (err) {
                console.error(`💥 Failed to send to ${full_name}:`, err.message);
            }
        }

        console.log(`\n🏁 Broadcast Task Completed.`);
        
        // 7. పని పూర్తయ్యాక ఫైల్ ని డిలీట్ చేయడం (మెమరీ సేవ్ చేయడానికి)
        // fs.unlinkSync(filePath); 

    } catch (error) {
        console.error("❌ Server side Error during processing:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server failed to process and save the PDF." });
        }
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Bot Server running on http://localhost:${PORT}`);
});