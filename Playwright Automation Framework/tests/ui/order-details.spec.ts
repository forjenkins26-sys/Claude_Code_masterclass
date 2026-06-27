import { test, expect } from '@playwright/test';
import { OrderDetailsPage } from '../../src/pages/OrderDetailsPage';

const URL = 'http://localhost:7000/order-details.html';

test.describe('SCRUM-255 — Order Details Page', () => {

  let orderDetailsPage: OrderDetailsPage;

  test.beforeEach(async ({ page }) => {
    orderDetailsPage = new OrderDetailsPage(page);
    await orderDetailsPage.navigate();
  });

  // --- Valid Scenarios ---

  test('OD-001: Verify Order ID displayed prominently at top of page @SCRUM-256', async ({ page }) => {
    const orderId = await orderDetailsPage.getOrderId();
    expect(orderId).toContain('#BLK-20240625-8842');
  });

  test('OD-002: Verify all ordered items listed with correct name, quantity, price and subtotal @SCRUM-257', async ({ page }) => {
    await expect(page.getByText('Amul Full Cream Milk 500ml')).toBeVisible();
    await expect(page.getByText('Qty: 2 × ₹32')).toBeVisible();
    await expect(page.getByText('Britannia Brown Bread')).toBeVisible();
    await expect(page.getByText('Farm Fresh Eggs (6 pack)')).toBeVisible();
    await expect(page.getByText('Dove Body Wash 200ml')).toBeVisible();
  });

  test('OD-003: Verify order total matches subtotal + delivery fee + taxes @SCRUM-258', async ({ page }) => {
    await expect(page.getByText('₹380')).toBeVisible();
    await expect(page.getByText('−₹38')).toBeVisible();
    await expect(page.getByText('₹25')).toBeVisible();
    await expect(page.getByText('₹5')).toBeVisible();
    await expect(page.getByText('₹372').first()).toBeVisible();
  });

  test('OD-004: Verify delivery address shown exactly as entered @SCRUM-259', async ({ page }) => {
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('42, Green Park Colony, Sector 14, Gurugram — 122001')).toBeVisible();
  });

  test('OD-005: Verify payment method shown @SCRUM-260', async ({ page }) => {
    await expect(page.getByText('UPI — rahul@okaxis')).toBeVisible();
    await expect(page.getByText('Amount paid: ₹372')).toBeVisible();
  });

  test('OD-006: Verify order status timeline shows current step highlighted @SCRUM-261', async ({ page }) => {
    const timeline = page.locator('.timeline');
    await expect(timeline.getByText('Placed', { exact: true })).toBeVisible();
    await expect(timeline.getByText('Confirmed', { exact: true })).toBeVisible();
    await expect(timeline.getByText('Dispatched', { exact: true })).toBeVisible();
    await expect(timeline.getByText('Delivered', { exact: true })).toBeVisible();
    // Current step dot has yellow background (css class: current)
    const currentDot = page.locator('.step-dot.current');
    await expect(currentDot).toBeVisible();
  });

  test('OD-007: Verify estimated delivery date/time displayed @SCRUM-262', async ({ page }) => {
    const eta = await orderDetailsPage.getEtaText();
    expect(eta).toContain('8 minutes');
    expect(eta).toContain('11:05 AM');
  });

  // --- Negative / Rule Tests ---

  test('OD-008: Verify Cancel Order button NOT visible when status is Dispatched @SCRUM-263', async ({ page }) => {
    // AC line 8: Cancel visible ONLY when status = Placed or Confirmed
    // Current status = Dispatched → Cancel button should NOT be visible
    await expect(orderDetailsPage.cancelOrderButton).not.toBeVisible();
  });

  test('OD-009: Verify Reorder button adds items to cart @SCRUM-264', async ({ page }) => {
    await orderDetailsPage.reorder();
    await expect(page.getByText('Items added to cart')).toBeVisible();
  });

  test('OD-010: Verify Invoice button triggers download @SCRUM-265', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await orderDetailsPage.downloadInvoice();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('invoice');
  });

  // --- Cancel Flow ---

  test('OD-011: Verify Cancel Order confirm dialog and status update @SCRUM-266', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await orderDetailsPage.cancelOrder();
    const status = await orderDetailsPage.getStatus();
    expect(status).toBe('Cancelled');
    await expect(orderDetailsPage.cancelOrderButton).toBeDisabled();
  });

  test('OD-012: Verify Back button navigates away from page @SCRUM-267', async ({ page }) => {
    // Navigate to a page first so history exists
    await page.goto('http://localhost:7000/blinkit-login.html');
    await page.goto(URL);
    await orderDetailsPage.clickBack();
    await expect(page).toHaveURL('http://localhost:7000/blinkit-login.html');
  });

  test('OD-013: Verify Cancel dismissed — order status remains unchanged @SCRUM-268', async ({ page }) => {
    page.on('dialog', dialog => dialog.dismiss());
    await orderDetailsPage.cancelOrder();
    const status = await orderDetailsPage.getStatus();
    expect(status).toBe('Out for Delivery');
    await expect(orderDetailsPage.cancelOrderButton).toBeEnabled();
  });

});
