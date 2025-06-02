import fs from 'fs-extra';
import { getLecture } from './api.mjs';
import * as config from './config.mjs';
import * as utils from './utils.mjs'; // Import the modified utils

// --- Test Configuration ---
const TEST_CACHE_DIR = './test-cache';
const COURSE_ID = 'C1';
const SECTION_ID = 'S1';
const LECTURE_ID = 'L1';

const lectureJsonPath = `${TEST_CACHE_DIR}/courses/${COURSE_ID}/sections/${SECTION_ID}/lectures/${LECTURE_ID}/lecture.json`;
const attachment1Filename = 'attachment1.pdf';
const attachment2Filename = 'attachment2.zip';
const attachment1Url = `http://example.com/${attachment1Filename}`;
const attachment2Url = `http://example.com/${attachment2Filename}`;
const attachment1Path = `${TEST_CACHE_DIR}/courses/${COURSE_ID}/sections/${SECTION_ID}/lectures/${LECTURE_ID}/${attachment1Filename}`;
const attachment2Path = `${TEST_CACHE_DIR}/courses/${COURSE_ID}/sections/${SECTION_ID}/lectures/${LECTURE_ID}/${attachment2Filename}`;

// Override config for test
config.settings.CACHE_DIR = TEST_CACHE_DIR;
config.settings.CACHE = true;
config.settings.VERBOSE = false; // Keep test output clean for automated checks
config.settings.FILE_CONCURRENCY = 1; // CRITICAL FIX: Ensure downloadQueue is active
// No need to mock API_KEY if sdk.showLecture is not called, which is the case here.

// --- Mock SDK ---
// api.mjs imports 'sdk' and calls sdk.showLecture.
// For this test, lecture.json is pre-cached, so sdk.showLecture should *not* be called.
// We don't need a full mock of the sdk, just a way to ensure it's not called.
// The readOrFetchData in api.mjs should hit the cache.

async function runTest() {
  let testPassed = true;
  let testMessages = [];

  console.log('Starting test: CACHE=1, lecture.json exists, one attachment missing, one exists.');

  // --- Setup Test Environment ---
  await fs.remove(TEST_CACHE_DIR); // Clean up previous runs
  await fs.ensureDir(`${TEST_CACHE_DIR}/courses/${COURSE_ID}/sections/${SECTION_ID}/lectures/${LECTURE_ID}`);

  // 1. Create cached lecture.json
  const lectureJsonContent = {
    id: LECTURE_ID,
    name: 'Test Lecture from Cache',
    attachments: [
      { url: attachment1Url, name: attachment1Filename }, // This one will be "missing"
      { url: attachment2Url, name: attachment2Filename }  // This one will "exist"
    ]
  };
  await fs.outputJson(lectureJsonPath, lectureJsonContent);
  testMessages.push(`Created cached lecture.json at ${lectureJsonPath}`);

  // 2. Create one "existing" attachment file (simulated)
  // For this test, we don't actually create the file, we make mockPathExistsFn report it exists.
  testMessages.push(`Simulating ${attachment2Path} as existing.`);

  // 3. Setup mock for pathExists
  utils.testingHooks.mockPathExistsFn = async (filePath) => {
    if (filePath === lectureJsonPath) return true; // lecture.json itself
    if (filePath === attachment1Path) {
      testMessages.push(`mockPathExistsFn called for ${attachment1Path}, returning false (missing).`);
      return false; // Simulate attachment1.pdf as missing
    }
    if (filePath === attachment2Path) {
      testMessages.push(`mockPathExistsFn called for ${attachment2Path}, returning true (existing).`);
      return true; // Simulate attachment2.zip as existing
    }
    // Fallback for any other path checks if necessary
    return await utils.originalPathExists(filePath);
  };

  // Reset our mock downloader log before the test run
  utils.testingHooks.resetMockDownloaderLog();

  // --- Execute ---
  testMessages.push(`Calling getLecture('${COURSE_ID}', '${SECTION_ID}', '${LECTURE_ID}')`);
  await getLecture(COURSE_ID, SECTION_ID, LECTURE_ID);

  // --- Assertions ---
  testMessages.push(`Downloaded files log: ${JSON.stringify(utils.testingHooks.mockDownloaderLog.downloaded)}`);
  testMessages.push(`Cancelled downloads log: ${JSON.stringify(utils.testingHooks.mockDownloaderLog.cancelled)}`);

  // Verify attachment1.pdf (missing) was downloaded
  if (utils.testingHooks.mockDownloaderLog.downloaded.includes(attachment1Path)) {
    testMessages.push(`PASS: Missing attachment (${attachment1Filename}) was correctly queued for download.`);
  } else {
    testMessages.push(`FAIL: Missing attachment (${attachment1Filename}) was NOT queued for download. Expected path: ${attachment1Path}`);
    testPassed = false;
  }

  // Verify attachment2.zip (existing) was cancelled
  if (utils.testingHooks.mockDownloaderLog.cancelled.includes(attachment2Path)) {
    testMessages.push(`PASS: Existing attachment (${attachment2Filename}) download was correctly cancelled.`);
  } else {
    testMessages.push(`FAIL: Existing attachment (${attachment2Filename}) download was NOT cancelled. Expected path: ${attachment2Path}`);
    testPassed = false;
  }

  // --- Output Test Results ---
  console.log("\n--- Test Execution Log ---");
  testMessages.forEach(msg => console.log(msg));
  console.log("\n--- Test Summary ---");

  if (testPassed) {
    console.log("RESULT: PASS - All assertions met.");
  } else {
    console.error("RESULT: FAIL - Some assertions failed.");
  }

  // --- Cleanup ---
  utils.testingHooks.mockPathExistsFn = null; // Reset mock
  await fs.remove(TEST_CACHE_DIR); // Remove test cache directory
  console.log(`Cleaned up ${TEST_CACHE_DIR}`);

  if (!testPassed) {
    // Exit with error code if test failed, useful for CI
    process.exit(1);
  }
}

runTest().catch(async (error) => {
  console.error('Critical error during test execution:', error);
  // Ensure cleanup even on critical failure
  utils.testingHooks.mockPathExistsFn = null;
  await fs.remove(TEST_CACHE_DIR);
  console.log(`Cleaned up ${TEST_CACHE_DIR} after error.`);
  process.exit(1);
});
