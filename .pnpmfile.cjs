// @ts-check
/**@import { type PackageManifest } from "@pnpm/types" */

/**
 * @param { PackageManifest } pkg
 */
function readPackage(pkg) {
	const dep = pkg.dependencies
	for (const x in dep) {
		if (/(?:-musl|-ppc64|-wasi)$/.test(x)) delete dep[x]
		if (/(?<!darwin)-arm($|-|64)/.test(x)) delete dep[x]
		if (/(?<!linux|win32)\-(x64)/.test(x)) delete dep[x]
		if (/\b(linux|win32)-(?!x64)/.test(x)) delete dep[x]
	}
	const opt = pkg.optionalDependencies
	for (const x in opt) {
		if (/(?:-musl|-ppc64|-wasi)$/.test(x)) delete opt[x]
		if (/(?<!darwin)-arm($|-|64)/.test(x)) delete opt[x]
		if (/(?<!linux|win32)\-(x64)/.test(x)) delete opt[x]
		if (/\b(linux|win32)-(?!x64)/.test(x)) delete opt[x]
	}
	return pkg
}

module.exports = { hooks: { readPackage } }
