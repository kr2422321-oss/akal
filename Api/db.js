const { MongoClient } = require('mongodb');
const config = require('../config.json');

const client = new MongoClient(config.mongodb);

let db, keysCollection;

async function connectDB() {
    if (!db || !keysCollection) {
        await client.connect();
        db = client.db('keysystem');
        keysCollection = db.collection('keys');
        console.log('Connected to MongoDB successfully.');
    }
    return { db, keysCollection };
}

module.exports = connectDB;
