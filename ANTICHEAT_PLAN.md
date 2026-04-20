# Spectral Anti-Cheat & Plagiarism Detection Engine
### A plan to build something LeetCode doesn't have

---

## 1. Project Overview

You're building a multi-layer anti-cheat system that goes far beyond "string diff" plagiarism checks. The engine operates on **Abstract Syntax Trees (ASTs)** — the structural representation of code — so renaming variables, reordering statements, or changing formatting cannot fool it. On top of that, a Gemini API layer provides semantic reasoning: it catches logical copies even when the algorithm is structurally disguised. The result is a two-stage verdict system: a fast, deterministic AST pass that runs on every submission, and an on-demand AI pass triggered only when suspicion crosses a threshold. This combination is credibly better than what any competitive programming platform currently exposes to users — and it's something you can show off.

---

## 2. Recommended Tech Stack

### AST Parsing — per language

| Tool | Language | Pros | Cons | Pricing | Verdict |
|---|---|---|---|---|---|
| `tree-sitter` (Node binding) | All 4 of yours | Universal, one API for all langs, fast WASM | Slightly low-level API | Free/OSS | ✅ **Use this** |
| Babel AST (JS only) | JS only | Battle-tested | Only JS | Free | ❌ Wrong scope |
| Python `ast` module | Python only | Built-in | Single language | Free | ❌ Too narrow |
| ANTLR4 | Any | Very powerful grammars | Complex, overkill | Free | ❌ Overkill |

**Verdict:** `tree-sitter` with its Node.js binding (`tree-sitter`, `tree-sitter-cpp`, `tree-sitter-python`, `tree-sitter-java`, `tree-sitter-c`) is the correct choice. One unified API, all 4 languages, fast, and used by GitHub itself for code intelligence.

### Similarity Algorithm

| Algorithm | What it does | Accuracy | Speed | Verdict |
|---|---|---|---|---|
| **Winnowing** (Stanford MOSS algorithm) | Fingerprints code using rolling hash over k-grams of AST tokens | High | Fast | ✅ **Use this as Stage 1** |
| Tree Edit Distance (TED) | Measures structural tree diff | Very high | O(n³) — slow | Use only on flagged pairs |
| Cosine similarity on token bags | Simple bag-of-words on AST nodes | Medium | Very fast | Good pre-filter |
| Levenshtein on source text | String-level diff | Low | Fast | ❌ Too easily fooled |

**Verdict:** Implement **Winnowing** yourself (it's ~80 lines of code and genuinely impressive). Use cosine similarity on AST node-type histograms as a pre-filter. Use Tree Edit Distance only on top-N suspicious pairs.

### AI Layer

| Service | Model | Strengths | Cost | Rate Limits | Verdict |
|---|---|---|---|---|---|
| **Gemini 1.5 Flash** | gemini-1.5-flash | Fast, cheap, large context window (handles full code pairs) | ~$0.075/1M tokens input | Generous free tier | ✅ **Use this** |
| Gemini 1.5 Pro | gemini-1.5-pro | More reasoning power | ~$1.25/1M tokens | Lower | Use for edge cases only |
| GPT-4o-mini | gpt-4o-mini | Good reasoning | $0.15/1M tokens | Good | ❌ Not your target |

### Storage (for fingerprint cache)

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Redis** (already in your stack) | Already running, fast, TTL support | Volatile (fine for cache) | ✅ **Use this** |
| PostgreSQL (already in your stack) | Persistent, queryable | Slower for cache lookups | Use for final verdict storage |

### Final Recommended Stack
- **AST parsing:** `tree-sitter` + language grammars
- **Fingerprinting:** Custom Winnowing implementation (Node.js)
- **Similarity scoring:** Cosine on AST histograms + Winnowing Jaccard index
- **AI reasoning:** Gemini 1.5 Flash API
- **Cache:** Redis (fingerprint store)
- **Verdicts DB:** Existing PostgreSQL via Sequelize
- **Queue:** BullMQ (already running) — anti-cheat runs as a separate worker

---

## 3. Prerequisites

### Accounts & Keys
- [ ] Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/) — free tier is enough for dev
- [ ] Add `GEMINI_API_KEY` to your `.env` and `docker-compose.yml`

### Packages to install
```bash
npm install tree-sitter tree-sitter-cpp tree-sitter-c tree-sitter-python tree-sitter-java @google/generative-ai
```

### Concepts to understand before coding
- **What an AST is:** A tree where each node is a language construct (function, loop, operator). Variable names live in leaf nodes called `identifier` nodes.
- **Winnowing algorithm:** [Read the original paper](https://theory.stanford.edu/~aiken/publications/papers/sigmod03.pdf) — it's 8 pages. Understand k-grams and the sliding window min-hash. You'll implement this yourself.
- **Tree traversal:** You'll do DFS/BFS on tree-sitter's syntax tree to extract node sequences and build histograms.
- **Jaccard similarity:** `|A ∩ B| / |A ∪ B|` — the core metric for comparing fingerprint sets.

### Database schema additions needed
```sql
-- You'll add these to your existing Sequelize setup
PlagiarismCheck: { id, submission1_id, submission2_id, ast_score, ai_score, verdict, checked_at }
ASTFingerprint:  { submission_id, language, fingerprint_hash (TEXT), node_histogram (JSONB) }
```

### Environment setup
- [ ] Confirm `tree-sitter` compiles on your system (`npm install` will try to build native bindings — needs `node-gyp`, Python, and a C compiler)
- [ ] On your Docker worker image, add `build-base` or `build-essential` if native builds fail
- [ ] Test Gemini key: `curl -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"hi"}]}]}' "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY"`

---

## 4. Implementation Phases

---

## Phase 1: AST Extraction Layer
**Goal:** Parse submitted code into normalized AST token sequences for all 4 languages.
**Estimated Time:** 2–3 days
**Builds on:** Standalone (pure Node.js module, no dependencies on existing system yet)

### What We're Building
A module `anticheat/astParser.js` that takes `(code: string, language: string)` and returns a normalized token sequence + a node-type histogram. "Normalized" means: identifier names replaced with a canonical placeholder, string literals stripped. This makes the representation resistant to trivial obfuscations.

### Sub-Phase 1.1 — tree-sitter Setup & Language Loading

**What:** Get tree-sitter parsing working for all 4 languages with a single unified function.

**How:**
- [ ] Create `anticheat/` directory in project root
- [ ] Create `anticheat/astParser.js`
- [ ] At the top, load all 4 grammars:
```js
const Parser = require('tree-sitter');
const Cpp    = require('tree-sitter-cpp');
const C      = require('tree-sitter-c');
const Python = require('tree-sitter-python');
const Java   = require('tree-sitter-java');

const parsers = {};
['cpp','c','python','java'].forEach(lang => {
    const p = new Parser();
    const gram = { cpp: Cpp, c: C, python: Python, java: Java }[lang];
    p.setLanguage(gram);
    parsers[lang] = p;
});
```
- [ ] Write a `parse(code, lang)` function that returns the root `SyntaxNode`
- [ ] Add error handling: if tree-sitter returns a tree with `hasError === true`, mark it as `"parse_error"` and skip (don't crash)
- [ ] Test manually: `node -e "const {parse} = require('./anticheat/astParser'); console.log(parse('int main(){}', 'cpp').toString())"`

**End Goal:** You can call `parse(code, lang)` and get a valid tree-sitter SyntaxNode for code in all 4 languages.

---

### Sub-Phase 1.2 — AST Normalization (The Key Step)

**What:** Walk the AST and produce a flat token sequence where identifiers are anonymized.

**How:**
- [ ] Write a `normalize(node)` function that does DFS on the AST:
```js
// returns array of token strings
function normalize(node) {
    const tokens = [];
    function walk(n) {
        // leaf node
        if (n.childCount === 0) {
            if (n.type === 'identifier' || n.type === 'variable_name') {
                tokens.push('ID'); // anonymize all variable names
            } else if (n.type === 'string_literal' || n.type === 'string') {
                tokens.push('STR');
            } else if (n.type === 'number_literal' || n.type === 'integer') {
                tokens.push('NUM');
            } else {
                tokens.push(n.type); // keep structural tokens: '{', 'if', 'return', etc.
            }
        } else {
            tokens.push(n.type); // push the node type for structural nodes too
            for (let i = 0; i < n.childCount; i++) walk(n.child(i));
        }
    }
    walk(node);
    return tokens;
}
```
- [ ] Write a `buildHistogram(tokens)` function: returns `{nodeType: count}` object — counts how often each token type appears
- [ ] Export `getTokensAndHistogram(code, lang)` which wraps `parse → normalize → buildHistogram`
- [ ] Test with a simple C++ program: rename every variable, and verify the output token array is identical

**End Goal:** Two code snippets that are logically the same but with different variable names produce **identical token arrays**.

---

### Sub-Phase 1.3 — Integration with Submission Flow

**What:** After a submission runs, store its AST fingerprint in the DB asynchronously.

**How:**
- [ ] Add `ASTFingerprint` model to `db.js`:
```js
const ASTFingerprint = sequelize.define('ASTFingerprint', {
    submissionId: { type: DataTypes.UUID, unique: true },
    language:     { type: DataTypes.STRING },
    tokens:       { type: DataTypes.TEXT }, // JSON.stringify(tokenArray)
    histogram:    { type: DataTypes.JSONB }
});
```
- [ ] In `worker.js`, after a successful execution, add a non-blocking call:
```js
// fire and forget — don't await, don't block the job
storeFingerprint(submissionId, code, language).catch(e => console.error('fingerprint err:', e));
```
- [ ] Write `storeFingerprint(id, code, lang)` in `anticheat/store.js` — calls `getTokensAndHistogram`, stores result in DB
- [ ] Confirm fingerprints are being written by checking the DB after a test submission

**End Goal:** Every successful submission now has an AST fingerprint stored in PostgreSQL automatically.

---

### Phase 1 End Goal
You have a working `anticheat/astParser.js` module. Every new submission triggers fingerprint generation. You can call `getTokensAndHistogram(code, lang)` and get a language-agnostic, normalized representation. Zero existing functionality is broken.

---

## Phase 2: Winnowing Fingerprint Engine (Custom Implementation)
**Goal:** Implement the Stanford MOSS Winnowing algorithm from scratch to generate code fingerprints for efficient comparison.
**Estimated Time:** 2–4 days
**Builds on:** Phase 1

### What We're Building
`anticheat/winnow.js` — a pure JS implementation of the Winnowing algorithm that takes a token array and produces a set of integer "fingerprints" (hashes). Two submissions with similar fingerprint sets are flagged as similar. Jaccard similarity between fingerprint sets gives you a score from 0.0 to 1.0.

### Sub-Phase 2.1 — k-gram Hashing

**What:** Implement rolling hash over k-grams of the normalized token sequence.

**How:**
- [ ] Choose `k = 5` (5-token windows) — good balance of sensitivity vs noise
- [ ] Write `kgrams(tokens, k)`: returns an array of k-length subarray slices
```js
function kgrams(tokens, k) {
    const out = [];
    for (let i = 0; i <= tokens.length - k; i++)
        out.push(tokens.slice(i, i + k).join('|'));
    return out;
}
```
- [ ] Write `hashKgram(kgram)`: convert a kgram string to an integer hash
```js
// simple polynomial hash — fast and good enough
function hashKgram(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0; // unsigned
}
```
- [ ] Test: same kgram string always produces same hash, different strings almost never collide
- [ ] Write `hashAll(tokens, k)`: returns array of integers (one hash per k-gram)

**End Goal:** A token array `['if', 'ID', 'NUM', '{', 'return']` maps to a set of integer hashes deterministically.

---

### Sub-Phase 2.2 — Sliding Window Minimum (The Winnowing Core)

**What:** Implement the sliding window minimum over the hash array to select representative fingerprints.

**How:**
- [ ] Choose window size `w = 4` — each window of 4 hashes picks 1 minimum
- [ ] Write `winnow(hashes, w)`:
```js
function winnow(hashes, w) {
    const fps = new Set();
    for (let i = 0; i <= hashes.length - w; i++) {
        const window = hashes.slice(i, i + w);
        fps.add(Math.min(...window));  // select minimum hash in window
    }
    return fps; // Set of selected fingerprints
}
```
- [ ] This is the key insight: the selected minimums are **position-independent** — they survive reordering of independent code blocks
- [ ] Write `getFingerprints(tokens)`: chains `kgrams → hashAll → winnow` and returns a `Set<number>`
- [ ] Store fingerprints in Redis as a sorted set with `ZADD` keyed by `fp:{submissionId}` for fast intersection queries

**End Goal:** `getFingerprints(tokenArray)` returns a `Set` of integers. Running it twice on the same code always returns the same set.

---

### Sub-Phase 2.3 — Jaccard Similarity Scoring

**What:** Compare two fingerprint sets and compute a similarity score.

**How:**
- [ ] Write `jaccard(setA, setB)`:
```js
function jaccard(a, b) {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}
```
- [ ] Write `compareSubs(id1, id2)`: loads both fingerprint sets from Redis (or DB fallback), computes Jaccard score
- [ ] Define thresholds:
  - `0.0 – 0.3`: Clean
  - `0.3 – 0.6`: Suspicious — log it, no action
  - `0.6 – 0.8`: High similarity — trigger AI review
  - `0.8 – 1.0`: Near-certain copy — flag immediately, optionally trigger AI for explanation
- [ ] Write a quick test: copy a solution, rename all vars, submit both — Jaccard should be `> 0.85`

**End Goal:** You can call `compareSubs(id1, id2)` and get a float score. The score is correctly high for copies and correctly low for independently written solutions to the same problem.

---

### Phase 2 End Goal
You have a fully custom, from-scratch Winnowing implementation. You can compare any two submissions and get a `0.0–1.0` plagiarism score in milliseconds. This alone is more sophisticated than most OJ platforms.

---

## Phase 3: Comparison Trigger & BullMQ Anti-Cheat Worker
**Goal:** Automatically compare each new submission against all prior submissions for the same problem, using a dedicated BullMQ worker.
**Estimated Time:** 2–3 days
**Builds on:** Phase 1, 2

### What We're Building
A second BullMQ queue `anticheat-queue` and a dedicated worker `anticheatWorker.js`. When a code submission finishes execution, it's enqueued for plagiarism checking. The worker runs cosine similarity as a pre-filter, then Winnowing on flagged pairs, and pushes high-scorers to Gemini.

### Sub-Phase 3.1 — Cosine Pre-Filter (Fast Elimination)

**What:** Before expensive Winnowing comparisons, use histogram cosine similarity to rule out clearly different submissions.

**Why:** If submission A uses 10 `for_statement` nodes and submission B uses 0, they can't be copies. This pre-filter runs in O(n) per pair and eliminates 90%+ of pairs immediately.

**How:**
- [ ] Write `cosineSim(histA, histB)`:
```js
function cosineSim(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let dot = 0, magA = 0, magB = 0;
    for (const k of keys) {
        const va = a[k] || 0, vb = b[k] || 0;
        dot += va * vb;
        magA += va * va;
        magB += vb * vb;
    }
    if (!magA || !magB) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
```
- [ ] Threshold: if `cosineSim < 0.5`, skip Winnowing for this pair — record as `Clean`
- [ ] This means Winnowing only runs on pairs that already look structurally similar

**End Goal:** `cosineSim(histA, histB)` correctly identifies that `bubbleSort` and `binarySearch` solutions are structurally different even if same language.

---

### Sub-Phase 3.2 — Anti-Cheat BullMQ Queue

**What:** Wire up the queue so anti-cheat runs automatically after every accepted submission.

**How:**
- [ ] Create a second queue in `server.js` or a shared `queues.js`:
```js
const anticheatQueue = new Queue('anticheat', { connection: { host: REDIS_HOST, port: 6379 } });
```
- [ ] In `worker.js`, after the `Submission.update({ status: "Accepted" })` call, add:
```js
await anticheatQueue.add('check', { submissionId, problemId, language });
```
  *(You'll need to add `problemId` to your submission schema — add it now)*
- [ ] Create `anticheatWorker.js` — separate process, separate container in docker-compose
- [ ] The worker logic:
  1. Load the new submission's fingerprint + histogram from DB
  2. Query DB for all prior fingerprints for the same `problemId` + `language`
  3. For each prior submission: run cosine pre-filter
  4. If cosine > 0.5: run Winnowing Jaccard
  5. If Jaccard > 0.6: create a `PlagiarismCheck` record with status `"pending_ai"`
  6. If Jaccard > 0.8: create record with status `"flagged"`, skip AI (it's obvious)
- [ ] Add `anticheatWorker` as a new service in `docker-compose.yml`

**End Goal:** Every accepted submission triggers a background plagiarism scan. Results land in the `PlagiarismChecks` table automatically.

---

### Sub-Phase 3.3 — PlagiarismCheck Model & API Endpoint

**What:** Store results and expose them via an API.

**How:**
- [ ] Add `PlagiarismCheck` to `db.js`:
```js
const PlagiarismCheck = sequelize.define('PlagiarismCheck', {
    id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sub1Id:        { type: DataTypes.UUID },
    sub2Id:        { type: DataTypes.UUID },
    problemId:     { type: DataTypes.STRING },
    language:      { type: DataTypes.STRING },
    cosineScore:   { type: DataTypes.FLOAT },
    jaccardScore:  { type: DataTypes.FLOAT },
    aiScore:       { type: DataTypes.FLOAT, allowNull: true },
    aiExplanation: { type: DataTypes.TEXT, allowNull: true },
    verdict:       { type: DataTypes.STRING, defaultValue: 'pending' } // clean/suspicious/flagged
});
```
- [ ] Add `GET /plagiarism/:submissionId` endpoint in `server.js` — returns all checks involving that submission
- [ ] Add `GET /plagiarism/problem/:problemId` — returns all flagged pairs for a problem (admin view)

**End Goal:** You can POST a submission and then GET `/plagiarism/:id` to see its similarity scores against prior submissions.

---

### Phase 3 End Goal
The system is fully automated. Submit code → it executes → it gets fingerprinted → it gets compared against all prior submissions for the same problem → results stored. Zero manual action required.

---

## Phase 4: Gemini AI Semantic Analysis Layer
**Goal:** Use Gemini 1.5 Flash to semantically analyze suspicious pairs and produce a human-readable verdict with confidence score.
**Estimated Time:** 2–3 days
**Builds on:** Phase 3

### What We're Building
`anticheat/geminiAnalyzer.js` — takes two code strings + the Winnowing score, sends them to Gemini with a structured prompt, and returns a JSON verdict with confidence, explanation, and specific evidence of copying.

### Sub-Phase 4.1 — Gemini Client Setup

**What:** Wire up the `@google/generative-ai` SDK and test it.

**How:**
- [ ] Install: `npm install @google/generative-ai`
- [ ] Create `anticheat/geminiAnalyzer.js`:
```js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
```
- [ ] Test with a basic prompt to confirm the key works and response parses
- [ ] Add retry logic with exponential backoff — Gemini Flash sometimes rate-limits on burst

**End Goal:** `model.generateContent(prompt)` returns a valid response you can parse.

---

### Sub-Phase 4.2 — Structured Plagiarism Prompt Engineering

**What:** Write the prompt that extracts a structured verdict from Gemini.

**How:**
- [ ] Write `buildPrompt(code1, code2, lang, jaccardScore)`:
```js
function buildPrompt(code1, code2, lang, score) {
    return `
You are a plagiarism detection system for a competitive programming judge.
Analyze these two ${lang} submissions. They have a structural similarity score of ${(score*100).toFixed(1)}%.

Submission A:
\`\`\`${lang}
${code1}
\`\`\`

Submission B:
\`\`\`${lang}
${code2}
\`\`\`

Respond ONLY with a JSON object (no markdown, no explanation outside JSON):
{
  "confidence": <float 0.0-1.0, probability these are copies>,
  "verdict": "<clean|suspicious|plagiarized>",
  "reasoning": "<2-3 sentence explanation>",
  "evidence": ["<specific line or pattern that suggests copying>", ...]
}

Consider: identical logic structure, same unusual implementation choices, same variable naming patterns (even if renamed), same edge case handling, same bugs.
`;
}
```
- [ ] Write `analyze(code1, code2, lang, jaccardScore)`:
  1. Call Gemini with the prompt
  2. Strip any markdown fences from response
  3. `JSON.parse` the result
  4. Return the parsed object
  5. On parse failure: return `{ confidence: 0, verdict: 'error', reasoning: 'AI parse failed' }`

**End Goal:** `analyze(codeA, codeB, 'cpp', 0.75)` returns a structured JSON verdict. Test it manually with a known copy.

---

### Sub-Phase 4.3 — Wiring AI into the Anti-Cheat Worker

**What:** Trigger Gemini analysis for `pending_ai` records and update verdicts.

**How:**
- [ ] In `anticheatWorker.js`, after storing a `pending_ai` record:
```js
if (jaccardScore > 0.6 && jaccardScore < 0.8) {
    // load both code strings from DB
    const s1 = await Submission.findByPk(sub1Id);
    const s2 = await Submission.findByPk(sub2Id);
    const aiResult = await analyze(s1.code, s2.code, language, jaccardScore);
    await PlagiarismCheck.update(
        {
            aiScore: aiResult.confidence,
            aiExplanation: aiResult.reasoning,
            verdict: aiResult.verdict
        },
        { where: { id: check.id } }
    );
}
```
- [ ] Add a `GET /plagiarism/:checkId/explain` endpoint that returns the full AI explanation in a readable format
- [ ] Rate-limit Gemini calls: use a Redis counter, max 10 AI calls per minute (Gemini Flash free tier limits)

**End Goal:** Suspicious pairs (Jaccard 0.6–0.8) now have an AI-generated explanation stored in the DB. The explanation cites specific evidence.

---

### Phase 4 End Goal
The full pipeline works: Submit → Execute → Fingerprint → Compare → (if suspicious) AI Analysis → Verdict stored. You can retrieve a human-readable plagiarism report for any submission pair.

---

## Phase 5: API Polish & Admin Dashboard
**Goal:** Expose all anti-cheat data through clean API endpoints and add a simple admin-facing report.
**Estimated Time:** 1–2 days
**Builds on:** Phase 4

### Sub-Phase 5.1 — Full API Endpoints

- [ ] `GET /plagiarism/submission/:id` — all checks for a submission, sorted by score
- [ ] `GET /plagiarism/problem/:problemId` — all flagged pairs, paginated
- [ ] `GET /plagiarism/check/:checkId` — full detail: both submission IDs, all scores, AI explanation, evidence array
- [ ] `POST /plagiarism/check` — manually trigger a check between two submission IDs (admin only)
- [ ] Add a `X-Admin-Key` header check on admin endpoints (just an env var secret — simple, not OAuth)

### Sub-Phase 5.2 — Response Formatting

- [ ] Standardize all responses to:
```json
{
  "submissionId": "...",
  "checks": [
    {
      "against": "...",
      "cosineScore": 0.91,
      "jaccardScore": 0.78,
      "aiScore": 0.88,
      "verdict": "plagiarized",
      "explanation": "Both submissions use an unusual sentinel value...",
      "evidence": ["Line 7: identical boundary condition", "..."]
    }
  ]
}
```
- [ ] Add verdict color codes in metadata: `clean` → `#00c853`, `suspicious` → `#ffab00`, `flagged` → `#d50000`

### Phase 5 End Goal
Any frontend (or Postman) can query the full plagiarism state of any submission with a single API call. The response is self-contained and human-readable.

---

## Phase 6: Testing, Hardening & Deployment
**Goal:** Verify the system actually catches cheaters and doesn't false-positive legitimate solutions.
**Estimated Time:** 2–3 days
**Builds on:** All phases

### Sub-Phase 6.1 — Ground Truth Test Suite

- [ ] Create `anticheat/tests/` directory
- [ ] Write test cases that MUST be flagged:
  - Original solution vs. renamed-variable copy
  - Original vs. reordered independent statements
  - Original vs. added dead code (`int unused = 0;`)
  - Original vs. changed loop style (`for` → `while` equivalent)
- [ ] Write test cases that MUST NOT be flagged:
  - Two independently-written BFS solutions (similar structure, different choices)
  - Short solutions to trivial problems (false positive risk)
- [ ] Run all cases through Phase 2 + Phase 4 and record scores
- [ ] Target: 0 false negatives on obvious copies, <5% false positives on legitimate

### Sub-Phase 6.2 — Docker Compose Update

- [ ] Add `anticheatWorker` service to `docker-compose.yml`:
```yaml
anticheat-worker:
  build: .
  container_name: spectral-anticheat
  command: node anticheatWorker.js
  environment:
    - DB_HOST=${DB_HOST}
    - REDIS_HOST=${REDIS_HOST}
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - POSTGRES_USER=${POSTGRES_USER}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_DB=${POSTGRES_DB}
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_started
```
- [ ] Add `GEMINI_API_KEY` to `.env` and `.env.example`
- [ ] Rebuild and verify all 3 workers (api, worker, anticheat-worker) start cleanly

### Sub-Phase 6.3 — Load & Rate Limit Testing

- [ ] Submit 20 solutions to the same problem, verify all get compared (not just sequential pairs)
- [ ] Verify Gemini is not called more than rate limit allows
- [ ] Verify Redis fingerprint cache hit rate is > 80% after warm-up

### Phase 6 End Goal
The full system runs in Docker. Plagiarism is detected correctly. No existing functionality is broken. You have a test suite proving it works.

---

## 5. Testing Strategy

**Unit tests (each phase):**
- `astParser`: same code, renamed vars → identical token array
- `winnow`: same fingerprints on rearranged independent blocks
- `jaccard`: manually verify scores against known pairs
- `geminiAnalyzer`: mock Gemini response, test JSON parsing & error handling

**Integration test:**
- Full pipeline: submit two copies → check DB for flagged `PlagiarismCheck` record within 30s

**Regression test:**
- After any change to normalization or hashing, re-run ground truth suite and verify scores don't shift by more than ±0.05

**Recommended tool:** Just use `node anticheat/tests/runAll.js` with `console.assert()` — no test framework needed for this project.

---

## 6. Deployment Notes

- The anti-cheat worker is stateless — it reads from DB and Redis, writes to DB. It can be scaled horizontally later.
- **Never** run Gemini calls synchronously in the submission hot path. Always via queue.
- Fingerprints should be recomputed and cached if the normalization algorithm changes (add a `schema_version` field to `ASTFingerprint`).
- Gemini costs: at 10 AI calls/minute on free tier, you won't hit limits during development. In production, Gemini Flash is ~$0.075/1M tokens — a full code comparison is ~500 tokens, so 1M tokens = 2000 comparisons = ~$0.075. Basically free.

---

## 7. Future Improvements (Post-MVP)

- **Cross-language detection:** normalize Python and C++ to a common IR — catch copies that were ported between languages
- **Template/boilerplate exclusion:** maintain a hash blacklist of common patterns (standard input reading, etc.) that should never trigger similarity
- **Similarity graph:** visualize clusters of similar submissions as a graph — submissions are nodes, edges are weighted by Jaccard score
- **Historical database:** compare against submissions from past contests, not just current
- **Browser fingerprinting:** detect same user submitting from multiple accounts (metadata-level, not code-level)
- **Diff view:** show exactly which AST subtrees matched between two flagged submissions

---

## Implementation Order Summary

| Week | What you build |
|---|---|
| Week 1 | Phase 1 (AST parser + normalization + DB storage) |
| Week 1–2 | Phase 2 (Winnowing + Jaccard — this is the impressive part) |
| Week 2 | Phase 3 (BullMQ anti-cheat worker + cosine pre-filter) |
| Week 2–3 | Phase 4 (Gemini integration + structured verdicts) |
| Week 3 | Phase 5 (API endpoints) + Phase 6 (testing + Docker) |

Total: **~3 weeks** for a complete, production-quality anti-cheat engine.
