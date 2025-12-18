const { mongoose } = require('../db');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    created_at: { type: Date, default: Date.now }
}, { collection: 'Persons' });

module.exports = mongoose.model('Person', UserSchema);
