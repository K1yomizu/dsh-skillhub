/**
 * Compose the reserved `desktop` profile's config tree without booting it.
 *
 * `dsh --profile desktop --dump-config` cannot be used to check this: the launcher
 * guards the boot action with `rejectElectronProfile` unconditionally, and the
 * `manageDesktopProfile` argument only unbinds the `plugin` subcommand. The
 * composer underneath takes no such stance, so calling `runDumpConfig` directly
 * runs the real composition — every bundle layer, then the profile's own
 * `cordis.patch.yml` — against whatever is on disk.
 *
 * Run it from an installation (`DSH_INSTALL`) rather than from this checkout: the
 * point is also to exercise the two-anchor resolution, where in-box bundles come
 * from the installation and profile-installed ones from the profile.
 *
 *   DSH_INSTALL=…/node_modules/@deepseek-ai/dsh node scripts/dump-desktop.mjs
 */
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const install = process.env.DSH_INSTALL
if (install === undefined || install === '') {
  console.error('dump-desktop: set DSH_INSTALL to a dsh installation (…/node_modules/@deepseek-ai/dsh)')
  process.exit(2)
}

const entry = join(resolve(install), 'lib', 'dump-config-crgOY3tW.js')
if (!existsSync(entry)) {
  console.error(`dump-desktop: no config composer at ${entry}`)
  process.exit(2)
}

const { runDumpConfig } = await import(pathToFileURL(entry).href)

// (profile, defaultOnly, patch overlays, from-default-profile template)
runDumpConfig('desktop', false, [], undefined)
