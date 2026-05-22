import { test, expect } from "@playwright/test";

// ============================================================
// E2E Tests: Landing Page
// Tests condition assignment, navigation, and UI elements
// ============================================================

test.describe("Landing Page", () => {
  test("should load homepage with Ada branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Ada");
    await expect(page).toHaveTitle(/Ada/);
  });

  test("should show both condition descriptions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Condición A — Avatar")).toBeVisible();
    await expect(page.getByText("Condición B — Texto")).toBeVisible();
  });

  test("should show all 4 research questions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("RQ1")).toBeVisible();
    await expect(page.getByText("RQ2")).toBeVisible();
    await expect(page.getByText("RQ3")).toBeVisible();
    await expect(page.getByText("RQ4")).toBeVisible();
  });

  test("should have start random button", async ({ page }) => {
    await page.goto("/");
    const btn = page.getByTestId("start-random");
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("should have forced condition buttons", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("start-condition-a")).toBeVisible();
    await expect(page.getByTestId("start-condition-b")).toBeVisible();
  });

  test("Condition B button should navigate to session with text condition", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("start-condition-b").click();
    await page.waitForURL(/\/session/, { timeout: 5000 });
    expect(page.url()).toContain("condition=B");
  });

  test("Condition A button should navigate to session with avatar condition", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("start-condition-a").click();
    await page.waitForURL(/\/session/, { timeout: 5000 });
    expect(page.url()).toContain("condition=A");
  });
});
