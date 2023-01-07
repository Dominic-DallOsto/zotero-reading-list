const path = require('path')
const rmrf = require('rimraf')
const fs = require('fs')
const esbuild = require('esbuild')

require('zotero-plugin/copy-assets')
require('zotero-plugin/rdf')
require('zotero-plugin/version')

async function build() {
  // rmrf.sync('gen')
  await esbuild.build({
    bundle: true,
    format: 'iife',
    target: ['firefox60'],
    entryPoints: [ 'bootstrap.ts', 'content/zotero-reading-list.ts' ],
    outdir: 'build',
    globalName: 'install__startup__shutdown__uninstall',
    footer: { js: 'var { install, startup, shutdown, uninstall } = install__startup__shutdown__uninstall;' },
    external: ['zotero/itemTree'],
  })
}

build().catch(err => {
  console.log(err)
  process.exit(1)
})
