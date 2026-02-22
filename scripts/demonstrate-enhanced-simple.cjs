const { enhancedTableMetadataService } = require('../server/enhancedTableMetadataService.cjs');

async function demonstrateEnhancedStructure() {
  try {
    console.log('🎯 Demonstrating Enhanced Metadata Structure\n');
    console.log('='.repeat(50));
    
    // 1. Get enhanced statistics
    console.log('\n📊 Enhanced Statistics:');
    console.log('======================');
    const stats = await enhancedTableMetadataService.getEnhancedStatistics();
    console.log(`Total Tables: ${stats.total_tables}`);
    console.log(`Total Fields: ${stats.total_fields}`);
    console.log(`Fields with Enums: ${stats.enum_fields}`);
    console.log(`Total Enum Values: ${stats.total_enum_values}`);
    
    console.log('\n📈 Data Type Distribution:');
    stats.data_type_distribution.slice(0, 5).forEach(stat => {
      console.log(`  ${stat.data_type}: ${stat.count} fields`);
    });
    
    // 2. Get complete table metadata
    console.log('\n🏦 Complete BankGroup Table Metadata:');
    console.log('=====================================');
    const bankGroupMetadata = await enhancedTableMetadataService.getEnhancedTableMetadata('BankGroup');
    
    if (bankGroupMetadata) {
      console.log(`📁 Table: ${bankGroupMetadata.table_name}`);
      console.log(`   Label: ${bankGroupMetadata.table_label}`);
      if (bankGroupMetadata.table_description) {
        console.log(`   Description: ${bankGroupMetadata.table_description}`);
      }
      
      console.log(`\n📋 Fields (${bankGroupMetadata.fields.length}):`);
      bankGroupMetadata.fields.forEach(field => {
        console.log(`   🔹 ${field.field_name}: ${field.field_label}`);
        console.log(`      Type: ${field.data_type}, Length: ${field.string_length}`);
        console.log(`      Nullable: ${field.is_nullable ? 'Yes' : 'No'}, Primary Key: ${field.is_primary_key ? 'Yes' : 'No'}`);
        
        if (field.enum_values && field.enum_values.length > 0) {
          console.log(`      Enum Values:`);
          field.enum_values.forEach(enumVal => {
            console.log(`         [${enumVal.enum_value}] ${enumVal.enum_label}`);
            if (enumVal.enum_description) {
              console.log(`            Description: ${enumVal.enum_description}`);
            }
          });
        }
        console.log('');
      });
    }
    
    // 3. Get specific field with enum values
    console.log('🎯 Specific Field Example - BankGroup.BankType_RU:');
    console.log('================================================');
    const bankTypeField = await enhancedTableMetadataService.getEnhancedFieldMetadata('BankGroup', 'BankType_RU');
    
    if (bankTypeField) {
      console.log(`🔹 Field: ${bankTypeField.field_name}`);
      console.log(`   Label: ${bankTypeField.field_label}`);
      console.log(`   Type: ${bankTypeField.data_type}`);
      console.log(`   Nullable: ${bankTypeField.is_nullable ? 'Yes' : 'No'}`);
      
      if (bankTypeField.enum_values) {
        console.log(`   Enum Values:`);
        bankTypeField.enum_values.forEach(enumVal => {
          console.log(`     [${enumVal.enum_value}] ${enumVal.enum_label}`);
        });
      }
    }
    
    // 4. Get enum value meaning
    console.log('\n🔢 Enum Value Meaning Example:');
    console.log('===============================');
    const enumMeaning = await enhancedTableMetadataService.getEnumValueMeaning('BankGroup', 'BankType_RU', '0');
    
    if (enumMeaning) {
      console.log(`BankGroup.BankType_RU[0] means: ${enumMeaning.enum_label}`);
      if (enumMeaning.enum_description) {
        console.log(`Description: ${enumMeaning.enum_description}`);
      }
    }
    
    // 5. Get table enum fields
    console.log('\n🔢 BankGroup Enum Fields:');
    console.log('========================');
    const enumFields = await enhancedTableMetadataService.getTableEnumFields('BankGroup');
    enumFields.forEach(field => {
      console.log(`🔢 ${field.field_name}: ${field.field_label}`);
    });
    
    // 6. Tables with field counts
    console.log('\n📊 Tables with Field Counts (Top 5):');
    console.log('=====================================');
    const tablesWithCounts = await enhancedTableMetadataService.getTablesWithFieldCounts();
    tablesWithCounts.slice(0, 5).forEach(table => {
      console.log(`📁 ${table.table_name}: ${table.field_count} fields (${table.enum_field_count} enum fields, ${table.total_enum_values} enum values)`);
      console.log(`   Label: ${table.table_label}`);
    });
    
    // 7. Show some enum value examples
    console.log('\n🔢 Sample Enum Values:');
    console.log('======================');
    const bankGroupEnumFields = await enhancedTableMetadataService.getTableEnumFields('BankGroup');
    
    for (const enumField of bankGroupEnumFields.slice(0, 3)) {
      const enumValues = await enhancedTableMetadataService.getFieldEnumValues('BankGroup', enumField.field_name);
      console.log(`🔢 ${enumField.field_name}: ${enumField.field_label}`);
      enumValues.forEach(enumVal => {
        console.log(`   [${enumVal.enum_value}] ${enumVal.enum_label}`);
      });
      console.log('');
    }
    
    console.log('\n✨ Enhanced structure demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    throw error;
  } finally {
    await enhancedTableMetadataService.disconnect();
  }
}

// Run demonstration
if (require.main === module) {
  demonstrateEnhancedStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Demonstration failed:', error);
      process.exit(1);
    });
}

module.exports = { demonstrateEnhancedStructure };
