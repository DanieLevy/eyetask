import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in environment');
  process.exit(1);
}

const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    console.log('MongoDB connection successful!');
  } catch (e) {
    console.error('MongoDB connection failed:', e);
    process.exit(1);
  } finally {
    await client.close();
  }
})(); 