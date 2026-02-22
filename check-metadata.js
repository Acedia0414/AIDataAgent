// 检查数据库中的元数据
import { getDb } from './server/db.js';
import { metadataTables } from './drizzle/schema.js';

async function checkMetadata() {
  try {
    const db = await getDb();
    const tables = await db.select().from(metadataTables);
    
    console.log('📊 Database metadata tables:', tables.length);
    console.log('📋 Available tables:');
    tables.slice(0, 10).forEach(table => {
      console.log(`  - ${table.tableName}: ${table.description || 'No description'}`);
    });
    
    if (tables.length > 10) {
      console.log(`  ... and ${tables.length - 10} more`);
    }
    
    // 检查是否有 PurchTable
    const purchTable = tables.find(t => t.tableName === 'PurchTable');
    if (purchTable) {
      console.log('✅ Found PurchTable in database!');
    } else {
      console.log('❌ PurchTable not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking metadata:', error);
  }
}

checkMetadata();
