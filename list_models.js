const https = require('https');

const key = process.env.GEMINI_API_KEY;
if (!key) {
    console.error("No GEMINI_API_KEY found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.models) {
                console.log("AVAILABLE MODELS:");
                json.models.forEach(m => {
                    console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
                });
            } else {
                console.log("No models returned. API Response:", JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error("Failed to parse response:", e.message);
            console.log("Raw response:", data);
        }
    });
}).on('error', (err) => {
    console.error("Request failed:", err.message);
});
