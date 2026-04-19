/**
 * Expo config plugin that copies adi-registration.properties into the
 * Android app's assets folder so Google Play can verify package ownership
 * (Android Developer Verification).
 *
 * https://support.google.com/googleplay/android-developer/answer/14409628
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FILENAME = "adi-registration.properties";

const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const sourcePath = path.join(__dirname, FILENAME);
      const assetsDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );
      const targetPath = path.join(assetsDir, FILENAME);

      if (!fs.existsSync(sourcePath)) {
        console.warn(
          `[with-adi-registration] Source file not found: ${sourcePath} — skipping (preview build)`
        );
        return cfg;
      }

      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      return cfg;
    },
  ]);
};

module.exports = withAdiRegistration;
