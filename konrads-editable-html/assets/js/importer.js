/**
 * Konrad's Editable HTML importer.
 *
 * Turns picked files into one piece of HTML:
 * - HTML, CSS and JS files picked together, or
 * - a .zip, e.g. a CodePen export (dist/index.html + style.css + script.js).
 *
 * Everything happens in the browser. Nothing is uploaded or written to disk.
 * Only text files are read, with size limits, so a broken or hostile zip
 * cannot freeze the editor.
 *
 * @package KonradsEditableHtml
 */

( function ( window ) {
	'use strict';

	/*
	 * Translations come from wp.i18n inside WordPress. Outside WordPress
	 * (web app, tests) the English text is used as it is.
	 */
	const i18n = window.wp && window.wp.i18n;
	const __ = i18n ? i18n.__ : ( text ) => text;
	const _n = i18n ? i18n._n : ( single, plural, number ) => ( 1 === number ? single : plural );
	const sprintf = i18n ? i18n.sprintf : ( format, value ) => format.replace( /%[sd]/, value );

	const LIMITS = {
		entries: 300, // Files listed in a zip.
		fileBytes: 1024 * 1024, // 1 MB per text file.
		totalBytes: 3 * 1024 * 1024, // 3 MB of text in total.
	};

	const TEXT_FILE = /\.(html?|css|js|mjs)$/i;

	/**
	 * Inflates raw deflate data with the browser's own decompressor.
	 *
	 * Stops as soon as the output grows past the limit (zip bomb guard).
	 *
	 * @param {Uint8Array} data Compressed bytes.
	 * @return {Promise<Uint8Array>} Uncompressed bytes.
	 */
	async function inflate( data ) {
		const stream = new window.Blob( [ data ] ).stream().pipeThrough( new window.DecompressionStream( 'deflate-raw' ) );
		const reader = stream.getReader();
		const chunks = [];
		let length = 0;

		for ( ;; ) {
			const { done, value } = await reader.read();
			if ( done ) {
				break;
			}
			length += value.length;
			if ( length > LIMITS.fileBytes ) {
				reader.cancel();
				throw new Error( 'too-big' );
			}
			chunks.push( value );
		}
		const out = new Uint8Array( length );
		let offset = 0;
		chunks.forEach( function ( chunk ) {
			out.set( chunk, offset );
			offset += chunk.length;
		} );
		return out;
	}

	/**
	 * Reads the HTML, CSS and JS files from a zip.
	 *
	 * @param {ArrayBuffer} buffer Zip file.
	 * @param {Array}       notes  Collects messages for the person.
	 * @return {Promise<Object>} Map of path => text.
	 */
	async function readZip( buffer, notes ) {
		const view = new DataView( buffer );
		const decoder = new window.TextDecoder();
		const files = {};
		let end = -1;
		let total = 0;
		let skipped = 0;
		let tooBig = 0;

		// The zip's table of contents sits at the very end.
		for ( let i = buffer.byteLength - 22; i >= Math.max( 0, buffer.byteLength - 65557 ); i-- ) {
			if ( 0x06054b50 === view.getUint32( i, true ) ) {
				end = i;
				break;
			}
		}
		if ( end < 0 ) {
			throw new Error( 'not-zip' );
		}

		const count = view.getUint16( end + 10, true );
		let offset = view.getUint32( end + 16, true );

		if ( count > LIMITS.entries ) {
			throw new Error( 'too-many' );
		}

		for ( let n = 0; n < count; n++ ) {
			if ( 0x02014b50 !== view.getUint32( offset, true ) ) {
				throw new Error( 'not-zip' );
			}
			const flags = view.getUint16( offset + 8, true );
			const method = view.getUint16( offset + 10, true );
			const packed = view.getUint32( offset + 20, true );
			const size = view.getUint32( offset + 24, true );
			const nameLength = view.getUint16( offset + 28, true );
			const extraLength = view.getUint16( offset + 30, true );
			const commentLength = view.getUint16( offset + 32, true );
			const local = view.getUint32( offset + 42, true );
			const name = decoder.decode( new Uint8Array( buffer, offset + 46, nameLength ) );

			offset += 46 + nameLength + extraLength + commentLength;

			if ( /\/$/.test( name ) || /(^|\/)(__MACOSX|\.DS_Store)/.test( name ) ) {
				continue;
			}
			if ( ! TEXT_FILE.test( name ) ) {
				skipped++;
				continue;
			}
			if ( size > LIMITS.fileBytes ) {
				tooBig++;
				continue;
			}
			// Encrypted files and unknown compression are skipped, not guessed.
			if ( ( flags & 1 ) || ( 0 !== method && 8 !== method ) ) {
				skipped++;
				continue;
			}
			total += size;
			if ( total > LIMITS.totalBytes ) {
				throw new Error( 'too-big' );
			}

			const start = local + 30 + view.getUint16( local + 26, true ) + view.getUint16( local + 28, true );
			const data = new Uint8Array( buffer, start, packed );
			const bytes = 8 === method ? await inflate( data ) : data;
			files[ name ] = decoder.decode( bytes );
		}

		if ( tooBig ) {
			notes.push( {
				type: 'warning',
				text: sprintf(
					/* translators: %d: number of files. */
					_n( '%d file in the zip was larger than 1 MB and was skipped.', '%d files in the zip were larger than 1 MB and were skipped.', tooBig, 'konrads-editable-html' ),
					tooBig
				),
			} );
		}
		if ( skipped ) {
			notes.push( {
				type: 'info',
				text: sprintf(
					/* translators: %d: number of files. */
					_n( '%d other file in the zip was not imported (images, fonts, other types). Upload images to the Media Library and replace them in the block.', '%d other files in the zip were not imported (images, fonts, other types). Upload images to the Media Library and replace them in the block.', skipped, 'konrads-editable-html' ),
					skipped
				),
			} );
		}
		return files;
	}

	/**
	 * Removes a leading folder shared by all paths ("my-pen/dist/..." → "dist/...").
	 *
	 * @param {Object} files Map of path => text.
	 * @return {Object} Map with shorter paths.
	 */
	function stripRoot( files ) {
		const paths = Object.keys( files );
		const first = paths.length && paths[ 0 ].indexOf( '/' ) > 0 ? paths[ 0 ].split( '/' )[ 0 ] + '/' : '';

		if ( ! first || ! paths.every( ( path ) => 0 === path.indexOf( first ) ) ) {
			return files;
		}
		const out = {};
		paths.forEach( function ( path ) {
			out[ path.slice( first.length ) ] = files[ path ];
		} );
		return out;
	}

	/**
	 * Builds one piece of HTML from a set of files.
	 *
	 * @param {Object} files Map of path => text.
	 * @param {Array}  notes Collects messages for the person.
	 * @return {string} HTML with <style> and <script> inlined.
	 */
	function assemble( files, notes ) {
		const paths = Object.keys( files );
		const htmlPath = [ 'dist/index.html', 'index.html' ].find( ( path ) => files[ path ] ) ||
			paths.find( ( path ) => /\.html?$/i.test( path ) );
		const dir = htmlPath && htmlPath.indexOf( '/' ) > -1 ? htmlPath.slice( 0, htmlPath.lastIndexOf( '/' ) + 1 ) : '';
		const used = {};
		const css = [];
		const js = [];
		let external = 0;
		let body = '';

		if ( htmlPath ) {
			const doc = new window.DOMParser().parseFromString( files[ htmlPath ], 'text/html' );
			used[ htmlPath ] = true;

			doc.querySelectorAll( 'link[href]' ).forEach( function ( link ) {
				const href = link.getAttribute( 'href' ).replace( /^\.\//, '' );
				if ( /stylesheet/i.test( link.getAttribute( 'rel' ) || '' ) && files[ dir + href ] ) {
					css.push( files[ dir + href ] );
					used[ dir + href ] = true;
				} else if ( /^(https?:)?\/\//i.test( href ) ) {
					external++;
				}
				link.remove();
			} );
			doc.querySelectorAll( 'script[src]' ).forEach( function ( script ) {
				const src = script.getAttribute( 'src' ).replace( /^\.\//, '' );
				if ( files[ dir + src ] ) {
					js.push( { code: files[ dir + src ], module: 'module' === script.getAttribute( 'type' ) } );
					used[ dir + src ] = true;
				} else {
					external++;
				}
				script.remove();
			} );
			doc.head.querySelectorAll( 'style' ).forEach( ( style ) => css.push( style.textContent ) );
			body = doc.body.innerHTML.trim();
		}

		// CSS and JS files that the HTML did not link (e.g. picked separately).
		paths.forEach( function ( path ) {
			if ( used[ path ] ) {
				return;
			}
			if ( /\.css$/i.test( path ) && ! /(^|\/)src\//.test( path ) ) {
				css.push( files[ path ] );
			} else if ( /\.m?js$/i.test( path ) && ! /(^|\/)src\//.test( path ) ) {
				js.push( { code: files[ path ], module: /\.mjs$/i.test( path ) } );
			}
		} );

		if ( external ) {
			notes.push( {
				type: 'warning',
				text: sprintf(
					/* translators: %d: number of files. */
					_n( '%d file from another server (CDN) was removed. Load libraries from your own site instead: safer, faster, and no visitor data goes to third parties (GDPR).', '%d files from other servers (CDNs) were removed. Load libraries from your own site instead: safer, faster, and no visitor data goes to third parties (GDPR).', external, 'konrads-editable-html' ),
					external
				),
			} );
		}

		const parts = [];
		if ( css.length ) {
			// A closing style tag inside the CSS would end the tag early.
			parts.push( '<style>\n' + css.join( '\n' ).replace( /<\/style/gi, '<\\/style' ).trim() + '\n</style>' );
		}
		if ( body ) {
			parts.push( body );
		}
		js.forEach( function ( script ) {
			// A closing script tag inside the code would end the tag early.
			const code = script.code.replace( /<\/script/gi, '<\\/script' ).trim();
			parts.push( '<script' + ( script.module ? ' type="module"' : '' ) + '>\n' + code + '\n</script>' );
		} );
		return parts.join( '\n' );
	}

	/**
	 * Imports picked files.
	 *
	 * @param {FileList|Array} fileList Files from an <input type="file">.
	 * @return {Promise<Object>} { html, notes }.
	 */
	async function importFiles( fileList ) {
		const notes = [];
		let files = {};
		let total = 0;

		for ( const file of Array.prototype.slice.call( fileList ) ) {
			if ( /\.zip$/i.test( file.name ) ) {
				try {
					files = Object.assign( files, stripRoot( await readZip( await file.arrayBuffer(), notes ) ) );
				} catch ( error ) {
					const messages = {
						/* translators: %s: file name. */
						'not-zip': __( '%s is not a readable .zip file.', 'konrads-editable-html' ),
						/* translators: %s: file name. */
						'too-many': __( '%s has too many files.', 'konrads-editable-html' ),
						/* translators: %s: file name. */
						'too-big': __( '%s is too big (more than 3 MB of text).', 'konrads-editable-html' ),
					};
					/* translators: %s: file name. */
					const message = messages[ error.message ] || __( '%s could not be read.', 'konrads-editable-html' );
					notes.push( { type: 'error', text: sprintf( message, file.name ) } );
				}
			} else if ( TEXT_FILE.test( file.name ) && file.size <= LIMITS.fileBytes ) {
				total += file.size;
				if ( total <= LIMITS.totalBytes ) {
					files[ file.name ] = await file.text();
				}
			} else {
				notes.push( {
					type: 'info',
					/* translators: %s: file name. */
					text: sprintf( __( '%s was skipped. Pick .html, .css, .js or .zip files.', 'konrads-editable-html' ), file.name ),
				} );
			}
		}

		const html = assemble( files, notes );
		if ( ! html ) {
			notes.push( { type: 'error', text: __( 'No HTML, CSS or JS found.', 'konrads-editable-html' ) } );
		}
		return { html, notes };
	}

	window.konradsEditableHtml = window.konradsEditableHtml || {};
	window.konradsEditableHtml.importer = {
		importFiles,
		assemble,
		readZip,
		limits: LIMITS,
	};
}( window ) );
