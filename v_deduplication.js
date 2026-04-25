/**
 * v_deduplication.js - Verification of Plagiarism Deduplication & Order
 */
const { 
    PlagiarismCheck, 
    sequelize 
} = require('./db');

async function verify() {
    console.log('--- STARTING DEDUPLICATION VERIFICATION ---\n');

    await sequelize.sync({ force: true });

    const id1 = 'aaaaaaaa-1111-1111-1111-111111111111';
    const id2 = 'bbbbbbbb-2222-2222-2222-222222222222';

    async function simulateCheck(subId, priorId) {
        console.log(`Checking ${subId} against ${priorId}...`);
        
        // --- LOGIC FROM anticheatWorker.js ---
        const s1Id = subId < priorId ? subId : priorId;
        const s2Id = subId < priorId ? priorId : subId;

        const [check, created] = await PlagiarismCheck.findOrCreate({
            where: { sub1Id: s1Id, sub2Id: s2Id },
            defaults: {
                problemId: 'test',
                language: 'cpp',
                cosineScore: 0.9,
                jaccardScore: 0.9,
                verdict: 'flagged'
            }
        });
        
        if (created) {
            console.log(`   ✅ Created record: ${s1Id} <-> ${s2Id}`);
        } else {
            console.log(`   ✅ Found existing record: ${s1Id} <-> ${s2Id} (No duplicate created)`);
        }
        return created;
    }

    // Pass 1: A vs B
    const first = await simulateCheck(id1, id2);
    
    // Pass 2: B vs A (Reciprocal)
    const second = await simulateCheck(id2, id1);

    const count = await PlagiarismCheck.count();
    console.log(`\n   Total PlagiarismCheck records: ${count} (Expected: 1)`);

    if (count === 1 && first === true && second === false) {
        console.log('   ✅ Deduplication and stable ordering confirmed.');
    } else {
        console.error('   ❌ FAILED: Deduplication failed!');
    }

    process.exit(0);
}

verify().catch(console.error);
