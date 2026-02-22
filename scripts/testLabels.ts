#!/usr/bin/env tsx

import { labelService } from '../server/labelService';

async function testLabels() {
  try {
    console.log('🧪 Testing label service functionality...\n');
    
    // Test 1: Check if labels are loaded
    console.log('📊 Test 1: Checking loaded labels');
    const allLabels = labelService.getAllLabels();
    console.log(`   Found ${allLabels.size} labels in memory\n`);
    
    // Test 2: Test label lookup
    console.log('🔍 Test 2: Testing label lookup');
    const testLabelId = '@GlobalAddressBook:AbridgementsOfAddresses';
    const labelText = labelService.getLabelText(testLabelId);
    console.log(`   Label ID: ${testLabelId}`);
    console.log(`   Label Text: ${labelText}\n`);
    
    // Test 3: Test search functionality
    console.log('🔎 Test 3: Testing search functionality');
    const searchResults = labelService.searchLabels('Address');
    console.log(`   Found ${searchResults.length} labels matching "Address":`);
    searchResults.slice(0, 3).forEach((label, index) => {
      console.log(`   ${index + 1}. ${label.labelId}: ${label.labelText}`);
    });
    console.log();
    
    // Test 4: Test table label lookup
    console.log('🏷️  Test 4: Testing table label lookup');
    const tableLabel = labelService.getTableLabel('CustTable');
    console.log(`   Table "CustTable" label: ${tableLabel || 'Not found'}\n`);
    
    // Test 5: Test field enhancement
    console.log('✨ Test 5: Testing field enhancement');
    const testFields = [
      { fieldName: 'AccountNum', label: '@SYS123' },
      { fieldName: 'Name', label: 'NonExistentLabel' },
      { fieldName: 'CustGroup' }
    ];
    
    const enhancedFields = labelService.enhanceWithLabels('CustTable', testFields);
    console.log('   Enhanced fields:');
    enhancedFields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.fieldName} (${field.label || 'no label'}) -> ${field.labelText || 'no label text'}`);
    });
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  }
}

// 运行测试
testLabels();
