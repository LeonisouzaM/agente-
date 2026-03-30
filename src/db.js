const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Initialize tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id TEXT,
            sender_name TEXT,
            role TEXT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

/**
 * Saves a message to the database.
 * @param {string} waId - The user's WhatsApp ID.
 * @param {string} senderName - The sender's name.
 * @param {string} role - Either 'user' or 'assistant'.
 * @param {string} content - The message content.
 */
function saveMessage(waId, senderName, role, content) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO messages (wa_id, sender_name, role, content) VALUES (?, ?, ?, ?)");
        stmt.run(waId, senderName, role, content, (err) => {
            if (err) {
                console.error('Error saving message:', err);
                return reject(err);
            }
            resolve();
        });
        stmt.finalize();
    });
}

/**
 * Retrieves the message history for a specific user.
 * @param {string} waId - The user's WhatsApp ID.
 * @param {number} limit - Maximum number of messages to retrieve.
 */
function getHistory(waId, limit = 10) {
    return new Promise((resolve, reject) => {
        db.all("SELECT role, content FROM messages WHERE wa_id = ? ORDER BY timestamp DESC LIMIT ?", [waId, limit], (err, rows) => {
            if (err) {
                console.error('Error retrieving history:', err);
                return reject(err);
            }
            // Reverse so they are in chronological order
            resolve(rows.reverse().map(row => ({
                role: row.role === 'assistant' ? 'model' : 'user', // Gemini expects 'model' instead of 'assistant' if using specific SDK format
                parts: [{ text: row.content }]
            })));
        });
    });
}

module.exports = {
    saveMessage,
    getHistory
};
