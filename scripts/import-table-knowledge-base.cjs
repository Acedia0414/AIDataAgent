require('dotenv').config();
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

// Parse DATABASE_URL
function parseDatabaseConfig() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }
  
  const url = new URL(dbUrl);
  return {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.substring(1),
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    supportBigNumbers: true,
    bigNumberStrings: true
  };
}

async function createTableKnowledgeBase() {
  const connection = await mysql.createConnection(parseDatabaseConfig());
  
  try {
    console.log('🗄️ Creating table_knowledge_base table...');
    
    // Drop existing table if it exists
    await connection.execute('DROP TABLE IF EXISTS table_knowledge_base');
    
    // Create new table
    const createTableSQL = `
      CREATE TABLE table_knowledge_base (
        id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(255) NOT NULL,
        table_label VARCHAR(500),
        scenario_explanation TEXT,
        area VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_table_name (table_name),
        INDEX idx_area (area),
        INDEX idx_table_area (table_name, area),
        FULLTEXT idx_search (table_name, table_label, scenario_explanation, area)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table level knowledge base for RAG analysis';
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ table_knowledge_base table created successfully');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function importKnowledgeBase() {
  const connection = await mysql.createConnection(parseDatabaseConfig());
  
  try {
    console.log('📥 Importing knowledge base data...');
    
    // Read Excel file
    const filePath = 'D:\\D365DataAgent\\V4\\Tabel level knowledge base.xlsx';
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets['Sheet1'];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Insert data row by row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const insertSQL = `
          INSERT INTO table_knowledge_base 
          (table_name, table_label, scenario_explanation, area)
          VALUES (?, ?, ?, ?)
        `;
        
        const values = [
          row['Table Name'] || null,
          row['Label'] || null,
          row['Scenario/Explanation'] || null,
          row['Area'] || null
        ];
        
        await connection.execute(insertSQL, values);
        successCount++;
        
        // Show progress every 50 rows
        if ((i + 1) % 50 === 0) {
          console.log(`📈 Progress: ${i + 1}/${data.length} rows processed`);
        }
        
      } catch (error) {
        console.error(`❌ Error inserting row ${i + 1} (${row['Table Name']}):`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`   Successfully imported: ${successCount} rows`);
    console.log(`   Failed: ${errorCount} rows`);
    
    // Show some statistics
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(DISTINCT area) as unique_areas,
        COUNT(DISTINCT table_name) as unique_tables
      FROM table_knowledge_base
    `);
    
    const stat = stats[0];
    console.log(`\n📊 Database Statistics:`);
    console.log(`   Total rows: ${stat.total_rows}`);
    console.log(`   Unique areas: ${stat.unique_areas}`);
    console.log(`   Unique tables: ${stat.unique_tables}`);
    
    // Show sample areas
    const [areas] = await connection.execute(`
      SELECT area, COUNT(*) as count 
      FROM table_knowledge_base 
      WHERE area IS NOT NULL 
      GROUP BY area 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    console.log(`\n🏷️ Top Areas:`);
    areas.forEach((area, index) => {
      console.log(`   ${index + 1}. ${area.area}: ${area.count} tables`);
    });
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    console.log('🚀 Table Knowledge Base Import Process');
    console.log('=====================================');
    
    // Step 1: Create table
    await createTableKnowledgeBase();
    
    // Step 2: Import data
    await importKnowledgeBase();
    
    console.log('\n🎉 Table knowledge base import completed successfully!');
    
  } catch (error) {
    console.error('💥 Process failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createTableKnowledgeBase, importKnowledgeBase };
