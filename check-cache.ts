import { getDb } from './server/db';

async function checkCache() {
  const db = await getDb();
  const [rows] = await db.execute('SELECT naturalLanguageQuery, generatedSql FROM query_history WHERE executionStatus = "success" ORDER BY createdAt DESC LIMIT 5');
  
  console.log('Recent cache entries:');
  rows.forEach((row: any, i: number) => {
    console.log(`${i + 1}. Query: ${row.naturalLanguageQuery?.substring(0, 50)}...`);
    console.log(`   SQL: ${row.generatedSql?.substring(0, 100)}...`);
    console.log('');
  });
  
  process.exit(0);
}

checkCache().catch(console.error);
