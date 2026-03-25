#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const CHANGELOG_PATH = path.join(repoRoot, "CHANGELOG.md");
const PID_DIR = path.join(repoRoot, ".proofmembership");
const PID_FILE = path.join(PID_DIR, "changelog-watch.pid");
const POLL_INTERVAL_MS = 2000;
const MAX_EVENTS = 40;
const AUTO_START = "<!-- AUTO-CHANGELOG-START -->";
const AUTO_END = "<!-- AUTO-CHANGELOG-END -->";

const watchTargets = [
  "README.md",
  "USER_MANUAL.md",
  "DEVNET_TESTING.md",
  "Anchor.toml",
  "package.json",
  ".github",
  "apps",
  "packages",
  "programs",
  "services",
  "scripts",
  "tests",
];

const ignoredDirs = new Set([
  ".git",
  ".next",
  ".proofmembership",
  "node_modules",
  "target",
  "test-ledger",
]);

/** @type {Map<string, string>} */
let snapshot = new Map();
/** @type {Array<{ timestamp: string; type: string; file: string }>} */
let activity = [];
/** @type {NodeJS.Timeout | null} */
let flushTimer = null;

function ensurePidDir() {
  if (!fs.existsSync(PID_DIR)) {
    fs.mkdirSync(PID_DIR, { recursive: true });
  }
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function statSignature(stats) {
  return `${stats.mtimeMs}:${stats.size}`;
}

function shouldSkipDirectory(name) {
  return ignoredDirs.has(name);
}

function walkDirectory(dirPath, output) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "CHANGELOG.md") {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }
      walkDirectory(fullPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stats = fs.statSync(fullPath);
    output.set(toRepoRelative(fullPath), statSignature(stats));
  }
}

function collectSnapshot() {
  const nextSnapshot = new Map();

  for (const target of watchTargets) {
    const fullPath = path.join(repoRoot, target);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      walkDirectory(fullPath, nextSnapshot);
      continue;
    }

    nextSnapshot.set(toRepoRelative(fullPath), statSignature(stats));
  }

  return nextSnapshot;
}

function queueActivity(type, file) {
  activity.unshift({
    timestamp: new Date().toISOString().replace("T", " ").replace("Z", " UTC"),
    type,
    file,
  });
  activity = activity.slice(0, MAX_EVENTS);
}

function scheduleFlush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    writeChangelog();
  }, 1500);
}

function detectChanges(nextSnapshot) {
  for (const [file, signature] of nextSnapshot) {
    const previous = snapshot.get(file);
    if (!previous) {
      queueActivity("Created", file);
    } else if (previous !== signature) {
      queueActivity("Updated", file);
    }
  }

  for (const file of snapshot.keys()) {
    if (!nextSnapshot.has(file)) {
      queueActivity("Deleted", file);
    }
  }
}

function ensureBaseChangelog(changelogText) {
  if (changelogText.includes("## Unreleased")) {
    return changelogText;
  }

  return `${changelogText.trimEnd()}\n\n## Unreleased\n`;
}

function renderAutoSection() {
  const lines = [
    "### Development Activity",
    "",
    "_Auto-generated from the local changelog watcher. Curated release notes should stay in the sections above._",
    "",
  ];

  if (!activity.length) {
    lines.push("- No file changes recorded yet.");
  } else {
    for (const entry of activity) {
      lines.push(`- ${entry.timestamp} - ${entry.type} \`${entry.file}\``);
    }
  }

  return `${AUTO_START}\n${lines.join("\n")}\n${AUTO_END}`;
}

function writeChangelog() {
  const existing = fs.existsSync(CHANGELOG_PATH)
    ? fs.readFileSync(CHANGELOG_PATH, "utf8")
    : "# Changelog\n\nAll notable changes to this project will be documented in this file.\n";

  const withUnreleased = ensureBaseChangelog(existing);
  const autoSection = renderAutoSection();

  let next;
  const autoPattern = new RegExp(`${AUTO_START}[\\s\\S]*?${AUTO_END}`);
  if (autoPattern.test(withUnreleased)) {
    next = withUnreleased.replace(autoPattern, autoSection);
  } else {
    next = withUnreleased.replace("## Unreleased", `## Unreleased\n\n${autoSection}`);
  }

  fs.writeFileSync(CHANGELOG_PATH, `${next.trimEnd()}\n`, "utf8");
}

function tick() {
  const nextSnapshot = collectSnapshot();
  detectChanges(nextSnapshot);
  snapshot = nextSnapshot;

  if (activity.length) {
    scheduleFlush();
  }
}

function writePid() {
  ensurePidDir();
  fs.writeFileSync(PID_FILE, `${process.pid}\n`, "utf8");
}

function cleanupAndExit() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (fs.existsSync(PID_FILE)) {
    fs.rmSync(PID_FILE, { force: true });
  }

  process.exit(0);
}

writePid();
snapshot = collectSnapshot();
writeChangelog();

console.log("ProofMembership changelog watcher running...");

const interval = setInterval(tick, POLL_INTERVAL_MS);

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
