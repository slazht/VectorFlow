const { QdrantClient } = require('@qdrant/js-client-rest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

async function testUpdate() {
    const id = '098baab1-cf62-410c-bea3-d510f8544fdf';
    const payload = {
        test_update: "This is a test update from script",
        timestamp: new Date().toISOString()
    };

    console.log(`Attempting to update chunk ${id} in 'linkchat'...`);

    try {
        // Variation 1: Positional arguments
        console.log("Attempt 1: qdrant.setPayload('linkchat', { points, payload })");
        await qdrant.setPayload('linkchat', {
            points: [id],
            payload: payload
        });
        console.log("Success with Attempt 1");
        return;
    } catch (e) { console.log("Attempt 1 failed:", e.message); }

    try {
        // Variation 2: Original object style (just to be sure)
        console.log("Attempt 2: qdrant.setPayload({ collection_name, points, payload })");
        await qdrant.setPayload({
            collection_name: 'linkchat',
            points: [id],
            payload: payload
        });
        console.log("Success with Attempt 2");
        return;
    } catch (e) { console.log("Attempt 2 failed:", e.message); }

    try {
        // Variation 3: Using 'api' property if it exposes raw API
        // console.log("Attempt 3: qdrant.api('points')... NO, assuming client root methods");
    } catch (e) { }
}

testUpdate();
