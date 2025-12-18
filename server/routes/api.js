const express = require('express');
const router = express.Router();
const { mongoose } = require('../db');
const { QdrantClient } = require('@qdrant/js-client-rest');

// Qdrant Client Configuration
const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });

// Import Document Model
const Document = require('../models/Document');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_change_me';

// POST /api/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { username: user.username, role: user.role } });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/users - Create User
router.post('/users', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ error: "Username already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, password: hashedPassword, role });

        res.status(201).json({ message: "User created", user: { username: newUser.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/stats
router.get('/stats', async (req, res) => {
    console.log('GET /stats - Connection State:', mongoose.connection.readyState);
    try {
        const docCount = await Document.countDocuments();
        const readyCount = await Document.countDocuments({ status: 'Ready' }); // Assuming 'Ready' is stored capitalized or standard
        const fixedCount = await Document.countDocuments({ fixed: true });
        const notFixedCount = await Document.countDocuments({ fixed: { $ne: true } });

        // For Qdrant stats, we can get collection info
        let chunkCount = 0;
        try {
            const collectionInfo = await qdrant.getCollection('linkchat');
            chunkCount = collectionInfo.points_count;
        } catch (e) {
            console.error("Qdrant Stats Error:", e.message);
            // Collection might not exist
        }

        res.json({
            documents: docCount,
            chunks: chunkCount,
            ready: readyCount,
            fixed: fixedCount,
            not_fixed: notFixedCount
        });
    } catch (err) {
        console.error('Error in /stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/documents
router.get('/documents', async (req, res) => {
    console.log('GET /documents - Connection State:', mongoose.connection.readyState);
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.file_name = { $regex: search, $options: 'i' };
        }

        const totalDocs = await Document.countDocuments(query);
        const docs = await Document.find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: docs,
            pagination: {
                total: totalDocs,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalDocs / limit)
            }
        });
    } catch (err) {
        console.error('Error in /documents:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/documents/:id - Update document
router.put('/documents/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        console.log(`Updating document ${id} with:`, updateData);

        const updatedDoc = await Document.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedDoc) {
            return res.status(404).json({ error: "Document not found" });
        }

        res.json(updatedDoc);
    } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/chunks/:filename
router.get('/chunks/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        // Scroll through chunks where payload.file_name == filename
        // Using scroll to get all might be heavy, but user asked for "whole chunk" (seluruh chunk).
        // We'll use a filter.

        const filter = {
            must: [
                {
                    key: 'file_name',
                    match: {
                        value: filename
                    }
                }
            ]
        };

        // Scroll
        const result = await qdrant.scroll('linkchat', {
            filter: filter,
            limit: 1000, // Reasonable limit?
            with_payload: true,
            with_vector: false
        });

        res.json(result.points);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/chunks/:id - Update chunk payload
router.put('/chunks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, payload } = req.body;

        // Construct new payload, merging with existing if provided or just updating content
        // Qdrant setPayload updates specific fields in payload
        const newPayload = payload || { content: content };

        // Ensure original_text is updated to match content
        if (newPayload.content) {
            newPayload.original_text = newPayload.content;
        }

        console.log(`Updating chunk ${id} with:`, newPayload);

        // Verify existence before update
        const checkPoints = await qdrant.retrieve('linkchat', { ids: [id] });
        if (checkPoints.length > 0) {
            console.log("Current Payload (Before):", checkPoints[0].payload.original_text?.substring(0, 50));
        } else {
            console.log("WARNING: Point not found before update!");
        }

        const qdrantUrl = process.env.QDRANT_URL || 'http://192.168.18.117:6333';

        // 1. Update Embeddings (Vector)
        // We do this BEFORE payload update to ensure consistency, or concurrently.
        // We use separate update for vector to avoid overwriting full payload if we used upsert.
        if (newPayload.original_text) {
            console.log("Generating embedding for new content...");
            try {
                // Dynamically import @xenova/transformers
                const { pipeline } = await import('@xenova/transformers');

                // Load pipeline (cached automatically)
                const embedder = await pipeline('feature-extraction', 'Xenova/bge-m3');

                // Generate embedding (CLS pooling for BGE, normalized)
                const output = await embedder(newPayload.original_text, { pooling: 'cls', normalize: true });
                const vector = Array.from(output.data);

                console.log(`Vector generated (dim: ${vector.length}). Updating Qdrant...`);

                const vectorUrl = `${qdrantUrl}/collections/linkchat/points/vectors?wait=true`;
                const vectorResponse = await fetch(vectorUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        points: [
                            {
                                id: id,
                                vector: vector
                            }
                        ]
                    })
                });

                if (!vectorResponse.ok) {
                    const vErr = await vectorResponse.text();
                    console.error("Vector update failed:", vErr);
                    // Decide if we should throw or continue
                    // throw new Error("Vector update failed: " + vErr);
                } else {
                    console.log("Vector update successful.");
                }

            } catch (embErr) {
                console.error("Embedding generation error:", embErr);
                // We might want to warn the user but continue with payload update? 
                // Or fail? Let's log it.
            }
        }

        // 2. Update Payload
        // Direct HTTP request to Qdrant REST API to bypass potential library issues
        // Endpoint: PUT /collections/{name}/points/payload?wait=true (PUT = Overwrite/Replace)
        // We use PUT to ensure the payload is exactly what we send, clearing potential merge issues.
        const url = `${qdrantUrl}/collections/linkchat/points/payload?wait=true`;

        console.log(`Sending Raw HTTP PUT (Overlay Payload) to: ${url}`);
        console.log(`Payload to write (partial):`, JSON.stringify(newPayload).substring(0, 500));

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                points: [id],
                payload: newPayload
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Qdrant API Error (${response.status}): ${errorText}`);
        }

        const opResult = await response.json();
        console.log("Raw API Result:", opResult);

        // Verify immediately after update using RAW HTTP (bypass library)
        const getUrl = `${qdrantUrl}/collections/linkchat/points/${id}`;
        console.log(`Verifying Payload via Raw GET: ${getUrl}`);

        try {
            const verifyRes = await fetch(getUrl);
            if (verifyRes.ok) {
                const verifyJson = await verifyRes.json();
                // Qdrant GET point response structure: { result: { id, payload, ... }, status: 'ok', ... }
                // OR { result: null } if not found
                if (verifyJson.result && verifyJson.result.payload) {
                    console.log("New Payload (Raw Check):", JSON.stringify(verifyJson.result.payload).substring(0, 200) + "...");

                    // Return this definitive data
                    res.json({
                        success: true,
                        message: 'Chunk updated successfully',
                        data: verifyJson.result.payload
                    });
                    return;
                } else {
                    console.error("CRITICAL: Raw GET returned no result payload:", verifyJson);
                }
            } else {
                console.error("CRITICAL: Raw GET verification failed:", verifyRes.status);
            }
        } catch (vErr) {
            console.error("Verification Fetch Error:", vErr);
        }

        // Fallback
        res.json({ success: true, message: 'Chunk updated (verification inconclusive)', data: newPayload });

    } catch (err) {
        console.error('Error updating chunk:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/search/text - Text based search (filter)
router.post('/search/text', async (req, res) => {
    try {
        const { query } = req.body;
        console.log("Text Search Query:", query);

        // Qdrant Scroll with Filter (Regex-like not fully supported as primary search in Qdrant efficiently without full scan)
        // But users want to search "database". Since chunks are in Qdrant, we search Qdrant.
        // Qdrant 'match' is exact match. 'like' is supported in newer versions.
        // Let's try simple full text match if payload index is text, or use 'match' keyword.
        // Falls back to scroll with filter if needed. 
        // We'll use Qdrant 'scroll' with a filter for 'content' or 'original_text' containing the string?
        // Qdrant doesn't support substring match efficiently. 
        // ALTERNATIVE: Use MongoDB if chunks were there. But they are in Qdrant.
        // We will try to filter by "match" text if possible or just fetch many and filter in code (inefficient but works for small DB).
        // Better: Use Qdrant's Full Text Search if configured? 
        // Let's assume for this "dataAnalis" project, simple text matching is desired.

        // Strategy: Scroll and filter in JS for now (limit 500) as Qdrant substring search is tricky without proper setup.
        // OR checks if "content" has the word. 

        const result = await qdrant.scroll('linkchat', {
            limit: 500,
            with_payload: true
        });

        const points = result.points;
        const lowerQuery = query.toLowerCase();

        // Simple client-side filter (on server)
        const filtered = points.filter(p => {
            const content = p.payload?.content || p.payload?.original_text || '';
            return content.toLowerCase().includes(lowerQuery);
        });

        const limit = parseInt(req.body.limit) || 20;
        res.json(filtered.slice(0, limit)); // Return top K

    } catch (err) {
        console.error("Text Search Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/search/vector - Vector based search
router.post('/search/vector', async (req, res) => {
    try {
        const { query } = req.body;
        console.log("Vector Search Query:", query);

        if (!query) return res.status(400).json({ error: "Query is required" });

        // 1. Generate Embedding
        const { pipeline } = await import('@xenova/transformers');
        const embedder = await pipeline('feature-extraction', 'Xenova/bge-m3');
        const output = await embedder(query, { pooling: 'cls', normalize: true });
        const vector = Array.from(output.data);

        // 2. Search Qdrant
        const limit = parseInt(req.body.limit) || 20;
        const result = await qdrant.search('linkchat', {
            vector: vector,
            limit: limit,
            with_payload: true
        });

        res.json(result);

    } catch (err) {
        console.error("Vector Search Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
