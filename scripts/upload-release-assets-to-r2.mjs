#!/usr/bin/env node

/**
 * Uploads packaged release artifacts to the Cloudflare R2 releases bucket.
 *
 * Expects the R2_* environment variables provided by the release-r2.yml
 * workflow. Mirrors yoko-core's scripts/upload-release-assets-to-r2.mjs.
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createReadStream, readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath( new URL( '.', import.meta.url ) );
const ROOT = resolve( __dirname, '..' );
const args = process.argv.slice( 2 );

const sourceDirArg = getArgValue( args, '--source-dir' );
if ( ! sourceDirArg ) {
	throw new Error( 'Missing required argument: --source-dir' );
}

const sourceDir = resolve( process.cwd(), sourceDirArg );
const pluginSlug = detectPluginSlug();
const pluginVersion = detectPluginVersion();

const {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_URL,
} = process.env;

for ( const [ name, value ] of Object.entries( {
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_URL,
} ) ) {
	if ( ! value ) {
		throw new Error( `Missing required environment variable: ${ name }` );
	}
}

const publicBaseUrl = R2_PUBLIC_URL.replace( /\/$/, '' );
const files = [
	{
		localPath: join( sourceDir, `${ pluginSlug }.zip` ),
		key: `${ pluginSlug }/${ pluginSlug }.zip`,
		contentType: 'application/zip',
	},
	{
		localPath: join( sourceDir, `${ pluginSlug }-${ pluginVersion }.zip` ),
		key: `${ pluginSlug }/${ pluginSlug }-${ pluginVersion }.zip`,
		contentType: 'application/zip',
	},
	{
		localPath: join( sourceDir, 'info.json' ),
		key: `${ pluginSlug }/info.json`,
		contentType: 'application/json',
		cacheControl: 'no-cache, no-store, must-revalidate',
	},
];

const client = new S3Client( {
	region: 'auto',
	endpoint: `https://${ R2_ACCOUNT_ID }.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID,
		secretAccessKey: R2_SECRET_ACCESS_KEY,
	},
} );

for ( const file of files ) {
	console.log( `Uploading ${ basename( file.localPath ) } to ${ file.key }...` );

	await client.send(
		new PutObjectCommand( {
			Bucket: R2_BUCKET_NAME,
			Key: file.key,
			Body: createReadStream( file.localPath ),
			ContentType: file.contentType,
			CacheControl: file.cacheControl,
		} )
	);

	console.log( `${ publicBaseUrl }/${ file.key }` );
}

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
