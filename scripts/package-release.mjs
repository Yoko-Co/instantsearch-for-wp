#!/usr/bin/env node

/**
 * Packages the plugin into release zips for the R2 release pipeline.
 *
 * Produces `{slug}-{version}.zip` and `{slug}.zip` (the "latest" copy the
 * update checker downloads). The slug comes from package.json's name, which
 * by convention matches the GitHub repo name and the plugin folder name —
 * the zip prefixes every file with it so WordPress installs into the right
 * directory.
 *
 * Mirrors yoko-core's scripts/package-release.mjs.
 */

import archiver from 'archiver';
import {
	copyFileSync,
	createWriteStream,
	existsSync,
	mkdirSync,
	readFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );
const ROOT = resolve( __dirname, '..' );

const args = process.argv.slice( 2 );
const outputDirArg = getArgValue( args, '--output-dir' );
const outputDir = outputDirArg
	? resolve( process.cwd(), outputDirArg )
	: resolve( ROOT, 'dist' );

mkdirSync( outputDir, { recursive: true } );

const pluginSlug = detectPluginSlug();
const pluginVersion = detectPluginVersion();
const versionedZipPath = join( outputDir, `${ pluginSlug }-${ pluginVersion }.zip` );
const latestZipPath = join( outputDir, `${ pluginSlug }.zip` );

console.log( `Packaging ${ pluginSlug } ${ pluginVersion }...` );

await createZip( versionedZipPath, pluginSlug );
copyFileSync( versionedZipPath, latestZipPath );

console.log( `Created ${ versionedZipPath }` );
console.log( `Created ${ latestZipPath }` );

function getArgValue( argv, name ) {
	const index = argv.indexOf( name );
	if ( index === -1 ) {
		return null;
	}

	return argv[ index + 1 ] ?? null;
}

function detectPluginSlug() {
	const packageJsonPath = join( ROOT, 'package.json' );
	const packageJson = JSON.parse( readFileSync( packageJsonPath, 'utf8' ) );
	return packageJson.name;
}

function detectPluginVersion() {
	const pluginFilePath = join( ROOT, 'instantsearch-for-wp.php' );
	const pluginFile = readFileSync( pluginFilePath, 'utf8' );
	const versionMatch = pluginFile.match( /^[ \t/*#@]*Version:\s*(.+)$/im );

	if ( ! versionMatch ) {
		throw new Error(
			'Unable to detect plugin version from instantsearch-for-wp.php.'
		);
	}

	return versionMatch[ 1 ].trim();
}

async function createZip( zipPath, pluginSlug ) {
	const includePatterns = [
		'assets/**',
		'build/**',
		'includes/**',
		'languages/**',
		'templates/**',
		'vendor/**',
		'*.php',
		'composer.json',
		'composer.lock',
		'package.json',
		'package-lock.json',
		'readme.txt',
	];

	await new Promise( ( resolvePromise, rejectPromise ) => {
		const output = createWriteStream( zipPath );
		const archive = archiver( 'zip', { zlib: { level: 9 } } );

		output.on( 'close', resolvePromise );
		archive.on( 'error', rejectPromise );
		archive.pipe( output );

		for ( const pattern of includePatterns ) {
			const absolutePath = join( ROOT, pattern.replace( '/**', '' ) );
			if ( pattern.includes( '*' ) || existsSync( absolutePath ) ) {
				archive.glob(
					pattern,
					{
						cwd: ROOT,
						ignore: [
							'.git/**',
							'.github/**',
							'.husky/**',
							'bin/**',
							'dev/**',
							'docs/**',
							'documentation/**',
							'tests/**',
							'**/*.map',
						],
					},
					{ prefix: pluginSlug }
				);
			}
		}

		archive.finalize();
	} );
}
