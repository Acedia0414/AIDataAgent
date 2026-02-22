import { getDb } from './server/db';

async function checkBuyerFields() {
  const db = await getDb();
  const [rows] = await db.execute('SELECT fieldName, comments FROM comments_data WHERE tableName = "PurchTable" AND fieldName LIKE "%Buyer%"');
  
  console.log('Buyer-related field mappings:');
  (rows as any[]).forEach((row: any) => {
    console.log(`- ${row.fieldName}: ${row.comments}`);
  });
  
  process.exit(0);
}

checkBuyerFields().catch(console.error);
