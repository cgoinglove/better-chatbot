import { rimraf } from "rimraf";

async function clean(dirsToClean?: string[]) {
  try {
    console.log("🧹 Cleaning up...");

    // Default directories to clean if none provided
    const defaultDirs = [".next", "node_modules", "tsconfig.tsbuildinfo"];
    const dirs =
      dirsToClean && dirsToClean.length > 0 ? dirsToClean : defaultDirs;

    // Remove each specified directory
    for (const dir of dirs) {
      await rimraf(dir);
      console.log(`✅ Removed ${dir} directory`);
    }
    console.log("✨ Cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Parse command line arguments, skip the first two (node and script path)
const args = process.argv.slice(2);
clean(args);
