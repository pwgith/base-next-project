import { setWorldConstructor, Before, After, setDefaultTimeout } from "@cucumber/cucumber";
import { Application } from "./application";

// Real AI API calls can take 30–60 seconds; allow generous timeout per step.
setDefaultTimeout(120_000);

class CustomWorld {
  app!: Application;
  /** Tracks which file was selected in the current scenario (used by confirmUpload). */
  selectedFileName?: string;
}

setWorldConstructor(CustomWorld);

Before(async function (this: CustomWorld) {
  this.app = new Application();
  await this.app.launch();
});

After(async function (this: CustomWorld) {
  await this.app.close();
});
