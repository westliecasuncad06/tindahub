import { test, expect } from "@playwright/test";
import { applyCommand } from "../../src/lib/domain";

test("retrying an acknowledged-late payment does not record it twice", async ({
  page,
}) => {
  await page.goto("/debts");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Record debt", exact: true }).click();
  await page.getByLabel("Customer name").fill("Retry Customer");
  await page.getByLabel("Total amount").fill("100");
  await page.getByRole("button", { name: "Save debt", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("Search customers").fill("Retry Customer");
  await expect(page.locator(".record-table tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page.getByLabel("Payment amount").fill("20");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (key, value) {
      original.call(this, key, value);
      if (key === "tindahub_demo_v2" && !failed) {
        failed = true;
        throw new Error("Simulated acknowledgement failure");
      }
    };
  });
  await page.getByRole("button", { name: "Save payment", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Simulated acknowledgement failure", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save payment", exact: true }).click();
  await expect(page.getByText("₱80.00", { exact: true }).first()).toBeVisible();
});

test("a count of one product never restores untouched stock sold elsewhere", async ({
  page,
}) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: "English", exact: true }).click();
  for (const name of ["Unobserved Product", "Observed Product"]) {
    await page
      .getByRole("button", { name: "Add product", exact: true })
      .click();
    await page.getByLabel("Product name", { exact: true }).fill(name);
    await page.getByLabel("Cost price").fill("1");
    await page.getByLabel("Selling price").fill("2");
    await page.getByLabel("Opening stock").fill("10");
    await page
      .getByRole("button", { name: "Save product", exact: true })
      .click();
  }
  await page.goto("/inventory/count");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tindahub_demo_v2")!),
  );
  const product = saved.products.find(
    (p: { name: string }) => p.name === "Unobserved Product",
  );
  const sold = applyCommand(saved, {
    id: crypto.randomUUID(),
    type: "sale.checkout",
    payload: { items: [{ product_id: product.id, qty: 1 }], cash: 10 },
  });
  await page.evaluate(
    (value) => localStorage.setItem("tindahub_demo_v2", JSON.stringify(value)),
    sold,
  );
  await page.getByLabel("Count Observed Product", { exact: true }).fill("8");
  await page
    .getByRole("button", { name: "Save physical count", exact: true })
    .click();
  await expect(
    page.getByText("Count saved. Your ledger is up to date."),
  ).toBeVisible();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tindahub_demo_v2")!),
  );
  expect(
    after.products.find(
      (p: { name: string }) => p.name === "Unobserved Product",
    ).stock_qty,
  ).toBe(9);
});

test("fractional cart lines display the same rounding as the receipt total", async ({
  page,
}) => {
  await page.goto("/inventory");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Rounding Sample");
  await page.getByLabel("Cost price").fill("0.29");
  await page.getByLabel("Selling price").fill("0.29");
  await page.getByLabel("Opening stock").fill("1");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.goto("/pos");
  await page.getByLabel("Search products").fill("Rounding Sample");
  await page
    .getByRole("button", { name: "Add Rounding Sample", exact: true })
    .click();
  await page
    .getByLabel("Quantity Rounding Sample", { exact: true })
    .first()
    .fill("0.5");
  await expect(page.locator(".desktop-cart .cart-line-end strong")).toHaveText(
    "₱0.15",
  );
});

test("quick picks and cashier keyboard shortcuts work", async ({ page }) => {
  await page.goto("/pos");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page
    .getByRole("button", { name: /^Quick add / })
    .first()
    .click();
  await expect(page.locator(".desktop-cart .cart-line")).toHaveCount(1);
  await page.keyboard.press("/");
  await expect(page.getByLabel("Search products")).toBeFocused();
  await page.getByLabel("Search products").fill("Kopiko");
  await page.keyboard.press("Enter");
  await page.keyboard.press("F2");
  await expect(page.getByLabel("Cash received")).toBeVisible();
});

test("dashboard hydrates without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Sales bars and gross profit line" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("credit checkout, physical count, drawer entry and preferences work together", async ({
  page,
}) => {
  await page.goto("/pos");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Search products").fill("Lucky Me");
  await page.getByRole("button", { name: /Add Lucky Me/ }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  await page
    .getByRole("button", { name: "Customer credit", exact: true })
    .click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Credit Browser Customer");
  await page.getByLabel("Downpayment", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Complete sale", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sale complete" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New sale", exact: true }).click();
  await page.goto("/debts");
  await page.getByLabel("Search customers").fill("Credit Browser Customer");
  await expect(page.getByText("₱10.00", { exact: true }).first()).toBeVisible();
  await page.goto("/inventory/count");
  await page.getByLabel("Search products to count").fill("Lucky Me");
  const count = page.getByLabel("Count Lucky Me Pancit Canton", {
    exact: true,
  });
  const old = Number(await count.inputValue());
  await count.fill(String(old - 1));
  await page
    .getByRole("button", { name: "Save physical count", exact: true })
    .click();
  await expect(
    page.getByText("Count saved. Your ledger is up to date."),
  ).toBeVisible();
  await page.goto("/cash-drawer");
  await page
    .getByRole("button", { name: "Record cash movement", exact: true })
    .click();
  await page.getByLabel("Amount", { exact: true }).fill("50");
  await page.getByLabel("Note", { exact: true }).fill("Browser cash deposit");
  await page
    .getByRole("button", { name: "Save cash record", exact: true })
    .click();
  await expect(
    page.getByText("Browser cash deposit", { exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(
    page.getByText("All stock balances match.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace na para sa iyo." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Workspace na para sa iyo." }),
  ).toBeVisible();
});

test("unconfigured authentication offers an explicit demo without fake sign-in", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(
    page.getByRole("link", { name: "Open demo workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("button", { name: "Send reset link" }),
  ).toBeDisabled();
});

test("cashier and owner workflows persist and reconcile in the explicit demo", async ({
  page,
}) => {
  await page.goto("/pos");
  await expect(page.getByText("Demo workspace", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Search products").fill("Lucky Me");
  await page.getByRole("button", { name: /Add Lucky Me/ }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  await page.getByLabel("Cash received").fill("100");
  await page
    .getByRole("button", { name: "Complete sale", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sale complete" }),
  ).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".receipt")).toBeVisible();
  await expect(page.locator(".pos-layout")).not.toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "New sale", exact: true }).click();
  await page.goto("/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Browser Test Snack");
  await page.getByLabel("Cost price").fill("10");
  await page.getByLabel("Selling price").fill("13");
  await page.getByLabel("Opening stock").fill("20");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.getByLabel("Search inventory").fill("Browser Test Snack");
  await expect(
    page.getByText("Browser Test Snack", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Search inventory").fill("Browser Test Snack");
  await expect(
    page.getByText("Browser Test Snack", { exact: true }),
  ).toBeVisible();
  await page.goto("/debts");
  await page.getByRole("button", { name: "Record debt", exact: true }).click();
  await page.getByLabel("Customer name").fill("Browser Test Customer");
  await page.getByLabel("Total amount").fill("100");
  await page.getByRole("button", { name: "Save debt", exact: true }).click();
  await page.getByLabel("Search customers").fill("Browser Test Customer");
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page.getByLabel("Payment amount").fill("40");
  await page.getByRole("button", { name: "Save payment", exact: true }).click();
  await expect(page.getByText("₱60.00", { exact: true }).first()).toBeVisible();
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Description").fill("Browser test fare");
  await page.getByLabel("Expense amount").fill("20");
  await page.getByRole("button", { name: "Save expense", exact: true }).click();
  await expect(
    page.getByText("Browser test fare", { exact: true }),
  ).toBeVisible();
  await page.goto("/reports");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await page.goto("/settings");
  await page.getByLabel("Store name").fill("Browser Sample Store");
  await page
    .getByRole("button", { name: "Save store details", exact: true })
    .click();
  await expect(
    page.getByText("Browser Sample Store", { exact: true }).first(),
  ).toBeVisible();
});

test("all operational screens reflow from small phones to wide desktops", async ({
  page,
}) => {
  await page.goto("/pos");
  await page.getByRole("button", { name: "English", exact: true }).click();
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/pos",
      "/inventory",
      "/inventory/count",
      "/dashboard",
      "/debts",
      "/expenses",
      "/reports",
      "/settings",
      "/cash-drawer",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        route + " at " + width,
      ).toBeTruthy();
    }
  }
});

test("phone checkout stays usable and dialogs close using Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pos");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Search products").fill("Kopiko");
  await page.getByRole("button", { name: /Add Kopiko/ }).click();
  await page.getByRole("button", { name: /View cart/ }).click();
  await page.getByRole("button", { name: "Checkout", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Cash received")).not.toBeVisible();
});
