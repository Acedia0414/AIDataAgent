#!/usr/bin/env tsx

import { getDb } from '../server/db';
import { labels } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function setupLabelsDatabase() {
  try {
    console.log('🗄️  Setting up labels database...');
    
    const db = await getDb();
    if (!db) {
      console.error('❌ Database not available. Please check DATABASE_URL in .env');
      process.exit(1);
    }
    
    // Check if labels table exists by trying to query it
    try {
      await db.select().from(labels).limit(1);
      console.log('✅ Labels table already exists');
    } catch (error) {
      console.log('📋 Labels table does not exist. Please run the migration manually:');
      console.log('   Execute: drizzle/0003_create_labels_table.sql');
      console.log('   Or run: npm run db:migrate (if available)');
      process.exit(1);
    }
    
    // Check existing labels count
    const existingCount = await db.select().from(labels);
    console.log(`📊 Found ${existingCount.length} existing labels in database`);
    
    if (existingCount.length > 0) {
      console.log('⚠️  Labels table already has data. Clear it before reimporting.');
      console.log('   You can clear it with: DELETE FROM labels;');
    }
    
    console.log('✅ Labels database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up labels database:', error);
    process.exit(1);
  }
}

// 运行设置
setupLabelsDatabase();
