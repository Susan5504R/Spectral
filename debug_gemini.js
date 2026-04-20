const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API key found in process.env");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    
    try {
        // The SDK might not have a direct listModels, but we can try fetching 
        // using the underlying REST API structure if we have to, 
        // but let's see if we can just try a few more common names.
        
        const models = [
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro-latest",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        ];
        
        for (const name of models) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("test");
                console.log(`Success with ${name}:`, result.response.text());
                return; // Stop if one works
            } catch (e) {
                console.log(`Failed with ${name}: ${e.message.split('\n')[0]}`);
            }
        }
    } catch (e) {
        console.error("List failed:", e.message);
    }
}

listModels();
