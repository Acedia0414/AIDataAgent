#!/usr/bin/env tsx

import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: decodeURIComponent('nkwftxrLBT0414%2F'),
    database: 'd365_agent',
  });

  const [tableRows] = await connection.execute(
    'SELECT id FROM metadata_tables WHERE tableName = "PurchTable"'
  );

  const tableId = (tableRows as any[])[0]?.id;
  if (!tableId) {
    console.log('❌ PurchTable not found in metadata_tables');
    await connection.end();
    return;
  }

  const [rows] = await connection.execute(
    'SELECT fieldName, fieldType, labelText FROM metadata_fields WHERE tableId = ? ORDER BY fieldName',
    [tableId]
  );

  const fields = rows as Array<{ fieldName: string; fieldType: string; labelText: string | null }>;

  const mustHave = ['PurchId', 'DataAreaId', 'ItemBuyerGroupId'];
  console.log(`📊 PurchTable fields count: ${fields.length}`);

  for (const f of mustHave) {
    const hit = fields.find(x => x.fieldName === f);
    console.log(`${hit ? '✅' : '❌'} ${f}${hit ? ` (${hit.fieldType})` : ''}`);
  }

  const buyerGroupCandidates = fields.filter(f =>
    f.fieldName.toLowerCase().includes('buyer') || f.fieldName.toLowerCase().includes('group')
  );

  console.log('\n🔍 Buyer/Group candidates:');
  for (const f of buyerGroupCandidates) {
    console.log(`- ${f.fieldName} (${f.fieldType})${f.labelText ? ` [${f.labelText}]` : ''}`);
  }

  const dataAreaCandidates = fields.filter(f => f.fieldName.toLowerCase().includes('dataarea'));
  console.log('\n🔍 DataArea candidates:');
  for (const f of dataAreaCandidates) {
    console.log(`- ${f.fieldName} (${f.fieldType})${f.labelText ? ` [${f.labelText}]` : ''}`);
  }

  await connection.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
