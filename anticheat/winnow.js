// anticheat/winnow.js

// Sub-Phase 2.1 — k-gram Hashing
function kgrams(tokens, k) {
    const out = [];
    for (let i = 0; i <= tokens.length - k; i++)
        out.push(tokens.slice(i, i + k).join('|'));
    return out;
}

function hashKgram(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++)
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h >>> 0; // unsigned
}

function hashAll(tokens, k) {
    return kgrams(tokens, k).map(hashKgram);
}

// Sub-Phase 2.2 — Sliding Window Minimum
function winnow(hashes, w) {
    const fps = new Set();
    if (hashes.length === 0) return fps;
    if (hashes.length < w) {
        fps.add(Math.min(...hashes));
        return fps;
    }
    
    for (let i = 0; i <= hashes.length - w; i++) {
        const window = hashes.slice(i, i + w);
        fps.add(Math.min(...window));
    }
    return fps;
}

function getFingerprints(tokens, k = 5, w = 4) {
    const hashes = hashAll(tokens, k);
    return winnow(hashes, w);
}

// Sub-Phase 2.3 — Jaccard Similarity Scoring
function jaccard(a, b) {
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : inter / union;
}

// Phase 3 - Cosine Similarity
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

module.exports = {
    kgrams,
    hashKgram,
    hashAll,
    winnow,
    getFingerprints,
    jaccard,
    cosineSim
};
