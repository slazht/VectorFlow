require('dotenv').config();
const mongoose = require('mongoose');

// Schema definition matching the one in api.js
const DocumentSchema = new mongoose.Schema({
    _id: String,
    file_name: String,
    status: String,
}, { collection: 'dokumen', strict: false });

const Document = mongoose.model('Document', DocumentSchema);

async function testConnection() {
    console.log('Attempting to connect to:', process.env.MONGO_URI);

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ MongoDB Connected Successfully');

        console.log('Querying documents...');
        const docs = await Document.find({}).limit(5);

        console.log(`✅ Found ${docs.length} documents.`);
        if (docs.length > 0) {
            console.log('First document sample:', docs[0]);
        } else {
            console.log('Collection is empty or no documents found.');
        }

    } catch (err) {
        console.error('❌ Connection or Query Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed.');
        process.exit();
    }
}

testConnection();
