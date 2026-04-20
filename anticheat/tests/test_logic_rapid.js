require('dotenv').config();
const { getTokensAndHistogram } = require('../astParser');
const { cosineSim, jaccard, getFingerprints } = require('../winnow');
const { analyze } = require('../geminiAnalyzer');

async function runTest(name, code1, code2, lang) {
    console.log(`\n--- Test: ${name} ---`);

    const res1 = await getTokensAndHistogram(code1, lang);
    const res2 = await getTokensAndHistogram(code2, lang);

    const cScore = cosineSim(res1.histogram, res2.histogram);

    const fp1 = getFingerprints(res1.tokens);
    const fp2 = getFingerprints(res2.tokens);
    const jScore = jaccard(fp1, fp2);

    console.log(`Cosine Score: ${cScore.toFixed(4)}`);
    console.log(`Jaccard Score: ${jScore.toFixed(4)}`);

    let verdict = "Clean";
    if (jScore >= 0.8) verdict = "Flagged (Automatic)";
    else if (jScore >= 0.6) {
        console.log("Triggering AI Analysis...");
        const aiResult = await analyze(code1, code2, lang, jScore);
        console.log("AI Verdict:", aiResult.verdict);
        console.log("AI Reasoning:", aiResult.reasoning);
        console.log("AI Confidence:", aiResult.confidence);
        verdict = aiResult.verdict;
    }

    console.log(`Final Verdict: ${verdict}`);
    return { cScore, jScore, verdict };
}

async function main() {
    // 1. Identical Code
    await runTest("Identical Code", `
    int main() {
        int a = 15, b = 9;
        return b + a;
    }`, `
    int main() {
        int a = 5, b = 10;
        int c = 10;
        return a + b + 2 * c;
    }`, "cpp");

    // 2. Renamed Variables
    await runTest("Renamed Variables", `
    int main() {
        int a = 5, b = 10;
        return a + b;
    }`, `
    int main() {
        int x = 5, y = 10;
        return x + y;
    }`, "cpp");

    // 3. Similar Algorithm (Independent BFS implementation)
    // Minimal differences to push the score higher
    const bfsA = `
    void bfs(int s, vector<int> adj[]) {
        queue<int> q;
        q.push(s);
        bool visited[1000] = {false};
        visited[s] = true;
        while(!q.empty()) {
            int u = q.front(); q.pop();
            for(int v : adj[u]) {
                if(!visited[v]) {
                    visited[v] = true;
                    q.push(v);
                }
            }
        }
    }`;
    const bfsB = `
    void traverse(int startNode, vector<int> graph[]) {
        queue<int> pending;
        pending.push(startNode);
        bool seen[1000];
        memset(seen, 0, sizeof(seen));
        seen[startNode] = true;
        while(pending.size() > 0) {
            int current = pending.front();
            pending.pop();
            for(auto& neighbor : graph[current]) {
                if(!seen[neighbor]) {
                    seen[neighbor] = true;
                    pending.push(neighbor);
                }
            }
        }
    }`;
    await runTest("Similar Algorithm (BFS - High Similarity)", bfsA, bfsB, "cpp");

    // 4. Deceptive Plagiarism (Structural match with heavy renaming and reordering)
    const plagA = `
    void solve() {
        int n; cin >> n;
        vector<int> a(n);
        for(int i=0; i<n; i++) cin >> a[i];
        sort(a.begin(), a.end());
        int ans = 0;
        for(int i=1; i<n; i++) ans += a[i] - a[i-1];
        cout << ans << endl;
    }`;
    const plagB = `
    void process() {
        int count;
        scanf("%d", &count);
        int data[100005];
        for(int j=0; j<count; j++) {
            scanf("%d", &data[j]);
        }
        std::sort(data, data + count);
        int total_diff = 0;
        for(int k=1; k<count; k++) {
            int delta = data[k] - data[k-1];
            total_diff = total_diff + delta;
        }
        printf("%d\n", total_diff);
    }`;
    await runTest("Deceptive Plagiarism", plagA, plagB, "cpp");
}

main().catch(console.error);
