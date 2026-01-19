import { parseD365Metadata } from './server/metadataParser.js';
import { readFileSync } from 'fs';

const xml = readFileSync('/home/ubuntu/upload/CustTable.xml', 'utf-8');
const parsed = await parseD365Metadata(xml);

console.log('Table:', parsed.tableName);
console.log('Fields:', parsed.fields.length);
console.log('Relationships:', parsed.relationships.length);
console.log('\nFirst 5 relationships:');
parsed.relationships.slice(0, 5).forEach(rel => {
  console.log(`  - ${rel.relationName}: ${rel.sourceField || '?'} -> ${rel.relatedTable}.${rel.relatedField || '?'} [${rel.cardinality}]`);
});
