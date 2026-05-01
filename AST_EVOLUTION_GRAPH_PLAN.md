# AST Evolution Graph — Implementation Plan
### Building a Code Knowledge Graph: tracking how humans think, not just what they submit

---

## 1. Project Overview

The AST Evolution Graph is a graph database layer that sits on top of your existing judge. Every time a user submits code for a problem, the system parses it into an AST, diffs it against their previous submission for the same problem, and stores the transformation as a labeled edge in a graph. Over time, the graph becomes a map of how real humans solve problems — what structural changes they make, in what order, and which paths lead to Accepted solutions fastest. When a user is stuck, the system queries this graph to find the most-traveled path from their current code state to a known-good state, and Gemini converts that graph path into a natural-language hint. No other OJ platform does this. The insight it generates is based on actual human problem-solving data, not generic AI text.

---

## 2. Recommended Tech Stack

### Graph Database

| Tool | Pros | Cons | Pricing | Best For | Verdict |
|---|---|---|---|---|---|
| **Apache AGE** (Postgres extension) | Same DB you already have, Cypher query language, no new container | Less mature than Neo4j, fewer community resources | Free/OSS | Existing Postgres stacks | ✅ **Use this** |
| Neo4j | Most mature graph DB, excellent tooling, great docs | Separate container, memory-heavy, licensing issues at scale | Free Community / $57+/mo AuraDB | Greenfield graph projects | ❌ Adds too much infra |
| Amazon Neptune | Fully managed, scales well | AWS lock-in, expensive ($0.10/hr minimum), overkill | $0.10/hr + storage | Production at scale | ❌ Too early |
| Redis Graph | Fast, in-memory | Deprecated by Redis Ltd in 2023 | N/A | — | ❌ Dead project |

**Verdict:** Apache AGE gives you graph capabilities directly inside your existing Postgres container. You write Cypher queries, store graph data alongside your relational data, and add zero new infrastructure. The maturity gap vs Neo4j is real but not blocking for this use case.

### AST Diffing Algorithm

| Algorithm | What it does | Complexity | Accuracy | Verdict |
|---|---|---|---|---|
| **Tree Edit Distance (Zhang-Shasha)** | Computes minimal edit operations between two trees | O(n²m²) worst case, fast in practice for code-sized trees | Very high | ✅ **Implement this yourself** |
| GumTree | Full AST diff library, maps moved nodes | High | Very high | ❌ Use the algorithm, don't import the Java library |
| Simple token diff (LCS) | Longest common subsequence on flattened tokens | O(nm) | Medium — misses moves | ❌ Too shallow |
| Myers diff (git-style) | Line-level diff | O(nd) | Low for ASTs | ❌ Wrong abstraction level |

**Verdict:** Implement Zhang-Shasha Tree Edit Distance yourself in Node.js. It's ~150 lines, genuinely impressive to have written yourself, and well-documented. The edit operations it returns (insert node, delete node, rename node) map directly to your transformation labels.

### Transformation Labeling

| Approach | How it works | Accuracy | Verdict |
|---|---|---|---|
| **Pattern matching on edit ops** | Match sequences of TED operations against known patterns ("delete for_statement + insert hash_map → Added HashMap") | High for common patterns | ✅ **Build this** |
| Gemini classification | Send both code snippets to Gemini, ask it to label the transformation | High but slow + costly | Use as fallback only |
| Manual rule engine | Hand-write 20–30 rules covering common optimizations | Medium | Good starting point |

**Verdict:** Start with a hand-written rule engine (~30 rules covering the most common competitive programming transformations). Use Gemini as a fallback classifier for patterns your rules don't catch. This hybrid approach is fast for known patterns and gracefully degrades to AI for novel ones.

### AI Hint Layer

| Service | Model | Why | Verdict |
|---|---|---|---|
| **Gemini 1.5 Flash** | gemini-1.5-flash | Fast, cheap, large context — can receive the full graph path + both code snippets | ✅ **Use this** |
| Gemini 1.5 Pro | gemini-1.5-pro | Better reasoning, needed only for complex explanations | Use for "deep explain" mode |

### Final Recommended Stack
- **Graph DB:** Apache AGE (Postgres extension — zero new infra)
- **AST parsing:** `tree-sitter` (already planned for anti-cheat — reuse it)
- **Tree diffing:** Custom Zhang-Shasha implementation in Node.js
- **Transformation labeling:** Rule engine + Gemini fallback
- **Hint generation:** Gemini 1.5 Flash
- **Queue:** BullMQ (already running) — graph updates run as a separate worker
- **Cache:** Redis — cache frequent path queries

---

## 3. Prerequisites

### Accounts & Keys
- [ ] Gemini API key from [Google AI Studio](https://aistudio.google.com/) — same one from anti-cheat plan
- [ ] Add `GEMINI_API_KEY` to `.env` if not already done

### Software & Extensions to Install
- [ ] Install Apache AGE Postgres extension:
```bash
# In your Postgres Docker container or on your DB host
apt-get install postgresql-server-dev-14  # match your pg version
git clone https://github.com/apache/age.git
cd age && make && make install
```
- [ ] Enable AGE in your database:
```sql
CREATE EXTENSION age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
```
- [ ] Install `tree-sitter` and language grammars (if not done for anti-cheat):
```bash
npm install tree-sitter tree-sitter-cpp tree-sitter-c tree-sitter-python tree-sitter-java
```
- [ ] Install Gemini SDK:
```bash
npm install @google/generative-ai
```

### Concepts to Understand Before Coding
- **Tree Edit Distance:** The minimum number of insert/delete/rename operations to transform tree A into tree B. [Read Zhang-Shasha 1989](https://epubs.siam.org/doi/10.1137/0218082) — the key insight is bottom-up dynamic programming on postorder traversals.
- **Apache AGE Cypher:** AGE uses the openCypher query language. Read the [AGE docs](https://age.apache.org/age-manual/master/index.html) — specifically CREATE, MATCH, and shortest path queries.
- **Graph node identity:** You need a way to say "these two ASTs represent the same code state." Use a hash of the normalized token array (from your anti-cheat work) as the node ID. Identical code = same hash = same node. This deduplicates the graph automatically.

### Schema Planning
```
Graph nodes  → "CodeState"   { hash, submissionId, language, problemId, complexity, tokenCount }
Graph edges  → "TRANSFORMED" { userId, timestamp, label, jaccardDelta, complexityDelta }

Relational   → TransformationLabel { id, fromHash, toHash, label, confidence, labeledBy }
             → HintQuery           { id, userId, problemId, fromHash, resultPath, geminiHint }
```

---

## 4. Implementation Phases

---

## Phase 1: Project Setup & Graph Infrastructure
**Goal:** Get Apache AGE running inside your existing Postgres container and verify you can create nodes and run Cypher queries from Node.js.
**Estimated Time:** 2–3 days
**Builds on:** Standalone — but assumes your existing `docker-compose.yml` Postgres setup

### What We're Building
A working graph database layer inside your existing Postgres instance. By the end of this phase, you can create `CodeState` nodes and `TRANSFORMED` edges programmatically from Node.js. No AST work yet — just the graph layer working end-to-end.

### Sub-Phase 1.1 — Apache AGE in Docker

**What:** Modify your existing Postgres Docker setup to include the AGE extension.

**How:**
- [ ] Create a custom Dockerfile for Postgres that installs AGE:
```dockerfile
# Dockerfile.postgres
FROM postgres:14

RUN apt-get update && apt-get install -y \
    build-essential \
    postgresql-server-dev-14 \
    git \
    flex bison

RUN git clone https://github.com/apache/age.git /age \
    && cd /age && make && make install

RUN echo "shared_preload_libraries = 'age'" >> /usr/share/postgresql/postgresql.conf.sample
```
- [ ] Update `docker-compose.yml` to use this custom image:
```yaml
db:
  build:
    context: .
    dockerfile: Dockerfile.postgres
  container_name: spectral-db
  ...
```
- [ ] Add an init SQL script that enables AGE on startup:
```sql
-- init/01_age.sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT create_graph('spectral_graph');
```
- [ ] Mount the init script in docker-compose:
```yaml
volumes:
  - ./init:/docker-entrypoint-initdb.d
  - pgdata:/var/lib/postgresql/data
```
- [ ] Rebuild and verify: `docker exec spectral-db psql -U postgres -c "SELECT * FROM ag_graph;"`

**End Goal:** Apache AGE is running inside your Postgres container. `ag_graph` shows `spectral_graph`. No Node.js connection yet.

---

### Sub-Phase 1.2 — Node.js Graph Client

**What:** Write a thin wrapper around `pg` (already in your stack) to execute Cypher queries via AGE's SQL interface.

**How:**
- [ ] Create `graph/client.js`:
```js
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'mysecretpassword',
    database: process.env.POSTGRES_DB || 'postgres',
    port: process.env.DB_PORT || 5432,
});

// AGE requires this search path to be set per connection
async function cypher(query, params = []) {
    const client = await pool.connect();
    try {
        await client.query("SET search_path = ag_catalog, \"$user\", public;");
        await client.query("LOAD 'age';");
        const res = await client.query(
            `SELECT * FROM cypher('spectral_graph', $$ ${query} $$) AS (result agtype);`,
            params
        );
        return res.rows;
    } finally {
        client.release();
    }
}

module.exports = { cypher };
```
- [ ] Test creating a node:
```js
const { cypher } = require('./graph/client');
cypher("CREATE (n:CodeState {hash: 'abc123', language: 'cpp'}) RETURN n")
  .then(console.log).catch(console.error);
```
- [ ] Test creating an edge between two nodes:
```js
cypher(`
  MATCH (a:CodeState {hash: 'abc123'}), (b:CodeState {hash: 'def456'})
  CREATE (a)-[e:TRANSFORMED {label: 'Added HashMap', userId: 'u1'}]->(b)
  RETURN e
`)
```
- [ ] Verify both node and edge appear via: `MATCH (n) RETURN n`

**End Goal:** You can run Cypher queries from Node.js against your AGE graph. Nodes and edges persist across restarts.

---

### Sub-Phase 1.3 — Graph Schema & Indexes

**What:** Define the node/edge structure and add indexes for the queries you'll run most.

**How:**
- [ ] Create `graph/schema.js` — a one-time setup script:
```js
// Creates indexes for fast lookups
const { cypher } = require('./client');

async function setup() {
    // AGE uses Postgres btree indexes on vertex/edge properties
    await cypher(`CREATE INDEX ON :CodeState(hash)`);
    await cypher(`CREATE INDEX ON :CodeState(problemId)`);
    await cypher(`CREATE INDEX ON :TRANSFORMED(userId)`);
    console.log('Graph schema ready');
}
setup();
```
- [ ] Run once: `node graph/schema.js`
- [ ] Add `problemId`, `language`, `complexity` as required properties on `CodeState` nodes
- [ ] Document the edge properties: `userId`, `timestamp`, `label`, `jaccardDelta` (how much Jaccard similarity changed), `complexityDelta` (estimated Big-O change, e.g. -1 means went from O(N²) to O(N))

**End Goal:** Graph has proper indexes. You know exactly what properties every node and edge will carry.

---

### Phase 1 End Goal
Apache AGE runs inside your existing Postgres container. You have a `graph/client.js` module that executes Cypher queries from Node.js. You can create nodes, create edges, and query them. Zero changes to your existing submission flow yet.

---

## Phase 2: AST Diffing Engine (Zhang-Shasha from Scratch)
**Goal:** Implement Tree Edit Distance yourself to compute the structural difference between two ASTs.
**Estimated Time:** 3–5 days
**Builds on:** Phase 1 (uses tree-sitter from anti-cheat plan if built, otherwise standalone)

### What We're Building
`graph/treeDiff.js` — a pure Node.js implementation of the Zhang-Shasha Tree Edit Distance algorithm. It takes two tree-sitter syntax trees and returns a list of edit operations: `{op: 'insert'|'delete'|'rename', node: ..., from: ..., to: ...}`. This list is the raw material for transformation labeling in Phase 3.

### Sub-Phase 2.1 — Tree Representation

**What:** Convert tree-sitter's SyntaxNode into a simpler internal tree structure that Zhang-Shasha can operate on.

**How:**
- [ ] Create `graph/treeDiff.js`
- [ ] Define an internal node type:
```js
// simple tree node — just type + children
function makeNode(type, children = []) {
    return { type, children, id: Math.random().toString(36).slice(2) };
}
```
- [ ] Write `fromTreeSitter(tsNode)` — converts a tree-sitter SyntaxNode recursively:
```js
function fromTreeSitter(n) {
    // skip whitespace/comment nodes — they add noise
    if (n.type === 'comment' || n.isNamed === false) return null;
    
    const children = [];
    for (let i = 0; i < n.childCount; i++) {
        const child = fromTreeSitter(n.child(i));
        if (child) children.push(child);
    }
    
    // anonymize identifiers (same as anti-cheat normalization)
    const type = (n.type === 'identifier') ? 'ID' : n.type;
    return makeNode(type, children);
}
```
- [ ] Write `postorder(root)` — returns nodes in postorder (left subtree, right subtree, root). This is required by Zhang-Shasha:
```js
function postorder(root) {
    const out = [];
    function walk(n) {
        for (const c of n.children) walk(c);
        out.push(n);
    }
    walk(root);
    return out;
}
```
- [ ] Write `leftmostLeaf(node, postorderArr)` — returns the index of the leftmost leaf descendant. Cache this — it's called many times in Zhang-Shasha.

**End Goal:** Given a tree-sitter parse result, you can call `fromTreeSitter(root)` and get a clean internal tree, and `postorder(root)` gives you the array Zhang-Shasha needs.

---

### Sub-Phase 2.2 — Zhang-Shasha Core Algorithm

**What:** Implement the actual TED algorithm. This is the hardest part — read the algorithm carefully before coding.

**How:**
- [ ] Understand the algorithm structure first (do this before writing code):
  - Zhang-Shasha works bottom-up on postorder arrays
  - It computes a DP table `td[i][j]` = edit distance between subtree rooted at node i (in tree 1) and subtree rooted at node j (in tree 2)
  - Key insight: nodes with the same `leftmostLeaf` value form "keyroots" — the algorithm only needs to fully compute TED for keyroot pairs, others are reused
- [ ] Write `getKeyroots(postorderArr)`:
```js
function getKeyroots(nodes) {
    const leftmost = new Map(); // leftmostLeaf index → rightmost node with that leftmost
    nodes.forEach((n, i) => {
        const lm = leftmostLeafIdx(n, nodes);
        leftmost.set(lm, i); // later index wins — that's the keyroot
    });
    return [...leftmost.values()].sort((a, b) => a - b);
}
```
- [ ] Write the main `ted(tree1, tree2)` function — returns `{distance, ops}`:
```js
function ted(t1, t2) {
    const nodes1 = postorder(t1);
    const nodes2 = postorder(t2);
    const kr1 = getKeyroots(nodes1);
    const kr2 = getKeyroots(nodes2);
    
    // td[i][j] = edit distance, treedist is the partial table
    const td = Array.from({length: nodes1.length}, () => new Array(nodes2.length).fill(0));
    
    for (const i of kr1) {
        for (const j of kr2) {
            computeTreeDist(i, j, nodes1, nodes2, td);
        }
    }
    
    return td[nodes1.length-1][nodes2.length-1];
}
```
- [ ] Write `computeTreeDist(i, j, nodes1, nodes2, td)` — the inner DP. Cost model: insert = 1, delete = 1, rename = 0 if same type, 1 if different
- [ ] **This step commonly runs over** — budget 2 full days just for getting Zhang-Shasha correct. Use small hand-crafted trees to verify: `if(x){}` vs `while(x){}` should cost 1 (rename if→while).
- [ ] Add a size guard: if either tree has > 500 nodes, skip TED and fall back to token-level Jaccard. TED is O(n²m²) and large trees will block the event loop.

**End Goal:** `ted(tree1, tree2)` returns an integer distance. `if(x<10) return x;` vs `if(x<10) return x+1;` should return distance 1 (one rename on the literal node).

---

### Sub-Phase 2.3 — Edit Operation Extraction

**What:** Extend Zhang-Shasha to return the actual edit operations (not just the distance integer), so Phase 3 can label them.

**How:**
- [ ] Modify `computeTreeDist` to also store the backtrace — which operation was chosen at each DP cell
- [ ] Write `backtrack(td, nodes1, nodes2)` — walks the DP table backward and builds an ops array:
```js
// ops format:
[
  { op: 'delete', node: { type: 'for_statement' } },
  { op: 'insert', node: { type: 'call_expression', callee: 'unordered_map' } },
  { op: 'rename', from: 'while_statement', to: 'for_statement' }
]
```
- [ ] Export `diff(code1, code2, lang)` as the public API — handles parse + TED + backtrack in one call
- [ ] Test: diff a bubble sort against the same bubble sort with one extra variable → should return 1 insert op

**End Goal:** `diff(codeA, codeB, 'cpp')` returns `{ distance: N, ops: [...] }`. The ops list describes exactly what changed structurally between the two submissions.

---

### Phase 2 End Goal
You have a from-scratch Tree Edit Distance implementation in ~200 lines of Node.js. You can call `diff(code1, code2, lang)` and get back a list of structural edit operations. This is the hardest phase — once it works, everything downstream is straightforward.

---

## Phase 3: Transformation Labeling Engine
**Goal:** Convert raw edit operation lists into human-readable transformation labels like "Added HashMap", "Removed Nested Loop", "Changed Recursion to DP".
**Estimated Time:** 3–4 days
**Builds on:** Phase 2

### What We're Building
`graph/labeler.js` — a rule engine that takes the `ops` array from Phase 2 and returns a label string. You'll write ~30 rules covering the most common competitive programming optimizations. For patterns your rules don't match, Gemini classifies it. The label becomes the edge annotation in the graph.

### Sub-Phase 3.1 — Rule Engine

**What:** Write pattern-matching rules over the edit ops array.

**How:**
- [ ] Create `graph/labeler.js` with a `rules` array:
```js
const rules = [
    {
        label: 'Added HashMap',
        match: (ops) => ops.some(o => o.op === 'insert' && 
            (o.node.type === 'call_expression' && 
             ['unordered_map', 'map', 'HashMap', 'dict'].some(t => o.node.callee?.includes(t))))
    },
    {
        label: 'Removed Nested Loop',
        match: (ops) => {
            const deleted = ops.filter(o => o.op === 'delete' && o.node.type === 'for_statement');
            return deleted.length >= 1; // at least one for loop was removed
        }
    },
    {
        label: 'Added Memoization',
        match: (ops) => ops.some(o => o.op === 'insert' && 
            (o.node.type === 'array_declarator' || o.node.type === 'subscript_expression'))
        && ops.some(o => o.op === 'delete' && false) // placeholder — refine per language
    },
    {
        label: 'Recursion to Iteration',
        match: (ops) => ops.some(o => o.op === 'delete' && o.node.type === 'call_expression') &&
                        ops.some(o => o.op === 'insert' && o.node.type === 'while_statement')
    },
    {
        label: 'Added Binary Search',
        match: (ops) => ops.some(o => o.op === 'insert' && 
            ['lower_bound', 'upper_bound', 'binary_search'].some(fn => o.node.callee?.includes(fn)))
    },
    {
        label: 'Changed Sort',
        match: (ops) => ops.some(o => o.op === 'insert' && o.node.callee?.includes('sort')) &&
                        ops.some(o => o.op === 'delete' && o.node.type === 'for_statement')
    },
    // add ~25 more covering: two-pointer, sliding window, BFS→DFS, stack→queue, etc.
];
```
- [ ] Write `applyRules(ops)`:
```js
function applyRules(ops) {
    const matched = rules.filter(r => r.match(ops)).map(r => r.label);
    return matched.length > 0 ? matched : null; // null = no rule matched
}
```
- [ ] Write rules for at least these patterns: Added HashMap, Removed Nested Loop, Added Memoization, Recursion→Iteration, Added Binary Search, Changed Sort, Added Two Pointers, Added Prefix Sum, Added Stack, Added Queue, Reduced Comparisons, Added Early Exit, Changed Data Structure, Added Sorting Step

**End Goal:** `applyRules(ops)` returns `['Added HashMap', 'Removed Nested Loop']` for an ops list that contains those patterns. Returns `null` for unrecognized patterns.

---

### Sub-Phase 3.2 — Gemini Fallback Classifier

**What:** When rules return null, send both code snippets to Gemini and ask it to label the transformation.

**How:**
- [ ] Create `graph/geminiLabeler.js`:
```js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function classifyTransformation(code1, code2, lang) {
    const prompt = `
You are analyzing two ${lang} submissions for the same competitive programming problem.
The user rewrote their solution. Identify what algorithmic transformation happened.

Before:
\`\`\`${lang}
${code1}
\`\`\`

After:
\`\`\`${lang}
${code2}
\`\`\`

Respond ONLY with a JSON object:
{
  "label": "<short transformation name, max 5 words>",
  "confidence": <float 0.0-1.0>,
  "explanation": "<one sentence>"
}

Examples of good labels: "Added HashMap", "Removed Nested Loop", "Recursion to DP", "Added Binary Search", "Two Pointer Approach"
`;
    const res = await model.generateContent(prompt);
    const text = res.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
}

module.exports = { classifyTransformation };
```
- [ ] Wire it into a unified `label(ops, code1, code2, lang)` function in `labeler.js`:
```js
async function label(ops, code1, code2, lang) {
    const ruleResult = applyRules(ops);
    if (ruleResult) return { labels: ruleResult, source: 'rule', confidence: 1.0 };
    
    // fallback to Gemini
    const aiResult = await classifyTransformation(code1, code2, lang);
    return { labels: [aiResult.label], source: 'gemini', confidence: aiResult.confidence };
}
```
- [ ] Cache Gemini results in Redis by hash pair: `label:{hash1}:{hash2}` with 24h TTL — don't re-call API for the same pair

**End Goal:** `label(ops, code1, code2, 'cpp')` always returns a label — from rules if possible, from Gemini if not. Result is cached.

---

### Sub-Phase 3.3 — Complexity Estimation

**What:** Estimate Big-O complexity from AST structure — needed for the `complexityDelta` edge property.

**How:**
- [ ] Write `graph/complexity.js` — a simple heuristic estimator, not a theorem prover:
```js
function estimateComplexity(tree) {
    let maxNesting = 0;
    let cur = 0;
    
    function walk(n) {
        const isLoop = ['for_statement','while_statement','do_statement'].includes(n.type);
        if (isLoop) cur++;
        maxNesting = Math.max(maxNesting, cur);
        for (const c of n.children) walk(c);
        if (isLoop) cur--;
    }
    walk(tree);
    
    // crude but useful heuristic
    if (maxNesting === 0) return 'O(1)';
    if (maxNesting === 1) return 'O(N)';
    if (maxNesting === 2) return 'O(N^2)';
    return `O(N^${maxNesting})`;
}
```
- [ ] Also check for recursion: if a `function_definition` contains a `call_expression` that calls itself, flag as potentially O(2^N) or O(N!) depending on branching
- [ ] Store the estimated complexity string on `CodeState` nodes
- [ ] Compute `complexityDelta` as the numeric exponent difference: O(N²)→O(N) = delta of -1

**End Goal:** `estimateComplexity(tree)` returns a string like `'O(N^2)'`. Two consecutive submissions show a `complexityDelta` of -1 in their edge, making it queryable.

---

### Phase 3 End Goal
Given two code submissions, you can now call `diff + label + estimateComplexity` and get back: edit distance, labeled transformation, complexity before/after. The full edge data for the graph is ready to be stored.

---

## Phase 4: Graph Population Worker
**Goal:** Wire the AST diff + labeling pipeline into a BullMQ worker that automatically updates the graph after every submission.
**Estimated Time:** 2–3 days
**Builds on:** Phase 1, 2, 3

### What We're Building
`evolutionWorker.js` — a third BullMQ worker (alongside your existing code worker and anti-cheat worker) that triggers after every accepted submission. It finds the user's previous submission for the same problem, runs the diff pipeline, and writes a new node + edge to the graph.

### Sub-Phase 4.1 — Evolution Queue Setup

**What:** Add a third queue to your system and trigger it from `worker.js`.

**How:**
- [ ] Create `graph/evolutionQueue.js`:
```js
const { Queue } = require('bullmq');
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const evoQueue = new Queue('evolution', { connection: { host: REDIS_HOST, port: 6379 } });
module.exports = { evoQueue };
```
- [ ] In `worker.js`, after `Submission.update({ status: "Accepted" })`, add:
```js
const { evoQueue } = require('./graph/evolutionQueue');
await evoQueue.add('evolve', { submissionId, userId, problemId, language, code });
```
  *(Add `userId` and `problemId` to your submission schema now if not already there)*
- [ ] Create `evolutionWorker.js` in the project root — skeleton:
```js
const { Worker } = require('bullmq');
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';

const worker = new Worker('evolution', async (job) => {
    const { submissionId, userId, problemId, language, code } = job.data;
    // Phase 4.2 logic goes here
}, { connection: { host: REDIS_HOST, port: 6379 } });

console.log('Evolution Worker live');
```

**End Goal:** Every accepted submission now enqueues an evolution job. The worker receives it (even if it does nothing yet).

---

### Sub-Phase 4.2 — Full Evolution Pipeline

**What:** Implement the worker's core logic — find previous submission, diff, label, write to graph.

**How:**
- [ ] Inside the worker job handler:
```js
// 1. find user's previous submission for same problem
const prev = await Submission.findOne({
    where: { userId, problemId, status: 'Accepted', id: { [Op.ne]: submissionId } },
    order: [['createdAt', 'DESC']]
});

if (!prev) {
    // first submission — just create the CodeState node, no edge
    const hash = hashCode(code, language); // see below
    await cypher(`
        CREATE (:CodeState {hash: '${hash}', submissionId: '${submissionId}', 
                            problemId: '${problemId}', language: '${language}'})
    `);
    return;
}

// 2. diff current vs previous
const { ops, distance } = await diff(prev.code, code, language);

// 3. label the transformation
const { labels, confidence } = await label(ops, prev.code, code, language);

// 4. estimate complexities
const prevTree = parse(prev.code, language);
const curTree  = parse(code, language);
const prevComplexity = estimateComplexity(prevTree);
const curComplexity  = estimateComplexity(curTree);

// 5. hash both code states (normalized token hash — reuse anti-cheat work)
const prevHash = hashCode(prev.code, language);
const curHash  = hashCode(code, language);

// 6. upsert both nodes + create edge
await cypher(`
    MERGE (a:CodeState {hash: '${prevHash}'})
    MERGE (b:CodeState {hash: '${curHash}'})
    CREATE (a)-[:TRANSFORMED {
        userId: '${userId}',
        label: '${labels.join(', ')}',
        distance: ${distance},
        complexityDelta: ${complexityDelta},
        timestamp: ${Date.now()}
    }]->(b)
`);
```
- [ ] Write `hashCode(code, lang)` in `graph/utils.js` — SHA-256 of the normalized token array (reuse `getTokensAndHistogram` from anti-cheat if built):
```js
const crypto = require('crypto');
function hashCode(tokens) {
    return crypto.createHash('sha256').update(tokens.join('|')).digest('hex').slice(0, 16);
}
```
- [ ] Add `MERGE` instead of `CREATE` for nodes — this is crucial. If two users write the same code, they map to the same `CodeState` node, naturally clustering the graph.

**End Goal:** Submit two consecutive solutions for the same problem → check the graph → two `CodeState` nodes connected by a `TRANSFORMED` edge with a real label on it.

---

### Sub-Phase 4.3 — Docker Compose & Deployment

**What:** Add the evolution worker as a new container.

**How:**
- [ ] Add to `docker-compose.yml`:
```yaml
evolution-worker:
  build: .
  container_name: spectral-evolution
  command: node evolutionWorker.js
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
- [ ] Rebuild all containers: `docker-compose up --build`
- [ ] Submit 3 iterations of the same problem and inspect the graph:
```sql
SELECT * FROM cypher('spectral_graph', $$ MATCH (a)-[e:TRANSFORMED]->(b) RETURN a, e, b $$) AS (a agtype, e agtype, b agtype);
```

**End Goal:** All 4 containers (api, worker, anticheat-worker, evolution-worker) start cleanly. The graph grows automatically with every accepted submission.

---

### Phase 4 End Goal
The graph is live and self-populating. Every accepted submission triggers a background diff. The graph accumulates `CodeState` nodes and `TRANSFORMED` edges automatically. Labels appear on edges. You can inspect the growing graph via SQL.

---

## Phase 5: Path Query & Gemini Hint Engine
**Goal:** Query the graph for the most-traveled path from a user's current code state to an Accepted state, and generate a Gemini hint from that path.
**Estimated Time:** 3–4 days
**Builds on:** Phase 4

### What We're Building
`graph/hintEngine.js` — takes a user's current code + problem ID, finds their current `CodeState` node in the graph, runs a Cypher path query to find the most common sequence of transformations taken by other users who succeeded, and passes that path to Gemini to generate a personalized, data-driven hint. This is the payoff of the whole system.

### Sub-Phase 5.1 — Most-Traveled Path Query

**What:** Write the Cypher query that finds the highest-frequency path from a given code state to any known Accepted state for a problem.

**How:**
- [ ] Mark Accepted terminal nodes — when a submission gets `status: Accepted` and it's the last one (user stopped submitting), add an `accepted: true` property to the node
- [ ] Write the path query in `graph/hintEngine.js`:
```js
async function findBestPath(fromHash, problemId) {
    // Find all paths from this node to any accepted node for this problem
    // Count how many distinct users traversed each path
    // Return the most-traveled one
    const rows = await cypher(`
        MATCH path = (start:CodeState {hash: '${fromHash}'})-[:TRANSFORMED*1..5]->(end:CodeState {accepted: true, problemId: '${problemId}'})
        WITH path, relationships(path) AS edges
        UNWIND edges AS e
        WITH path, count(DISTINCT e.userId) AS userCount
        RETURN path, userCount
        ORDER BY userCount DESC
        LIMIT 1
    `);
    return rows[0] || null;
}
```
- [ ] Parse the returned path into a readable sequence:
```js
function parsePath(pathResult) {
    // extract edge labels in order
    // returns: ['Added HashMap', 'Removed Nested Loop']
}
```
- [ ] Handle the case where no path exists (user is on a novel dead-end) — return null, fall back to generic Gemini hint

**End Goal:** `findBestPath(hash, problemId)` returns the sequence of transformation labels that most users followed to get from this code state to Accepted.

---

### Sub-Phase 5.2 — Gemini Hint Generation from Path

**What:** Convert the graph path into a natural-language hint using Gemini.

**How:**
- [ ] Write `generateHint(userCode, pathLabels, lang)` in `graph/hintEngine.js`:
```js
async function generateHint(userCode, pathLabels, lang) {
    const steps = pathLabels.join(' → ');
    const prompt = `
You are a competitive programming mentor. A user is stuck on a problem.
Based on data from other users who solved this problem, the optimal path forward is:
${steps}

The user's current code:
\`\`\`${lang}
${userCode}
\`\`\`

Give a Socratic hint (do NOT give code). Explain the first transformation they should make ("${pathLabels[0]}") in terms of their specific code — reference their actual variable names, loop structures, or data structures. 2-3 sentences max. Do not reveal the full solution path.
`;
    const res = await model.generateContent(prompt);
    return res.response.text();
}
```
- [ ] Add a `GET /hint/:submissionId` endpoint in `server.js`:
```js
app.get('/hint/:submissionId', async (req, res) => {
    const sub = await Submission.findByPk(req.params.submissionId);
    if (!sub) return res.status(404).json({ error: 'not found' });
    
    const hash = hashCode(sub.code, sub.language);
    const path = await findBestPath(hash, sub.problemId);
    
    if (!path) return res.json({ hint: 'No path data yet — try submitting more solutions first.' });
    
    const hint = await generateHint(sub.code, path.labels, sub.language);
    res.json({ hint, pathTaken: path.labels, supportedByUsers: path.userCount });
});
```
- [ ] Cache hint results in Redis by `hint:{submissionId}` with 1h TTL

**End Goal:** `GET /hint/:submissionId` returns a real, data-driven hint. The response includes what graph path was used and how many users took that path — making the hint provably grounded in real data.

---

### Sub-Phase 5.3 — Graph Statistics Endpoint

**What:** Expose graph analytics — most common transformation patterns per problem, user evolution timeline.

**How:**
- [ ] Add `GET /graph/problem/:problemId/patterns` — returns top 10 transformation labels for a problem sorted by frequency
- [ ] Add `GET /graph/user/:userId/evolution` — returns the user's full code evolution timeline as a list of states + transitions
- [ ] Add `GET /graph/stats` — total nodes, total edges, most common labels globally
- [ ] These are pure Cypher queries — no AI needed:
```js
// top patterns for a problem
cypher(`
    MATCH ()-[e:TRANSFORMED {problemId: '${problemId}'}]->()
    RETURN e.label AS label, count(*) AS freq
    ORDER BY freq DESC LIMIT 10
`)
```

**End Goal:** Three read-only analytics endpoints work. You can see exactly which transformations are most common for any problem — this data is intrinsically valuable and grows over time.

---

### Phase 5 End Goal
The full system is live. Users can request hints backed by real graph data. The hint tells them specifically what transformation to make, grounded in what worked for other users. The platform exposes graph analytics showing collective human problem-solving patterns. This is the feature no other OJ has.

---

## Phase 6: Testing, Hardening & Deployment
**Goal:** Verify correctness, handle edge cases, and deploy all 4 workers cleanly.
**Estimated Time:** 2–3 days
**Builds on:** All phases

### Sub-Phase 6.1 — Zhang-Shasha Correctness Tests

- [ ] Create `graph/tests/tedTests.js` with hand-verified cases:
```js
// same tree → distance 0
// one node renamed → distance 1
// one node inserted → distance 1
// for→while (rename) → distance 1
// flat array lookup added → distance ~3-5
// nested loop removed → distance > 5
```
- [ ] Run with `node graph/tests/tedTests.js` — use `console.assert`
- [ ] Test the size guard: generate a 600-node tree and verify it falls back to Jaccard without crashing

### Sub-Phase 6.2 — Graph Integrity Tests

- [ ] Submit the same code twice → verify `MERGE` creates only one node (not two)
- [ ] Submit 3 iterations of same problem → verify a 3-node path exists in graph
- [ ] Submit two different users' identical code → verify they share the same `CodeState` node but have separate edges with different `userId`

### Sub-Phase 6.3 — Hint Quality Validation

- [ ] Manually submit a known O(N²) bubble sort solution, then the O(N log N) sort solution
- [ ] Call `GET /hint/:firstSubmissionId`
- [ ] Verify hint mentions "sorting" or "complexity" — not a generic platitude
- [ ] Verify `pathTaken` in response contains a real label like `"Changed Sort"`

### Sub-Phase 6.4 — Load Test

- [ ] Submit 50 accepted solutions across 5 problems (10 each)
- [ ] Verify evolution worker processes all jobs without queue backup
- [ ] Verify Gemini is not called more than 10 times/minute (rate limit guard)
- [ ] Check graph node count: should be ≤ 50 if all solutions are distinct, less if some share code states

### Phase 6 End Goal
All tests pass. The system handles duplicate code states correctly. Hints are meaningful. All 4 containers run stably. You have a working, tested, genuinely novel feature.

---

## 5. Testing Strategy

**Unit tests per phase:**
- Phase 2: TED correctness on hand-crafted tree pairs — non-negotiable, bugs here corrupt everything downstream
- Phase 3: Rule matching — feed known ops arrays and assert correct labels
- Phase 4: Graph `MERGE` idempotency — same code submitted twice = same node count
- Phase 5: Path query — manually insert known graph structure, verify path query finds it

**Integration test:**
- Submit code → wait 5s → call hint endpoint → verify response contains `pathTaken` array

**Regression test:**
- After any change to normalization or TED, re-run Phase 6.1 tests and verify distances don't change by more than ±1

---

## 6. Deployment Notes

- The evolution worker is stateless — reads from Submission table, writes to graph. Horizontally scalable.
- **Never** run Gemini hint generation in the submission hot path. Always async via the hint endpoint.
- Apache AGE has known memory usage spikes on large graph traversals — add `LIMIT` to all path queries in production.
- Add `schema_version` to `CodeState` nodes. If you change the normalization algorithm, you'll need to recompute hashes — version lets you filter stale nodes.
- Gemini costs for hints: each hint call is ~800 tokens = ~$0.00006. Essentially free even at scale.

---

## 7. Future Improvements (Post-MVP)

- **Cross-language evolution:** detect when a user rewrites their C++ solution in Python — normalize both to the same token space and diff them
- **Similarity clustering:** group `CodeState` nodes by Jaccard similarity → show users "you're thinking like 47 other people who solved this"
- **Dead-end detection:** identify `CodeState` nodes with many outgoing edges but few reaching Accepted — proactively warn users they're on a hard path
- **Transformation leaderboard:** track which users make the most insightful single-step transformations (high complexity delta, low edit distance)
- **Visual graph explorer:** render the problem's evolution graph as a force-directed D3.js visualization — show users the landscape of how everyone solved the problem
- **Export to research:** the accumulated graph is a dataset of human algorithmic thinking — publishable

---

## Implementation Order Summary

| Week | What you build |
|---|---|
| Week 1 | Phase 1 (AGE setup + graph client) + Phase 2.1 (tree representation) |
| Week 1–2 | Phase 2.2–2.3 (Zhang-Shasha — give this time, don't rush it) |
| Week 2 | Phase 3 (rule engine + Gemini labeler + complexity estimator) |
| Week 2–3 | Phase 4 (evolution worker + graph population) |
| Week 3 | Phase 5 (path queries + hint engine + analytics endpoints) |
| Week 3–4 | Phase 6 (testing + hardening + Docker) |

Total: **~3–4 weeks** for a complete, production-quality AST Evolution Graph engine.

The Zhang-Shasha implementation in Phase 2 is your hardest and most impressive artifact. Budget real time for it. Everything else flows from getting that right.
