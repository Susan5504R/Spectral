'use strict';

/**
 * graph/tests/phase4_verify.js — E2E Evolution Graph Test
 *
 * Verifies that the evolution_worker correctly processes sequential submissions
 * and populates both the AGE graph and the relational SQL DB.
 *
 * Simulates:
 *   1. O(N²) bubble sort approach
 *   2. O(N log N) std::sort approach
 * By the same user for the same problem.
 */

const { Submission, TransformationLabel, sequelize } = require('../../db');
const { processEvolutionParams }                     = require('../../evolution_worker');
const graphClient                                    = require('../client');

async function run() {
    console.log('── Phase 4 E2E Orchestration Verification ──');

    await sequelize.authenticate();
    await graphClient.healthCheck();

    // Clean up test data
    const testUserId = '00000000-0000-0000-0000-000000000004';
    const testProbId = 'prob_p4_test';
    
    await Submission.destroy({ where: { userId: testUserId } });
    const { User } = require('../../db');
    await User.destroy({ where: { id: testUserId } });
    await User.create({ id: testUserId, username: 'testuser_p4', password: 'password' });

    await graphClient.cypher(`MATCH (n:CodeState) DETACH DELETE n`); // Clear graph for pure test
    await TransformationLabel.destroy({ where: {} });

    // ── 1. Create Submission S1 (Slow, O(N^2)) ──
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

    const crypto = require('crypto');

    const sub1 = await Submission.create({
        id:        crypto.randomUUID(),
        problemId: testProbId,
        userId:    testUserId,
        language:  'cpp',
        code:      code1,
        status:    'success',
        executionTime: 50,
        memoryUsed: 1,
        score:     100
    });

    console.log('\n[E2E] Processing Submission 1 (O(N^2) sort)...');
    const hash1 = await processEvolutionParams(sub1.id);
    console.log('  → Root Hash:', hash1);

    // Give it a tiny delay to ensure timestamps strictly order
    await new Promise(r => setTimeout(r, 1000));

    // ── 2. Create Submission S2 (Fast, O(log N) sort) ──
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
        status:    'success',
        executionTime: 5,
        memoryUsed: 1,
        score:     100
    });

    console.log('\n[E2E] Processing Submission 2 (std::sort)...');
    const hash2 = await processEvolutionParams(sub2.id);
    console.log('  → Next Hash:', hash2);

    // ── 3. Verification ──
    console.log('\n── Verifying Data Integrity ──');
    let errors = 0;

    // Check AGE Graph
    const edge = await graphClient.cypher(`
        MATCH (a:CodeState {id: '${hash1}'})-[r:TRANSFORMED]->(b:CodeState {id: '${hash2}'})
        RETURN r.labels AS labels, r.complexityDelta AS delta, a.complexity AS ca, b.complexity AS cb
    `);

    if (edge.length === 0) {
        console.error('❌ FAIL: Graph edge not created');
        errors++;
    } else {
        const props = edge[0];
        console.log('✅ Graph Edge Found');
        console.log(`   Labels: ${props.labels}`);
        console.log(`   Delta : ${props.delta} (Went from ${props.ca} to ${props.cb})`);
        
        if (!props.labels.includes('Added Sorting Step')) {
            console.error('❌ FAIL: Missing expected label "Added Sorting Step"');
            errors++;
        }
        if (!props.labels.includes('Removed Nested Loop')) {
            console.error('❌ FAIL: Missing expected label "Removed Nested Loop"');
            errors++;
        }
        if (Number(props.delta) !== -1) {
            console.error('❌ FAIL: Complexity delta should be -1 (O(N^2) -> O(N))');
            errors++;
        }
    }

    // Check SQL Table
    const sqlLabels = await TransformationLabel.findOne({ where: { fromHash: hash1, toHash: hash2 } });
    if (!sqlLabels) {
        console.error('❌ FAIL: SQL TransformationLabel cache not created');
        errors++;
    } else {
        console.log('✅ SQL Cache Found');
        console.log(`   Label String: "${sqlLabels.label}"`);
    }

    // Cleanup
    await Submission.destroy({ where: { userId: testUserId } });
    await TransformationLabel.destroy({ where: {} });
    await graphClient.cypher(`MATCH (n:CodeState) DETACH DELETE n`);

    if (errors === 0) {
        console.log('\n🎉 ALL E2E TESTS PASSED 🎉');
        process.exit(0);
    } else {
        console.error(`\n⚠️ Failed with ${errors} errors.`);
        process.exit(1);
    }
}

run().catch(console.error);
