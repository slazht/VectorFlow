const { mongoose } = require('../db');

const DocumentSchema = new mongoose.Schema({
    _id: String,
    title: String,
    file_name: String,
    priority: Number,
    category_id: String,
    status: String,
    tipe: String,
    extension: String,
    size_bytes: Number,
    fixed: { type: Boolean, default: false }
}, { collection: 'dokumen', strict: false });

module.exports = mongoose.model('Document', DocumentSchema);
