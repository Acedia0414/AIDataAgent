// 还原原始的 Gemini 配置
import mysql from 'mysql2/promise';

async function restoreOriginalConfig() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'nkwftxrLBT0414/', // URL 解码后的密码
      database: 'd365_agent'
    });

    console.log('🔧 还原原始配置...');

    // 还原到 google_ai provider 和 gemini-3-flash-preview
    const [result] = await connection.execute(`
      UPDATE llm_configurations 
      SET 
        model = 'gemini-3-flash-preview',
        provider = 'google_ai',
        isActive = true,
        updatedAt = NOW()
      WHERE isActive = true
    `);

    console.log(`✅ 还原了 ${result.affectedRows} 个配置`);

    // 显示当前配置
    const [configs] = await connection.execute(`
      SELECT provider, model, isActive, updatedAt 
      FROM llm_configurations 
      ORDER BY isActive DESC, updatedAt DESC
    `);

    console.log('📊 当前 LLM 配置:');
    configs.forEach(config => {
      console.log(`  ${config.isActive ? '✅' : '❌'} ${config.provider} - ${config.model} (${config.updatedAt})`);
    });

    await connection.end();
    console.log('🎉 原始配置还原完成！请重启服务器。');

  } catch (error) {
    console.error('❌ 还原配置失败:', error);
  }
}

restoreOriginalConfig();
