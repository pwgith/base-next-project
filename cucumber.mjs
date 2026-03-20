export default {
  paths: ["specification/features/**/*.feature"],
  import: ["test/support/world.ts", "test/step-definitions/**/*.ts"],
  format: ["progress-bar"],
  publishQuiet: true,
};
