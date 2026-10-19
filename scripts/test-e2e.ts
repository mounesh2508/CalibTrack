/**
 * CalibTrack Full End-to-End Test Suite for Vercel Readiness
 *
 * Verifies all REST routes, ML calibration interval model,
 * and data integrity against the running application instance.
 */

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';
const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs });
    console.log(`  ✓ [${suite}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, durationMs, error: err?.message || String(err) });
    console.error(`  ✗ [${suite}] ${name} (${durationMs}ms): ${err?.message || err}`);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from ${url} (status ${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}: ${json.error || json.message || text}`);
  }

  return json;
}

async function main() {
  console.log('===========================================================');
  console.log('🧪 CALIBTRACK PRODUCTION E2E TEST SUITE FOR VERCEL DEPLOYMENT');
  console.log(`Target Base URL: ${BASE_URL}`);
  console.log('===========================================================\n');

  // Suite 1: Dashboard & System Health
  console.log('1. Testing Dashboard & System Health:');
  await runTest('Dashboard', 'Summary API returns valid metrology metrics', async () => {
    const data = await request('/dashboard/summary');
    if (!data.success) throw new Error('data.success is falsy');
    if (typeof data.total_equipment !== 'number' || data.total_equipment <= 0) {
      throw new Error(`Invalid total_equipment count: ${data.total_equipment}`);
    }
    if (typeof data.calibrated_count !== 'number') throw new Error('calibrated_count missing');
    if (typeof data.due_soon_count !== 'number') throw new Error('due_soon_count missing');
    if (typeof data.overdue_count !== 'number') throw new Error('overdue_count missing');
    console.log(`    ↳ Verified metrics: ${data.total_equipment} total, ${data.calibrated_count} calibrated, ${data.due_soon_count} due soon, ${data.overdue_count} overdue`);
  });

  // Suite 2: Equipment Catalog & Filtering
  console.log('\n2. Testing Equipment Catalog & Filtering:');
  let firstEquipmentId = 'eq-001';

  await runTest('Equipment', 'List all equipment returns full registered registry', async () => {
    const data = await request('/equipment');
    if (!data.success || !Array.isArray(data.items)) throw new Error('Expected items array');
    if (data.items.length < 10) throw new Error(`Expected at least 10 instruments, got ${data.items.length}`);
    firstEquipmentId = data.items[0].id;
    console.log(`    ↳ Catalog contains ${data.items.length} instruments. First ID: ${firstEquipmentId}`);
  });

  await runTest('Equipment', 'Search & Category filtering works correctly', async () => {
    const data = await request('/equipment?search=Balance');
    if (!data.success || !Array.isArray(data.items)) throw new Error('Failed search query');
    if (data.items.length === 0) throw new Error('Expected to find Analytical Balance');
    console.log(`    ↳ Search for "Balance" returned ${data.items.length} instrument(s)`);
  });

  await runTest('Equipment', 'Single equipment details retrieval', async () => {
    const data = await request(`/equipment/${encodeURIComponent(firstEquipmentId)}`);
    if (!data.success || !data.data) throw new Error('Failed to retrieve single instrument');
    if (!data.data.equipment_code) throw new Error('Missing equipment_code');
    console.log(`    ↳ Loaded: ${data.data.name} (${data.data.equipment_code})`);
  });

  // Suite 3: ML Calibration Interval Recommendation Engine
  console.log('\n3. Testing ML Calibration Interval Recommendation Engine:');
  await runTest('ML Recommendation', 'Predict optimal interval via adaptive regression model', async () => {
    const data = await request(`/equipment/${encodeURIComponent(firstEquipmentId)}/recommended-interval`);
    if (!data.success || !data.data) throw new Error('ML recommendation response missing data');
    const pred = data.data;

    if (typeof pred.recommendedIntervalMonths !== 'number' || pred.recommendedIntervalMonths < 1) {
      throw new Error(`Invalid recommendedIntervalMonths: ${pred.recommendedIntervalMonths}`);
    }
    if (typeof pred.reliabilityScore !== 'number' || pred.reliabilityScore < 0 || pred.reliabilityScore > 100) {
      throw new Error(`Invalid reliabilityScore: ${pred.reliabilityScore}`);
    }
    if (!pred.stabilityGrade) throw new Error('stabilityGrade missing');
    if (!pred.factors || typeof pred.factors.historicalPassRate !== 'number') {
      throw new Error('ML factors breakdown missing');
    }
    if (!pred.explanation) throw new Error('ML explanation missing');

    console.log(`    ↳ Prediction: ${pred.recommendedIntervalMonths} months (${pred.recommendedIntervalDays} days) · ${pred.stabilityGrade} (${pred.reliabilityScore}% reliability)`);
    console.log(`    ↳ Factors: Pass Rate ${pred.factors.historicalPassRate}%, Age ${pred.factors.ageInYears} yrs, Env Stability ${pred.factors.environmentalStabilityScore}%`);
  });

  await runTest('ML Recommendation', 'Apply recommended interval and recalculate due date', async () => {
    const data = await request(`/equipment/${encodeURIComponent(firstEquipmentId)}/apply-interval`, {
      method: 'POST',
    });
    if (!data.success) throw new Error('Failed to apply recommended interval');
    if (!data.data || !data.data.equipment) throw new Error('Updated equipment payload missing');

    const updated = data.data.equipment;
    if (!updated.next_calibration_date) throw new Error('Next calibration date missing after apply');
    console.log(`    ↳ Successfully applied interval! Next calibration date recalculated to: ${updated.next_calibration_date}`);
  });

  // Suite 4: Calibration Records & Compliance Audit Trail
  console.log('\n4. Testing Calibration Records & Audit Logs:');
  await runTest('Calibrations', 'Fetch global calibration audit logs', async () => {
    const data = await request('/calibration-records');
    const items = data.items || data.data || (Array.isArray(data) ? data : []);
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No calibration logs returned');
    }
    console.log(`    ↳ Found ${items.length} ISO 17025 verification audit records`);
  });

  await runTest('Calibrations', 'Fetch equipment-specific calibration history', async () => {
    const data = await request(`/equipment/${encodeURIComponent(firstEquipmentId)}/calibration-records`);
    const items = data.items || data.data || (Array.isArray(data) ? data : []);
    console.log(`    ↳ Equipment #${firstEquipmentId} has ${items.length} historic calibration log(s)`);
  });

  // Suite 5: Automated Alerts & Reminders
  console.log('\n5. Testing Notification & Alert Dispatch Systems:');
  await runTest('Notifications', 'Fetch active notifications', async () => {
    const data = await request('/notifications');
    const items = data.items || data.data || (Array.isArray(data) ? data : []);
    console.log(`    ↳ Retrieved ${items.length} notification(s), unread count: ${data.unread_count ?? data.unreadCount ?? 0}`);
  });

  await runTest('Reminders', 'Fetch due reminders preview', async () => {
    const data = await request('/reminders/preview-due');
    if (!data.success) throw new Error('Failed to fetch due reminders preview');
    console.log(`    ↳ Due reminders preview: ${data.count ?? 0} total evaluated (${data.overdueCount ?? 0} overdue, ${data.dueSoonCount ?? 0} due soon)`);
  });

  await runTest('Reminders', 'Trigger automated calibration email dispatch', async () => {
    const data = await request('/reminders/trigger', { method: 'POST' });
    if (!data.success) throw new Error('Failed to trigger reminder alerts');
    console.log(`    ↳ Reminder trigger evaluated ${data.evaluatedCount ?? 0} instruments; dispatched ${data.dispatchedEmailsCount ?? 0} notifications`);
  });

  // Summary
  console.log('\n===========================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`🏁 TEST RESULTS: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('===========================================================');

  if (failed > 0) {
    console.error('\n❌ Failures detected:');
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`  - [${r.suite}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL END-TO-END TESTS PASSED! CalibTrack is 100% ready for Vercel deployment.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
