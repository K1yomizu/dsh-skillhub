/**
 * Manage plugins in the reserved `desktop` profile.
 *
 * `dsh plugin --profile desktop ...` is refused on purpose. `lib/bin.js` hard-codes
 * that refusal, in both the boot action and the plugin subcommand:
 *
 *   rejectElectronProfile(program, profile)          // profile === "desktop" -> error
 *   if (!manageDesktopProfile) rejectElectronProfile(plugin, options.profile)
 *
 * The unbinding is an argument rather than a flag: `parseDshArgs(argv, version,
 * manageDesktopProfile)` and the documented purpose is "permit Desktop's installed
 * carrier to manage its reserved profile's plugins". The shell front-end only ever
 * passes `true` when the desktop application is the caller, so reaching the same
 * function directly takes exactly the path the app takes — profile lock included:
 * `runPlugin` wraps the desktop case in `withFileLock(profile/package.json)` and
 * calls `runProfilePnpm` instead of the generic `runPluginCommand`, so the
 * compatibility preflight, the package.json/pnpm-lock.yaml rollback snapshot, and
 * the bundle reconcile all still happen.
 *
 * Point DSH_INSTALL at a dsh installation (the directory holding its package.json —
 * i.e. `.../node_modules/@deepseek-ai/dsh`), because the plugin manager resolves the
 * profile's bundles against the installation, not against this checkout.
 *
 *   DSH_INSTALL=... node scripts/desktop-profile.mjs add "file:/abs/path/to/plugin"
 *   DSH_INSTALL=... node scripts/desktop-profile.mjs remove dsh-skillhub
 *   DSH_INSTALL=... node scripts/desktop-profile.mjs install
 *
 * Quit DeepSeek Harness Desktop first: the installer takes a lock on the profile's
 * package.json, and the app must re-read the profile when it next starts.
 */
import { join, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const install = process.env.DSH_INSTALL
if (install === undefined || install === '') {
  console.error('desktop-profile: set DSH_INSTALL to a dsh installation (…/node_modules/@deepseek-ai/dsh)')
  process.exit(2)
}

const binPath = join(resolve(install), 'lib', 'bin.js')
if (!existsSync(binPath)) {
  console.error(`desktop-profile: no dsh entry point at ${binPath}`)
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error('usage: node scripts/desktop-profile.mjs <pnpm-args...>')
  process.exit(2)
}

const { runCli } = await import(pathToFileURL(binPath).href)

// runCli reads its own argv, so present the shape its parser expects.
process.argv = [process.execPath, 'dsh', 'plugin', '--profile', 'desktop', ...args]

await runCli({ manageDesktopProfile: true })
