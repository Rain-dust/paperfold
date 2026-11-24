"use strict";

const fs = require("node:fs/promises");
const { constants } = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { parseArgs } = require("node:util");

const usage = [
  "node render.cjs scene.html still.png --at 6.65 --width 1920 --height 1080",
  "node render.cjs scene.html film.mp4 --duration 10 --fps 30 --width 1920 --height 1080",
  "Optional: --audio foley.wav --playwright /path/to/playwright --browser /path/to/chrome --software-gl"
].join("\n");

function readNumber(value, label, minimum, integer = false) {
  const number = Number(value);
  if (String(value).trim() === "" || !Number.isFinite(number) || number < minimum || (integer && !Number.isInteger(number))) {
    throw new Error("Invalid " + label + ": " + value);
  }
  return number;
}

function loadPlaywright(input, override) {
  if (override) return require(path.resolve(override));
  const projectRequire = createRequire(input);
  let modulePath;
  try {
    modulePath = projectRequire.resolve("playwright");
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
    try {
      modulePath = require.resolve("playwright");
    } catch (fallbackError) {
      if (fallbackError.code !== "MODULE_NOT_FOUND") throw fallbackError;
      throw new Error("Playwright was not found. Install it in the scene project or pass --playwright.");
    }
  }
  return require(modulePath);
}

async function waitForAvailableOutput(output) {
  try {
    await fs.lstat(output);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new Error("Output already exists: " + output);
}

async function frameAt(page, seconds, type, pageErrors) {
  await page.evaluate(t => window.renderAt(t), seconds);
  const image = await page.screenshot(type === "jpeg" ? { type, quality: 98 } : { type });
  if (pageErrors.length) throw new Error("The page raised an error: " + pageErrors[0]);
  return image;
}

async function writeMovie(page, output, seconds, fps, audio, pageErrors) {
  const totalFrames = Math.ceil(seconds * fps);
  const temp = await fs.mkdtemp(path.join(path.dirname(output), ".radial-render-"));
  const pending = path.join(temp, "pending.mp4");
  const sound = audio
    ? ["-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-af", "apad", "-c:a", "aac", "-b:a", "192k", "-t", String(totalFrames / fps)]
    : ["-an"];
  const encoder = spawn("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-nostdin",
    "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "pipe:0",
    ...sound, "-vf", "scale=out_color_matrix=bt709:out_range=tv",
    "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1",
    "-movflags", "+faststart", pending
  ], { stdio: ["pipe", "ignore", "inherit"], windowsHide: true });
  let launchError;
  encoder.on("error", error => { launchError = error; });
  // The per-write callback reports pipe failures. Keep the stream's event handled.
  encoder.stdin.on("error", () => {});
  const closed = new Promise(resolve => encoder.once("close", resolve));

  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const pixels = await frameAt(page, frame / fps, "jpeg", pageErrors);
      if (launchError) throw launchError;
      await new Promise((resolve, reject) => {
        encoder.stdin.write(pixels, error => error ? reject(error) : resolve());
      });
    }
    encoder.stdin.end();
    const code = await closed;
    if (launchError) throw launchError;
    if (code !== 0) throw new Error("FFmpeg exited with code " + code);
    await fs.copyFile(pending, output, constants.COPYFILE_EXCL);
    return totalFrames;
  } finally {
    if (encoder.exitCode === null && encoder.signalCode === null && !launchError) encoder.kill();
    await closed;
    await fs.rm(pending, { force: true });
    await fs.rmdir(temp);
  }
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      at: { type: "string" },
      duration: { type: "string" },
      audio: { type: "string" },
      "software-gl": { type: "boolean" },
      fps: { type: "string" },
      width: { type: "string", default: "1280" },
      height: { type: "string", default: "720" },
      playwright: { type: "string" },
      browser: { type: "string" }
    }
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  if (positionals.length !== 2) throw new Error(usage);

  const [input, output] = positionals.map(file => path.resolve(file));
  if (![".html", ".htm"].includes(path.extname(input).toLowerCase())) {
    throw new Error("Input must be a local HTML file.");
  }
  const format = path.extname(output).toLowerCase();
  if (![".mp4", ".png"].includes(format)) throw new Error("Output must end in .png or .mp4.");
  if (format === ".mp4" && values.at !== undefined || format === ".png" && (values.duration !== undefined || values.fps !== undefined || values.audio !== undefined)) {
    throw new Error("Use --at for PNG, or --duration, --fps and --audio for MP4.");
  }

  const width = readNumber(values.width, "width", 1, true);
  const height = readNumber(values.height, "height", 1, true);
  const fps = readNumber(values.fps ?? "30", "fps", 1, true);
  const audio = values.audio === undefined ? null : path.resolve(values.audio);
  if (audio) await fs.access(audio, constants.R_OK);
  const at = readNumber(values.at ?? "0", "at", 0);
  if (format === ".mp4" && (width % 2 || height % 2)) {
    throw new Error("MP4 width and height must be even.");
  }
  await fs.access(input, constants.R_OK);
  await waitForAvailableOutput(output);

  const { chromium } = loadPlaywright(input, values.playwright);
  const executablePath = values.browser ? path.resolve(values.browser) : undefined;
  const args = values["software-gl"] ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] : [];
  const browser = await chromium.launch({ headless: true, executablePath, args });
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce"
    });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    const url = pathToFileURL(input);
    url.searchParams.set("export", "1");
    await page.goto(url.href);
    await page.evaluate(async () => { await document.fonts.ready; });
    if (pageErrors.length) throw new Error("The page raised an error: " + pageErrors[0]);
    if (!await page.evaluate(() => typeof window.renderAt === "function")) {
      throw new Error("The scene must define window.renderAt(t).");
    }
    if (format === ".png") {
      await fs.writeFile(output, await frameAt(page, at, "png", pageErrors), { flag: "wx" });
      console.log(output + " (" + at + " s)");
    } else {
      const pageDuration = await page.evaluate(() => window.circularFold?.duration ?? 12);
      const seconds = readNumber(values.duration ?? pageDuration, "duration", 1 / fps);
      const totalFrames = await writeMovie(page, output, seconds, fps, audio, pageErrors);
      console.log(output + " (" + totalFrames + " frames)");
    }
  } finally {
    await browser.close();
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
