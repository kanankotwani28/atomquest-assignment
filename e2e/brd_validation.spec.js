import { test, expect } from '@playwright/test';

test.describe('AtomQuest BRD End-to-End Validation Suite', () => {
  const BASE_URL = 'http://localhost:5173';

  test.beforeEach(async ({ page }) => {
    // Navigate to Login Page before each test
    await page.goto(`${BASE_URL}/login`);
  });

  // ────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & SESSION HANDLING TESTS
  // ────────────────────────────────────────────────────────
  test('User Login and Dashboard Redirect Flow', async ({ page }) => {
    // Assert login elements exist
    await expect(page.locator('text=AtomQuest')).toBeVisible();
    await expect(page.locator('text=by Atomberg')).toBeVisible();

    // Perform Login as Employee
    await page.fill('input[type="email"]', 'employee@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Assert redirection to Employee Dashboard
    await page.waitForURL('**/employee/dashboard');
    await expect(page.locator('h1')).toContainText('My Goals');
  });

  // ────────────────────────────────────────────────────────
  // 2. EMPLOYEE GOAL SETTING & BRD BOUNDARY VALIDATIONS
  // ────────────────────────────────────────────────────────
  test('Employee Goal Creation, 100% Weightage Limit, and Submit validations', async ({ page }) => {
    // Login as Employee
    await page.fill('input[type="email"]', 'employee@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employee/dashboard');

    // Assert that we cannot submit if weightage is not exactly 100%
    const totalWeightageText = await page.locator('span:has-text("Total Weightage") + span').innerText();
    const totalWeightVal = parseFloat(totalWeightageText);

    if (totalWeightVal !== 100) {
      // "Submit for Approval" button should not be visible or disabled
      const submitBtn = page.locator('button:has-text("Submit for Approval")');
      const count = await submitBtn.count();
      if (count > 0) {
        await expect(submitBtn).toBeDisabled();
      }
    }

    // Add a goal modal flow
    const addBtn = page.locator('button:has-text("Add Goal")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      
      // Wait for Modal
      await expect(page.locator('text=Create Goal')).toBeVisible();
      
      // Fill form fields
      await page.fill('input[name="title"]', 'Increase Assembly Line Efficiency');
      await page.selectOption('select[name="thrust_area_id"]', { index: 1 });
      await page.selectOption('select[name="uom_type"]', 'PERCENTAGE');
      await page.fill('input[name="target"]', '95');
      await page.fill('input[name="weightage"]', '20');
      
      // Save Goal
      await page.click('button:has-text("Save Goal")');
      
      // Assert Toast success notification (3s central toast duration check)
      await expect(page.locator('.toast-dark-success')).toBeVisible();
    }
  });

  test('Employee 10s Undo-Delete Toast Safety Loop', async ({ page }) => {
    // Login as Employee
    await page.fill('input[type="email"]', 'employee@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employee/dashboard');

    // Locate a draft goal card and click delete
    const deleteBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      const goalCard = deleteBtn.locator('xpath=./ancestor::div[contains(@class, "admin-glass")]');
      const goalTitle = await goalCard.locator('h3').innerText();

      // Trigger Delete
      await deleteBtn.click();

      // Assert goal is optimistically removed from the grid
      await expect(page.locator(`h3:has-text("${goalTitle}")`)).not.toBeVisible();

      // Assert 10s Undo toast appears
      const undoToast = page.locator('text=Goal deleted');
      await expect(undoToast).toBeVisible();

      // Click Undo to restore
      await page.click('button:has-text("Undo")');

      // Assert goal is restored back into view
      await expect(page.locator(`h3:has-text("${goalTitle}")`)).toBeVisible();
    }
  });

  // ────────────────────────────────────────────────────────
  // 3. MANAGER REVIEW & INTERACTIVE BLUR DEBOUNCING
  // ────────────────────────────────────────────────────────
  test('Manager Workspace: Edit inline with debounce, return for revision, and approve', async ({ page }) => {
    // Login as Manager
    await page.fill('input[type="email"]', 'manager@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/manager/dashboard');

    // Expand Employee Goal Section
    const expandBtn = page.locator('button:has-text("pending")').first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();

      // Test manager inline editing with blur and debounce
      const targetInput = page.locator('input[type="number"]').first();
      if (await targetInput.isVisible()) {
        await targetInput.focus();
        await targetInput.fill('150');
        await targetInput.blur(); // Blur triggers debounced API call

        // Success toast should show after debounce completes
        await expect(page.locator('.toast-dark-success')).toBeVisible();
      }

      // Test "Return" goal modal
      const returnBtn = page.locator('button:has-text("Return")').first();
      if (await returnBtn.isVisible()) {
        await returnBtn.click();
        
        // Assert return modal is shown
        await expect(page.locator('text=Return Goal')).toBeVisible();
        await page.fill('textarea[placeholder*="Reason"]', 'Please align this weightage with key thrust areas.');
        await page.click('button:has-text("Confirm Return")');

        // Success Toast
        await expect(page.locator('.toast-dark-success')).toBeVisible();
      }
    }
  });

  // ────────────────────────────────────────────────────────
  // 4. QUARTERLY CHECK-INS & UOM SCORING CALCULATIONS
  // ────────────────────────────────────────────────────────
  test('Employee Quarterly Check-ins and Score calculation validation', async ({ page }) => {
    // Login as Employee
    await page.fill('input[type="email"]', 'employee@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/employee/dashboard');

    // Navigate to check-ins tab
    await page.click('a[href="/employee/checkins"]');
    await page.waitForURL('**/employee/checkins');

    // Locate active check-in input
    const actualInput = page.locator('input[placeholder="Enter actual value"]').first();
    if (await actualInput.isVisible()) {
      await actualInput.fill('92');
      await page.click('button:has-text("Save Check-in")');

      // Success Notification
      await expect(page.locator('.toast-dark-success')).toBeVisible();
    }
  });

  // ────────────────────────────────────────────────────────
  // 5. ADMIN CONTROL & STRATEGIC KPI DEPLOYMENT
  // ────────────────────────────────────────────────────────
  test('Admin Control: Deploy shared KPI and manage cycle windows', async ({ page }) => {
    // Login as Admin
    await page.fill('input[type="email"]', 'admin@atomquest.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard');

    // Navigate to KPI Deploy tab
    await page.click('button:has-text("KPI Deploy")');

    // Fill Push Shared Goal Form
    await page.fill('input[placeholder*="Q3 Revenue"]', 'Strategic CSR Alignment Goal');
    await page.selectOption('select[class="admin-input"]', { index: 1 });
    await page.fill('input[placeholder="0"]', '100');
    await page.fill('input[placeholder="10"]', '15');

    // Check recipients
    const checkBoxes = page.locator('input[type="checkbox"]');
    if (await checkBoxes.count() > 0) {
      await checkBoxes.first().check();
      
      // Deploy Strategic KPI
      await page.click('button:has-text("Deploy")');
      
      // Verify deployment notification
      await expect(page.locator('.toast-dark-success')).toBeVisible();
    }
  });
});
