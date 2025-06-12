// MongoDB Database Analyzer
// This script connects to your MongoDB database, analyzes its structure,
// and saves the results to a file for future reference.

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection info from .env.local
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

// Check if environment variables are available
if (!uri || !dbName) {
  console.error('Error: Missing MongoDB credentials in .env.local file');
  process.exit(1);
}

// Output file path
const outputFilePath = path.join(__dirname, 'db-structure.json');
const outputSummaryPath = path.join(__dirname, 'db-structure-summary.md');

// Connect to MongoDB and analyze structure
async function analyzeDatabase() {
  console.log('Starting MongoDB database analysis...');
  console.log(`Connecting to database: ${dbName}`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db(dbName);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);
    
    const dbStructure = {
      database: dbName,
      collections: [],
      relationships: [],
      analyzedAt: new Date().toISOString()
    };
    
    // Analyze each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Analyzing collection: ${collectionName}`);
      
      const coll = db.collection(collectionName);
      
      // Get sample documents to infer schema
      const sampleSize = 20;
      const documents = await coll.find().limit(sampleSize).toArray();
      const totalCount = await coll.countDocuments();
      
      // Extract field names and types from sample documents
      const fieldAnalysis = analyzeFields(documents);
      
      // Detect possible relationships based on field names
      const possibleRelationships = detectRelationships(collectionName, fieldAnalysis);
      
      dbStructure.collections.push({
        name: collectionName,
        documentCount: totalCount,
        sampleSize,
        fields: fieldAnalysis,
        indexes: await coll.indexes(),
      });
      
      // Add detected relationships
      dbStructure.relationships.push(...possibleRelationships);
    }
    
    // Save the detailed structure to JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(dbStructure, null, 2));
    console.log(`Detailed database structure saved to: ${outputFilePath}`);
    
    // Create a more readable summary in Markdown
    createSummaryMarkdown(dbStructure);
    
    return dbStructure;
  } catch (error) {
    console.error('Error analyzing database:', error);
    throw error;
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Analyze fields from sample documents
function analyzeFields(documents) {
  if (documents.length === 0) {
    return [];
  }
  
  const fieldMap = new Map();
  
  // Process each document
  documents.forEach(doc => {
    analyzeObject('', doc, fieldMap);
  });
  
  // Convert Map to structured array
  const fields = [];
  fieldMap.forEach((value, key) => {
    if (key !== '') {  // Skip root object
      fields.push({
        name: key,
        types: Array.from(value.types),
        occurrence: `${value.count}/${documents.length}`,
        occurrencePercentage: Math.round((value.count / documents.length) * 100),
        sample: value.sample
      });
    }
  });
  
  return fields;
}

// Recursively analyze fields of an object
function analyzeObject(prefix, obj, fieldMap, depth = 0) {
  if (depth > 3) return; // Limit recursion depth
  
  Object.entries(obj).forEach(([key, value]) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const valueType = getDetailedType(value);
    
    // Initialize or update field info
    if (!fieldMap.has(fullPath)) {
      fieldMap.set(fullPath, {
        types: new Set([valueType]),
        count: 1,
        sample: value,
      });
    } else {
      const fieldInfo = fieldMap.get(fullPath);
      fieldInfo.count++;
      fieldInfo.types.add(valueType);
      
      // Keep sample value if current one is null/undefined
      if (fieldInfo.sample === null || fieldInfo.sample === undefined) {
        fieldInfo.sample = value;
      }
    }
    
    // Recurse into objects (but not arrays)
    if (valueType === 'object' && value !== null) {
      analyzeObject(fullPath, value, fieldMap, depth + 1);
    }
  });
}

// Get more detailed type information
function getDetailedType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  const baseType = typeof value;
  
  if (baseType === 'object') {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regex';
    if (value._bsontype === 'ObjectID' || value._bsontype === 'ObjectId') return 'ObjectId';
    return 'object';
  }
  
  return baseType;
}

// Detect potential relationships between collections
function detectRelationships(collectionName, fields) {
  const relationships = [];
  
  fields.forEach(field => {
    // Look for fields that might be foreign keys
    if (field.name.endsWith('Id') || field.name.endsWith('_id') || field.name === 'id') {
      const possibleTargetCollection = field.name
        .replace('Id', '')
        .replace('_id', '')
        .replace('ids', '')
        .replace('Ids', '');
      
      // Skip self-references and empty strings
      if (possibleTargetCollection && possibleTargetCollection !== collectionName) {
        relationships.push({
          from: collectionName,
          to: pluralize(possibleTargetCollection),
          fieldName: field.name,
          type: field.types.includes('array') ? 'one-to-many' : 'many-to-one'
        });
      }
    }
  });
  
  return relationships;
}

// Simple pluralization helper
function pluralize(word) {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  return word + 's';
}

// Create a more readable summary in Markdown
function createSummaryMarkdown(dbStructure) {
  let markdown = `# MongoDB Database Structure Summary\n\n`;
  markdown += `**Database:** ${dbStructure.database}\n`;
  markdown += `**Analysis Date:** ${new Date(dbStructure.analyzedAt).toLocaleString()}\n`;
  markdown += `**Collections:** ${dbStructure.collections.length}\n\n`;
  
  // Add table of contents
  markdown += `## Table of Contents\n\n`;
  dbStructure.collections.forEach(collection => {
    markdown += `- [${collection.name}](#${collection.name.toLowerCase()})\n`;
  });
  markdown += `- [Relationships](#relationships)\n\n`;
  
  // Add detailed collection information
  markdown += `## Collections\n\n`;
  dbStructure.collections.forEach(collection => {
    markdown += `### ${collection.name}\n\n`;
    markdown += `**Document Count:** ${collection.documentCount}\n\n`;
    
    // Table of fields
    markdown += `| Field | Type | Required | Sample |\n`;
    markdown += `|-------|------|----------|--------|\n`;
    
    collection.fields
      .sort((a, b) => b.occurrencePercentage - a.occurrencePercentage)
      .forEach(field => {
        const required = field.occurrencePercentage > 95 ? 'Yes' : 'No';
        const types = Array.from(field.types).join(', ');
        let sample = '';
        
        // Format sample value based on type
        if (field.types.includes('string')) {
          sample = typeof field.sample === 'string' ? 
            `"${field.sample.substring(0, 20)}${field.sample.length > 20 ? '...' : ''}"` : '';
        } else if (field.types.includes('object')) {
          sample = '{ ... }';
        } else if (field.types.includes('array')) {
          sample = '[ ... ]';
        } else if (field.types.includes('ObjectId')) {
          sample = 'ObjectId(...)';
        } else if (field.types.includes('date')) {
          sample = field.sample instanceof Date ? field.sample.toISOString() : '';
        } else {
          sample = String(field.sample).substring(0, 30);
        }
        
        markdown += `| ${field.name} | ${types} | ${required} | ${sample} |\n`;
      });
      
    markdown += `\n**Indexes:**\n\n`;
    collection.indexes.forEach(index => {
      markdown += `- ${JSON.stringify(index.key)}\n`;
    });
    
    markdown += `\n`;
  });
  
  // Add relationships
  markdown += `## Relationships\n\n`;
  markdown += `| From Collection | To Collection | Field | Type |\n`;
  markdown += `|----------------|--------------|-------|------|\n`;
  
  dbStructure.relationships.forEach(rel => {
    markdown += `| ${rel.from} | ${rel.to} | ${rel.fieldName} | ${rel.type} |\n`;
  });
  
  // Save the markdown file
  fs.writeFileSync(outputSummaryPath, markdown);
  console.log(`Summary markdown saved to: ${outputSummaryPath}`);
}

// Run the analysis
analyzeDatabase()
  .then(() => {
    console.log('Database analysis completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database analysis failed:', error);
    process.exit(1);
  }); 