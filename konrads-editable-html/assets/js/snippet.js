/**
 * The template snippet, built in one place.
 *
 * Both panels that offer the snippet use this, so the two can never drift
 * apart: the one in the pattern editor and the one on a pattern inside a post.
 *
 * Plain JavaScript on the global wp object. No build step.
 *
 * @since 0.4.0
 *
 * @package KonradsEditableHtml
 */

( function ( window ) {
	'use strict';

	/**
	 * Builds the PHP snippet for a pattern.
	 *
	 * The slug is used, not the ID: IDs differ between staging and live sites.
	 * The ID is looked up at runtime and handed to core's own pattern markup,
	 * so core does the rendering, the published check and the recursion guard.
	 *
	 * @param {string} slug Pattern slug.
	 * @return {string} PHP snippet.
	 */
	function build( slug ) {
		const safeSlug = String( slug ).replace( /[^a-z0-9-]/gi, '' );

		return [
			'<?php',
			'// Pattern: ' + safeSlug + ' (edit it under Patterns in wp-admin).',
			"$keh_pattern = get_page_by_path( '" + safeSlug + "', OBJECT, 'wp_block' );",
			"if ( $keh_pattern instanceof WP_Post && 'publish' === $keh_pattern->post_status ) {",
			'\techo do_blocks( \'<!-- wp:block {"ref":\' . (int) $keh_pattern->ID . \'} /-->\' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped',
			"} elseif ( current_user_can( 'edit_theme_options' ) ) {",
			'\techo \'<!-- Pattern "' + safeSlug + '" not found. -->\';',
			'}',
			'?>',
		].join( '\n' );
	}

	/**
	 * Copies text without the clipboard API, which browsers block on plain HTTP.
	 *
	 * @param {string} text Text to copy.
	 * @return {boolean} True when the copy worked.
	 */
	function copyWithoutClipboardApi( text ) {
		const field = document.createElement( 'textarea' );
		let worked = false;

		field.value = text;
		field.setAttribute( 'readonly', 'readonly' );
		field.style.position = 'fixed';
		field.style.top = '-9999px';
		document.body.appendChild( field );
		field.select();

		try {
			worked = document.execCommand( 'copy' );
		} catch ( error ) {
			worked = false;
		}

		document.body.removeChild( field );

		return worked;
	}

	/**
	 * Copies text to the clipboard.
	 *
	 * @param {string}   text   Text to copy.
	 * @param {Function} onDone Called with true or false when finished.
	 */
	function copy( text, onDone ) {
		const clipboard = window.navigator && window.navigator.clipboard;

		if ( clipboard && clipboard.writeText ) {
			clipboard.writeText( text ).then(
				function () {
					onDone( true );
				},
				function () {
					onDone( copyWithoutClipboardApi( text ) );
				}
			);
			return;
		}

		onDone( copyWithoutClipboardApi( text ) );
	}

	window.konradsEditableHtmlSnippet = {
		build: build,
		copy: copy,
	};
} )( window );
