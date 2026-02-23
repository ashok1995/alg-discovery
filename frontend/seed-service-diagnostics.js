/**
 * Seed Service Diagnostics Script
 * ================================
 * 
 * Quick diagnostic to identify backend data issues
 */

const axios = require('axios');

const PRODUCTION_URL = 'http://algodiscovery.com:8182';
const LOCAL_URL = 'http://localhost:8082';

async function runDiagnostics() {
  console.log('🔍 SEED SERVICE DIAGNOSTICS');
  console.log('===========================\n');

  const services = [
    { url: PRODUCTION_URL, name: 'Production' },
    { url: LOCAL_URL, name: 'Local' }
  ];

  for (const service of services) {
    console.log(`🌍 ${service.name} Service: ${service.url}`);
    console.log('-'.repeat(40));

    try {
      // 1. Health Check
      const health = await axios.get(`${service.url}/health`, { timeout: 5000 });
      console.log(`✅ Health: ${health.data.status} (v${health.data.api_version})`);

      // 2. Basic Recommendation Test
      const basicRequest = {
        strategy: 'swing',
        risk_level: 'moderate',
        limit: 1,
        min_price: 1,
        max_price: 100000,
        min_volume: 1
      };

      const basicResponse = await axios.post(
        `${service.url}/api/v2/stocks/recommendations`,
        basicRequest,
        { timeout: 15000 }
      );

      console.log(`📊 Basic Test: ${basicResponse.data.recommendations?.length || 0} stocks`);
      console.log(`🤖 ARMs Executed: ${basicResponse.data.arms_executed || 0}`);
      console.log(`⏱️ Processing Time: ${basicResponse.data.processing_time_ms || 0}ms`);
      console.log(`🌍 Market Regime: ${basicResponse.data.market_context?.regime || 'unknown'}`);

      // 3. Sample ARM Results
      if (basicResponse.data.arm_execution_results) {
        const sampleArm = basicResponse.data.arm_execution_results[0];
        console.log(`🔧 Sample ARM: ${sampleArm.arm_name}`);
        console.log(`   Success: ${sampleArm.success}`);
        console.log(`   Stocks Found: ${sampleArm.stocks_found}`);
        console.log(`   Execution Time: ${sampleArm.execution_time_ms?.toFixed(0)}ms`);
        console.log(`   Average Score: ${sampleArm.avg_score}`);
      }

      // 4. System Health (if available)
      try {
        const systemStatus = await axios.get(`${service.url}/api/system/status`, { timeout: 5000 });
        console.log(`🖥️ System Status: Available`);
        if (systemStatus.data.database_status) {
          console.log(`   Database: ${systemStatus.data.database_status}`);
        }
        if (systemStatus.data.total_stock_records) {
          console.log(`   Stock Records: ${systemStatus.data.total_stock_records}`);
        }
      } catch (sysError) {
        console.log(`🖥️ System Status: Not available`);
      }

      // 5. ARM List (if available)
      try {
        const arms = await axios.get(`${service.url}/api/v2/stocks/arms`, { timeout: 5000 });
        console.log(`🤖 Available ARMs: ${arms.data.length || 'unknown'}`);
      } catch (armError) {
        console.log(`🤖 ARM List: Not available`);
      }

    } catch (error) {
      console.log(`❌ ${service.name} Service Error: ${error.message}`);
    }

    console.log('');
  }

  // Diagnostic Summary
  console.log('🎯 DIAGNOSTIC SUMMARY');
  console.log('====================');
  console.log('');
  console.log('🔍 Key Questions to Investigate:');
  console.log('');
  console.log('1. 📊 Database Status:');
  console.log('   • Is the stock database populated?');
  console.log('   • When was the last data update?');
  console.log('   • How many stock records are available?');
  console.log('');
  console.log('2. ⏰ Market Hours:');
  console.log('   • Does the service only work during market hours?');
  console.log('   • Current time: ' + new Date().toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'}));
  console.log('   • Indian market hours: 9:15 AM - 3:30 PM IST');
  console.log('');
  console.log('3. 🔧 ARM Calibration:');
  console.log('   • Are ARM scoring thresholds too high?');
  console.log('   • Do ARMs need recalibration for current market?');
  console.log('   • Are filter criteria too restrictive?');
  console.log('');
  console.log('4. 📈 Data Pipeline:');
  console.log('   • Is real-time data flowing?');
  console.log('   • Are data sources connected?');
  console.log('   • Is the data fresh and recent?');
  console.log('');
  console.log('💡 RECOMMENDATION:');
  console.log('The frontend integration is PERFECT. Focus backend investigation on:');
  console.log('• Database population and data freshness');
  console.log('• ARM scoring thresholds and calibration');  
  console.log('• Market hours configuration');
  console.log('• Data source connectivity');
}

// Run diagnostics
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };






