'use strict';

/**
 * graph/tests/phase5_verify.js — Phase 5 Orchestration
 *
 * Simulates:
 *   1. User submitting an O(N^2) sorting solution (status: success, but slow).
 *   2. User submitting an O(N log N) std::sort solution (status: success).
 *   3. Testing the hintEngine.getOrGenerateHint() on the first submission
 *      to ensure it traces the graph path and hits Gemini correctly.
 */

const { Submission, TransformationLabel, HintQuery, sequelize } = require('../../db');
const { processEvolutionParams } = require('../../evolution_worker');
const { getOrGenerateHint }      = require('../hintEngine');
const graphClient                = require('../client');
const crypto                     = require('crypto');

async function run() {
    console.log('── Phase 5 E2E Hint & Path Verification ──');

    await sequelize.authenticate();
    await graphClient.healthCheck();

    // Clean up test data
    const testUserId = '00000000-0000-0000-0000-000000000005';
    const testProbId = 'prob_p5_test';
    
    await Submission.destroy({ where: { userId: testUserId } });
    const { User } = require('../../db');
    await User.destroy({ where: { id: testUserId } });
    await User.create({ id: testUserId, username: 'testuser_p5', password: 'password' });

    await graphClient.cypher(`MATCH (n:CodeState) DETACH DELETE n`); 
    await TransformationLabel.destroy({ where: {} });
    await HintQuery.destroy({ where: {} });

    // ── 1. Create S1 (Slow, O(N^2)) ──
    const code1 = `
#include <iostream>
using namespace std;
int main() {
    int n, a[100]; cin >> n;
    for(int i=0; i<n; i++) cin >> a[i];
    for(int i=0; i<n; i++) {
        for(int j=i; j<n; j++) {
            if(a[j] < a[i]) {
                int t = a[i]; a[i] = a[j]; a[j] = t;
            }
        }
    }
    return 0;
}`;

    const sub1 = await Submission.create({
        id:        crypto.randomUUID(),
        problemId: testProbId,
        userId:    testUserId,
        language:  'cpp',
        code:      code1,
        status:    'success', // Actually valid, just slow
    });

    console.log('[Phase 5] Processing Submission 1 (O(N^2) sort)...');
    await processEvolutionParams(sub1.id);
    await new Promise(r => setTimeout(r, 1000));

    // ── 2. Create S2 (Fast, O(log N) sort) ──
    const code2 = `
#include <iostream>
#include <algorithm>
using namespace std;
int main() {
    int n, a[100]; cin >> n;
    for(int i=0; i<n; i++) cin >> a[i];
    sort(a, a+n); // Fast sort!
    return 0;
}`;

    const sub2 = await Submission.create({
        id:        crypto.randomUUID(),
        problemId: testProbId,
        userId:    testUserId,
        language:  'cpp',
        code:      code2,
        status:    'success', // The ideal accepted state
    });

    console.log('[Phase 5] Processing Submission 2 (std::sort)...');
    await processEvolutionParams(sub2.id);

    // ── 3. Test Hint Generation ──
    console.log('\n── Requesting Hint for Submission 1 ──');
    let errors = 0;

    try {
        const hintResult = await getOrGenerateHint(sub1.id);
        console.log('✅ Hint generated successfully!');
        console.log('   Path Discovered: ', hintResult.pathLabels);
        console.log('   Socratic Hint:');
        console.log(`\x1b[36m${hintResult.hint}\x1b[0m\n`);

        if (!hintResult.pathLabels || hintResult.pathLabels.length === 0) {
            console.error('❌ FAIL: Path was not found downstream.');
            errors++;
        }
        
        // Assert it cached via HintQuery lookup
        const cacheCheck = await getOrGenerateHint(sub1.id);
        if (!cacheCheck.cached) {
            console.error('❌ FAIL: Hint was not marked as cached on second call.');
            errors++;
        } else {
            console.log('✅ Hint Caching verified.');
        }

    } catch (e) {
        console.error('❌ FAIL: Exception thrown during getOrGenerateHint:', e.message);
        errors++;
    }

    // Cleanup
    await Submission.destroy({ where: { userId: testUserId } });
    await User.destroy({ where: { id: testUserId } });
    await graphClient.cypher(`MATCH (n:CodeState) DETACH DELETE n`);
    await HintQuery.destroy({ where: {} });

    if (errors === 0) {
        console.log('\n🎉 PHASE 5 VERIFICATION PASSED 🎉');
        process.exit(0);
    } else {
        console.error(`\n⚠️ Failed with ${errors} errors.`);
        process.exit(1);
    }
}

run().catch(console.error);
