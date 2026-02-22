// Gemini 配额监控器
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配额限制
const DAILY_LIMIT = 20;
const QUOTA_FILE = path.join(__dirname, 'gemini-quota.json');

// 读取当前配额使用情况
function readQuotaUsage() {
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const data = fs.readFileSync(QUOTA_FILE, 'utf8');
      const quota = JSON.parse(data);
      
      // 检查是否是新的一天
      const today = new Date().toDateString();
      if (quota.date === today) {
        return quota;
      }
    }
  } catch (error) {
    console.warn('Failed to read quota file:', error);
  }
  
  // 新的一天或文件不存在，重置配额
  return {
    date: new Date().toDateString(),
    used: 0,
    limit: DAILY_LIMIT,
    lastReset: new Date().toISOString()
  };
}

// 保存配额使用情况
function saveQuotaUsage(quota) {
  try {
    fs.writeFileSync(QUOTA_FILE, JSON.stringify(quota, null, 2));
  } catch (error) {
    console.warn('Failed to save quota file:', error);
  }
}

// 检查配额
function checkQuota() {
  const quota = readQuotaUsage();
  
  console.log(`[Quota Monitor] 📊 Daily Usage: ${quota.used}/${quota.limit}`);
  
  if (quota.used >= quota.limit) {
    console.log(`[Quota Monitor] ❌ Quota exhausted! (${quota.used}/${quota.limit})`);
    return false;
  }
  
  if (quota.used >= quota.limit * 0.8) {
    console.log(`[Quota Monitor] ⚠️ Quota warning: ${quota.used}/${quota.limit} (${Math.round(quota.used/quota.limit*100)}%)`);
  }
  
  return true;
}

// 记录使用
function recordUsage() {
  const quota = readQuotaUsage();
  quota.used += 1;
  saveQuotaUsage(quota);
  
  console.log(`[Quota Monitor] 📈 Usage updated: ${quota.used}/${quota.limit}`);
  
  return quota;
}

// 重置配额（用于测试）
function resetQuota() {
  const quota = {
    date: new Date().toDateString(),
    used: 0,
    limit: DAILY_LIMIT,
    lastReset: new Date().toISOString()
  };
  saveQuotaUsage(quota);
  console.log(`[Quota Monitor] 🔄 Quota reset: 0/${DAILY_LIMIT}`);
  return quota;
}

// 命令行接口
const command = process.argv[2];

switch (command) {
  case 'check':
    checkQuota();
    break;
  case 'use':
    recordUsage();
    break;
  case 'reset':
    resetQuota();
    break;
  case 'status':
    const quota = readQuotaUsage();
    console.log(`[Quota Monitor] 📊 Status: ${quota.used}/${quota.limit} (${Math.round(quota.used/quota.limit*100)}%)`);
    console.log(`[Quota Monitor] 📅 Date: ${quota.date}`);
    console.log(`[Quota Monitor] 🔄 Last Reset: ${quota.lastReset}`);
    break;
  default:
    console.log('Usage: node quota-monitor.js [check|use|reset|status]');
}
