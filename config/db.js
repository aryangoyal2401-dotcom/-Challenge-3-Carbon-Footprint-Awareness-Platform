const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = {
  users: Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true }),
  activities: Datastore.create({ filename: path.join(dataDir, 'activities.db'), autoload: true }),
  challenges: Datastore.create({ filename: path.join(dataDir, 'challenges.db'), autoload: true })
};

// Create indexes
db.users.ensureIndex({ fieldName: 'email', unique: true });
db.activities.ensureIndex({ fieldName: 'userId' });
db.activities.ensureIndex({ fieldName: 'date' });
db.challenges.ensureIndex({ fieldName: 'userId' });

module.exports = db;
