import { readFileSync } from 'fs';
import { parseD365Metadata } from './server/metadataParser.ts';

const xml = readFileSync('/home/ubuntu/upload/CustTable.xml', 'utf8');

try {
  const result = await parseD365Metadata(xml);
  console.log('✓ Successfully parsed D365 metadata');
  console.log('Table:', result.tableName);
  console.log('Description:', result.description);
  console.log('Fields count:', result.fields.length);
  console.log('\nFirst 10 fields:');
  result.fields.slice(0, 10).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.fieldName}`);
    console.log(`     Type: ${f.dataType}`);
    console.log(`     EDT: ${f.extendedDataType || 'N/A'}`);
    console.log(`     Mandatory: ${f.isMandatory ? 'Yes' : 'No'}`);
    console.log(`     Description: ${f.description}`);
    console.log('');
  });
} catch (err) {
  console.error('✗ Error parsing metadata:', err.message);
  console.error(err.stack);
}
