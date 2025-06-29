const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMongoDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✓ Connected successfully!');
    
    const db = client.db(dbName);
    console.log(`\nDatabase: ${dbName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nCollections:');
    for (const col of collections) {
      console.log(`- ${col.name}`);
    }
    
    // Check document counts
    console.log('\nDocument counts:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`- ${col.name}: ${count} documents`);
    }
    
    // Check if appUsers collection has proper roles
    console.log('\nChecking user roles...');
    const users = await db.collection('appUsers').find({}).toArray();
    console.log(`Total users: ${users.length}`);
    
    if (users.length > 0) {
      console.log('User roles:');
      users.forEach(user => {
        console.log(`- ${user.username}: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed.');
  }
}

checkMongoDB(); 