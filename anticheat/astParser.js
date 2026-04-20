const Parser = require('web-tree-sitter');
const path = require('path');

const parsers = {};
let initialized = false;

// Sub-Phase 1.1 — tree-sitter Setup & Language Loading
async function initParsers() {
    if (initialized) return;
    await Parser.init();
    
    // Load wasm from the tree-sitter-wasms module
    const wasmDir = path.join(__dirname, '..', 'node_modules', 'tree-sitter-wasms', 'out');
    const loadWasm = async (name) => {
        return await Parser.Language.load(path.join(wasmDir, name));
    };

    const cppWasm = await loadWasm('tree-sitter-cpp.wasm');
    const cWasm = await loadWasm('tree-sitter-c.wasm');
    const pythonWasm = await loadWasm('tree-sitter-python.wasm');
    const javaWasm = await loadWasm('tree-sitter-java.wasm');

    const cppParser = new Parser(); cppParser.setLanguage(cppWasm);
    const cParser = new Parser(); cParser.setLanguage(cWasm);
    const pythonParser = new Parser(); pythonParser.setLanguage(pythonWasm);
    const javaParser = new Parser(); javaParser.setLanguage(javaWasm);

    parsers['cpp'] = cppParser;
    parsers['c'] = cParser;
    parsers['python'] = pythonParser;
    parsers['java'] = javaParser;
    
    initialized = true;
}

// Sub-Phase 1.2 — AST Normalization
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

function buildHistogram(tokens) {
    const hist = {};
    for (const t of tokens) {
        hist[t] = (hist[t] || 0) + 1;
    }
    return hist;
}

async function getTokensAndHistogram(code, lang) {
    await initParsers();
    const parser = parsers[lang];
    if (!parser) throw new Error(`Unsupported language: ${lang}`);
    
    const tree = parser.parse(code);
    if (tree.rootNode.hasError) {
        // Notice: If tree-sitter returns a tree with errors, we can still trace it,
        // but plan suggests to mark it as error or just continue. 
        // We'll normalize it anyway but keep in mind it might be unparseable logic.
    }
    
    const tokens = normalize(tree.rootNode);
    const histogram = buildHistogram(tokens);
    
    return { tokens, histogram };
}

module.exports = {
    initParsers,
    getTokensAndHistogram,
    normalize,
    buildHistogram
};
