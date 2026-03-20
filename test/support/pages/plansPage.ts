import { Page, Locator } from "playwright";
import path from "path";
import fs from "fs";

export class PlansPage {
  private readonly page: Page;

  // --- Locators (defined once) ---
  readonly dropZone: Locator;
  readonly fileInput: Locator;
  readonly roofHeightInput: Locator;
  readonly analyseButton: Locator;
  readonly resetButton: Locator;
  readonly previewArea: Locator;
  readonly roofHeightError: Locator;
  readonly formatError: Locator;
  readonly loadingIndicator: Locator;
  readonly analysisError: Locator;
  readonly annotatedFloorPlan: Locator;
  readonly resultsSummary: Locator;
  readonly totalFloorArea: Locator;
  readonly roomCards: Locator;
  readonly downloadJsonButton: Locator;
  readonly downloadSpreadsheetButton: Locator;
  readonly uploadAnotherButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dropZone = page.getByRole("button", { name: /click.*drag.*paste/i });
    this.fileInput = page.locator('input[type="file"]');
    this.roofHeightInput = page.getByLabel("Default Roof Height (m)");
    this.analyseButton = page.getByRole("button", {
      name: "Analyse floor plan",
    });
    this.resetButton = page.getByRole("button", { name: "Reset form" });
    this.previewArea = page.locator(
      ".rounded-xl.overflow-hidden.border.border-slate-200",
    );
    this.roofHeightError = page.locator("#roofHeightError");
    this.formatError = page.locator('[role="alert"]').first();
    this.loadingIndicator = page.getByText("Analysing floor plan…");
    this.analysisError = page.locator('.bg-red-50[role="alert"]');
    this.annotatedFloorPlan = page.getByRole("heading", {
      name: "Annotated Floor Plan",
    });
    this.resultsSummary = page.getByRole("heading", {
      name: "Analysis Results",
    });
    this.totalFloorArea = page.locator(".text-2xl.font-bold.text-blue-600");
    this.roomCards = page.locator(
      ".bg-gradient-to-r.from-blue-600.to-indigo-600 h3",
    );
    this.downloadJsonButton = page.getByRole("button", {
      name: "Download analysis as JSON",
    });
    this.downloadSpreadsheetButton = page.getByRole("button", {
      name: "Download analysis as spreadsheet",
    });
    this.uploadAnotherButton = page.getByRole("button", {
      name: "Upload another plan",
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("http://localhost:3000/plans");
    await this.page.waitForLoadState("networkidle", { timeout: 60_000 });
  }

  async uploadFile(filePath: string): Promise<void> {
    // The FileDropZone creates a hidden file input when clicked.
    // We need to set up a listener for the file chooser event.
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.dropZone.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  async isPreviewVisible(fileName: string): Promise<boolean> {
    const preview = this.page.getByText(fileName);
    return await preview.isVisible();
  }

  async getRoofHeightValue(): Promise<string> {
    return (await this.roofHeightInput.inputValue()) ?? "";
  }

  async setRoofHeight(value: string): Promise<void> {
    await this.roofHeightInput.clear();
    // For non-numeric or empty values, clearing is sufficient.
    // HTML number inputs treat non-numeric keystrokes as empty, so clearing
    // simulates the real browser behaviour and triggers React's onChange.
    if (value !== "" && !isNaN(Number(value))) {
      await this.roofHeightInput.fill(value);
    }
  }

  async clickAnalyse(): Promise<void> {
    await this.analyseButton.click();
  }

  async waitForResults(): Promise<void> {
    await this.resultsSummary.waitFor({ state: "visible", timeout: 60000 });
  }

  /** Wait for either analysis results or an error to appear. */
  async waitForResultsOrError(): Promise<void> {
    await Promise.race([
      this.resultsSummary.waitFor({ state: "visible", timeout: 60000 }),
      this.analysisError.waitFor({ state: "visible", timeout: 60000 }),
    ]);
  }

  async isAnnotatedPlanFirst(): Promise<boolean> {
    return await this.annotatedFloorPlan.isVisible();
  }

  async getRoomNames(): Promise<string[]> {
    const cards = this.roomCards;
    const count = await cards.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async getTotalFloorArea(): Promise<number> {
    const text = await this.totalFloorArea.textContent();
    return parseFloat(text?.replace(/[^\d.]/g, "") ?? "0");
  }

  async getRoomDimensions(
    roomName: string,
  ): Promise<{ width: number; length: number; height: number }> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const widthText = await card
      .locator("text=Width")
      .locator("..")
      .locator(".font-semibold")
      .textContent();
    const lengthText = await card
      .locator("text=Length")
      .locator("..")
      .locator(".font-semibold")
      .textContent();
    const heightText = await card
      .locator("text=Height")
      .locator("..")
      .locator(".font-semibold")
      .textContent();

    return {
      width: parseFloat(widthText?.replace(/[^\d.]/g, "") ?? "0"),
      length: parseFloat(lengthText?.replace(/[^\d.]/g, "") ?? "0"),
      height: parseFloat(heightText?.replace(/[^\d.]/g, "") ?? "0"),
    };
  }

  async getRoomFloorArea(roomName: string): Promise<number> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const text = await card
      .locator("text=Floor Area")
      .locator("..")
      .locator(".font-semibold")
      .textContent();
    return parseFloat(text?.replace(/[^\d.]/g, "") ?? "0");
  }

  async getRoomCeilingArea(roomName: string): Promise<number> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const text = await card
      .locator("text=Ceiling Area")
      .locator("..")
      .locator(".font-semibold")
      .textContent();
    return parseFloat(text?.replace(/[^\d.]/g, "") ?? "0");
  }

  async getRoomWallAreas(
    roomName: string,
  ): Promise<{ label: string; area: number }[]> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const table = card.locator(`table[aria-label="${roomName} wall areas"]`);
    const rows = table.locator("tbody tr");
    const count = await rows.count();
    const walls: { label: string; area: number }[] = [];
    for (let i = 0; i < count; i++) {
      const cells = rows.nth(i).locator("td");
      const label = (await cells.nth(0).textContent())?.trim() ?? "";
      const areaText = (await cells.nth(3).textContent())?.trim() ?? "0";
      walls.push({
        label,
        area: parseFloat(areaText.replace(/[^\d.]/g, "")),
      });
    }
    return walls;
  }

  async getRoomTotalWallArea(roomName: string): Promise<number> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const table = card.locator(`table[aria-label="${roomName} wall areas"]`);
    const totalText = await table.locator("tfoot td:last-child").textContent();
    return parseFloat(totalText?.replace(/[^\d.]/g, "") ?? "0");
  }

  async getRoomDiagramLabels(roomName: string): Promise<string[]> {
    const card = this.page
      .locator(".rounded-2xl.shadow-xl")
      .filter({ hasText: roomName });
    const labels = card.locator(
      ".font-bold.text-blue-700",
    );
    const count = await labels.count();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await labels.nth(i).textContent())?.trim() ?? "";
      // Extract just the "Wall X" part
      const match = text.match(/Wall [A-D]/);
      if (match) result.push(match[0]);
    }
    return result;
  }

  async downloadJson(): Promise<string> {
    const downloadPromise = this.page.waitForEvent("download");
    await this.downloadJsonButton.click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async downloadSpreadsheet(): Promise<string> {
    const downloadPromise = this.page.waitForEvent("download");
    await this.downloadSpreadsheetButton.click();
    const download = await downloadPromise;
    return download.suggestedFilename();
  }

  async getFormatError(): Promise<string | null> {
    const alert = this.page.locator('[role="alert"]').first();
    if (await alert.isVisible()) {
      return await alert.textContent();
    }
    return null;
  }

  async getAnalysisError(): Promise<string | null> {
    const alert = this.analysisError;
    if (await alert.isVisible({ timeout: 1000 }).catch(() => false)) {
      const text = await alert.locator("p").textContent({ timeout: 3000 }).catch(() => null);
      return text?.trim() ?? null;
    }
    return null;
  }

  async getRoofHeightError(): Promise<string | null> {
    const error = this.roofHeightError;
    if (await error.isVisible()) {
      return await error.textContent();
    }
    return null;
  }

  async isUploadFormVisible(): Promise<boolean> {
    return await this.analyseButton.isVisible();
  }

  /** Simulate pasting an image from the clipboard using Playwright's dispatch. */
  async pasteImage(imagePath: string): Promise<void> {
    const resolvedPath = path.resolve(imagePath);
    const buffer = fs.readFileSync(resolvedPath);
    const base64 = buffer.toString("base64");
    const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

    await this.page.evaluate(
      ({ base64Data, mime }) => {
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mime });
        const file = new File([blob], "pasted-image.png", { type: mime });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });
        document.dispatchEvent(pasteEvent);
      },
      { base64Data: base64, mime: mimeType },
    );
  }

  /** Simulate pasting text (no image) from the clipboard. */
  async pasteText(text: string): Promise<void> {
    await this.page.evaluate(
      (textContent) => {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData("text/plain", textContent);

        const pasteEvent = new ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dataTransfer,
        });
        document.dispatchEvent(pasteEvent);
      },
      text,
    );
  }

  /** Check whether the pasted image preview is visible. */
  async isPastedPreviewVisible(): Promise<boolean> {
    const preview = this.page.getByText("pasted-image.png");
    return await preview.isVisible().catch(() => false);
  }
}
