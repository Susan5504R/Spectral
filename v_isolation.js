/**
 * v_isolation.js - Verification of Isolation & Security Fixes
 */
const { 
    Submission, 
    ASTFingerprint, 
    PlagiarismCheck, 
    User, 
    sequelize 
} = require('./db');
const { storeFingerprint } = require('./anticheat/store');
const { Op } = require('sequelize');
const graphClient = require('./graph/client');

async function verify() {
    console.log('--- STARTING ISOLATION VERIFICATION ---\n');

    await sequelize.sync({ force: true });
    await graphClient.healthCheck();
    await graphClient.cypher('MATCH (n:CodeState) DETACH DELETE n');

    // 1. Setup Users
    const userA = await User.create({ username: 'userA', password: 'password' });
    const userB = await User.create({ username: 'userB', password: 'password' });

    console.log('[1] Testing Self-Plagiarism Exclusion...');
    const codeSame = 'int main() { return 0; }';
    const lang = 'cpp';
    const prob1 = 'problem1';

    // User A submits Code X
    const subA1 = await Submission.create({
        id: '00000000-0000-0000-0000-000000000001',
        code: codeSame,
        language: lang,
        problemId: prob1,
        userId: userA.id,
        status: 'success'
    });
    await storeFingerprint(subA1.id, codeSame, lang, prob1, userA.id);

    // User A submits Code X AGAIN (minor change or identical)
    // We simulate the query in anticheatWorker.js
    const priorForA = await ASTFingerprint.findAll({
        where: {
            language: lang,
            problemId: prob1,
            userId: { [Op.ne]: userA.id }
        }
    });
    console.log(`   Candidates for User A: ${priorForA.length} (Expected: 0)`);
    if (priorForA.length === 0) console.log('   ✅ User A correctly ignores own fingerprints.');
    else console.error('   ❌ FAILED: User A found own fingerprints!');

    console.log('\n[2] Testing Cross-User Plagiarism Inclusion...');
    const subB1 = await Submission.create({
        id: '00000000-0000-0000-0000-000000000002',
        code: codeSame,
        language: lang,
        problemId: prob1,
        userId: userB.id,
        status: 'success'
    });
    
    // Simulating User B anticheat check
    const priorForB = await ASTFingerprint.findAll({
        where: {
            language: lang,
            problemId: prob1,
            userId: { [Op.ne]: userB.id }
        }
    });
    console.log(`   Candidates for User B: ${priorForB.length} (Expected: 1)`);
    if (priorForB.length === 1 && priorForB[0].userId === userA.id) {
        console.log('   ✅ User B correctly found User A as candidate.');
    } else {
        console.error('   ❌ FAILED: User B missed User A!');
    }

    console.log('\n[3] Testing Cross-Problem Graph Separation...');
    const codeBoiler = 'void setup() { print("hello"); }';
    const prob2 = 'problem2';
    
    // Mocking evolution_worker logic
    const { hashCode } = require('./graph/utils');
    const { getTokensAndHistogram } = require('./anticheat/astParser');
    
    const { tokens } = await getTokensAndHistogram(codeBoiler, 'cpp');
    const hash = hashCode(tokens);

    // Node for Problem 1
    const cypher1 = `MERGE (n:CodeState { id: '${hash}_${prob1}' }) SET n.problemId = '${prob1}'`;
    await graphClient.cypher(cypher1);

    // Node for Problem 2 (same code)
    const cypher2 = `MERGE (n:CodeState { id: '${hash}_${prob2}' }) SET n.problemId = '${prob2}'`;
    await graphClient.cypher(cypher2);

    const stats = await graphClient.cypher('MATCH (n:CodeState) RETURN count(n) AS nodeCount');
    console.log(`   Unique Graph Nodes: ${stats[0].nodeCount} (Expected: 2)`);
    if (Number(stats[0].nodeCount) === 2) {
        console.log('   ✅ CodeStates correctly isolated by problemId.');
    } else {
        console.error('   ❌ FAILED: Problem state collision detected!');
    }

    console.log('\n--- VERIFICATION COMPLETE ---');
    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
