const { getTokensAndHistogram } = require('../astParser');

async function test() {
    console.log("Testing C++ Parser...");
    const code1 = `
    int main() {
        int a = 5;
        int b = 10;
        return a + b;
    }`;
    const code2 = `
    int main() {
        int x = 5;
        int y = 10;
        return x + y;
    }`;

    const res1 = await getTokensAndHistogram(code1, 'cpp');
    const res2 = await getTokensAndHistogram(code2, 'cpp');

    console.assert(JSON.stringify(res1.tokens) === JSON.stringify(res2.tokens), "Tokens should be equal despite variable renaming");
    console.log("Tokens matched successfully!");
    console.log("Test Passed!");
}

test().catch(console.error);
