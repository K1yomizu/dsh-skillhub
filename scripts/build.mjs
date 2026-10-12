/**
 * Build script for `dsh-skillhub`.
 *
 * Produces the two artifacts a dual-face DSH bundle needs:
 *
 *   lib/index.js   Host half — ESM, Node platform. Everything except the
 *                  framework (`@deepseek-ai/*`) and Node builtins is inlined,
 *                  so the profile needs no runtime dependencies of its own.
 *
 *   lib/client.js  Browser half — a CommonJS bundle wrapped in the loader's
 *                  lazy factory:
 *                    window.__ModuleLoader__.load({ id, factory: (require) => … })
 *                  `react` and `react/jsx-runtime` stay external because the
 *                  shell seeds them into the browser module table
 *                  (`packages/client/web/src/platform.ts#PLATFORM_MODULES`);
 *                  requiring them from anywhere else would create a second
 *                  React instance and break hooks.
 *
 * The factory's `id` must equal the package name — the loader keys the boot map
 * by it.
 *
 * Run: node scripts/build.mjs
 */

import { build } from 'esbuild'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
const PACKAGE_NAME = pkg.name

/** Must match `PLATFORM_MODULES` in the DSH client shell. */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

/**
 * Keep the framework out of the Host bundle.
 *
 * esbuild's JS API accepts `external` as literal strings only — the `/regex/`
 * form is a CLI-only convenience — so the "whole `@deepseek-ai/*` scope is
 * provided by the host" rule is expressed as a resolver plugin. Node builtins
 * need no entry here: `platform: 'node'` already externalises them.
 */
const externalFramework = {
  name: 'external-framework',
  setup(build) {
    build.onResolve({ filter: /^@deepseek-ai\// }, args => ({ path: args.path, external: true }))
  },
}

/** Fail loudly instead of shipping a silently-wrong artifact. */
function assert(condition, message) {
  if (!condition) throw new Error(`build: ${message}`)
}

async function buildHost() {
  const outfile = join(ROOT, 'lib', 'index.js')
  const result = await build({
    entryPoints: [join(ROOT, 'src', 'host', 'index.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    plugins: [externalFramework],
    logLevel: 'warning',
    metafile: true,
  })
  const source = await readFile(outfile, 'utf8')
  assert(source.includes('export'), 'host bundle has no ESM exports')
  assert(source.includes('dsh-skillhub'), 'host bundle does not carry the plugin id')
  assert(source.includes('dsh_skillhub_search'), 'host bundle does not register the model tool')
  const inputs = Object.keys(result.metafile.inputs).length
  console.log(`[build] host   -> lib/index.js  (${inputs} inputs, ${source.length} bytes)`)
}

async function buildClient() {
  const outdir = join(ROOT, 'lib')
  await mkdir(outdir, { recursive: true })
  const outfile = join(outdir, 'client.js')

  await build({
    entryPoints: [join(ROOT, 'src', 'client', 'index.tsx')],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    external: CLIENT_EXTERNALS,
    logLevel: 'warning',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    banner: {
      js: [
        '// Built by dsh-skillhub — do not edit; see scripts/build.mjs.',
        `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: function (require) {`,
        'var module = { exports: {} }; var exports = module.exports;',
      ].join('\n'),
    },
    footer: { js: 'return module.exports;\n} });' },
    metafile: true,
  })

  // esbuild writes the sourcemap reference after the footer, which would leave
  // a stray comment outside the factory; the artifact ships without one.
  const source = await readFile(outfile, 'utf8')
  assert(source.startsWith('// Built by dsh-skillhub'), 'client bundle is missing the factory banner')
  assert(source.includes('__ModuleLoader__.load'), 'client bundle does not register with the module loader')
  assert(
    source.includes(`id: ${JSON.stringify(PACKAGE_NAME)}`),
    `client bundle id must equal the package name (${PACKAGE_NAME})`,
  )
  assert(!/\bfrom\s+["']react["']/.test(source), 'client bundle still has an ESM react import')
  console.log(`[build] client -> lib/client.js (${source.length} bytes)`)
}

async function main() {
  await rm(join(ROOT, 'lib'), { recursive: true, force: true })
  await buildHost()
  await buildClient()

  // The bundle's own patch file must be present, otherwise the installer links
  // the package but never mounts a row (the classic packaging omission).
  const patch = await readFile(join(ROOT, 'cordis.patch.yml'), 'utf8')
  assert(patch.includes(PACKAGE_NAME), 'cordis.patch.yml does not reference the package name')

  // A bundle-type plugin is declared by `dsh.bundle.patch`; a client half by
  // `dsh.client` plus the `./client` export.
  assert(pkg.dsh?.bundle?.patch === './cordis.patch.yml', 'package.json is missing dsh.bundle.patch')
  assert(pkg.dsh?.client !== undefined, 'package.json is missing dsh.client')
  assert(pkg.exports?.['./client'] !== undefined, 'package.json is missing the ./client export')
  assert(
    (pkg.files ?? []).includes('lib/') && (pkg.files ?? []).includes('cordis.patch.yml'),
    'package.json files[] must ship lib/ and cordis.patch.yml',
  )
  await writeFile(join(ROOT, 'lib', '.built'), new Date().toISOString(), 'utf8')
  console.log('[build] manifest + patch checks passed')
}

await main()
