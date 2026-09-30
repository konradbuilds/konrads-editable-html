/**
 * "Use in a template" panel for the pattern editor.
 *
 * Shows the PHP one-liner that renders this pattern inside a theme template,
 * so a section can move out of a page template and stay client-editable.
 *
 * The snippet uses core functions only. Deactivate this plugin and the
 * snippet keeps working.
 *
 * Plain JavaScript through the global wp object. No build step.
 *
 * @since 0.2.0
 *
 * @package KonradsEditableHtml
 */

( function ( wp, settings ) {
	'use strict';

	const { registerPlugin } = wp.plugins;
	const editorPackage = wp.editor || {};
	const editPostPackage = wp.editPost || {};

	// WordPress 6.6 moved this panel from wp.editPost to wp.editor.
	const PluginDocumentSettingPanel =
		editorPackage.PluginDocumentSettingPanel || editPostPackage.PluginDocumentSettingPanel;

	const { Button, TextareaControl } = wp.components;
	const { useDispatch, useSelect } = wp.data;
	const { createElement: el } = wp.element;
	const { __ } = wp.i18n;

	const HAS_EDITOR_STYLES = !! ( settings && settings.hasEditorStyles );

	if ( ! PluginDocumentSettingPanel ) {
		return;
	}

	/**
	 * Builds the PHP snippet for a pattern.
	 *
	 * The slug is used, not the ID: IDs differ between staging and live sites.
	 * The ID is looked up at runtime and handed to core's own pattern markup,
	 * so core does the rendering, the status check and the recursion guard.
	 *
	 * @param {string} slug Pattern slug.
	 * @return {string} PHP snippet.
	 */
	function buildSnippet( slug ) {
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
	function copyText( text, onDone ) {
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

	/**
	 * The panel itself.
	 *
	 * @return {Object|null} Element, or null outside the pattern editor.
	 */
	function TemplateSnippetPanel() {
		const { createSuccessNotice, createErrorNotice } = useDispatch( 'core/notices' );

		const pattern = useSelect( function ( select ) {
			const store = select( 'core/editor' );
			const current = store.getCurrentPost() || {};
			const meta = store.getEditedPostAttribute( 'meta' ) || {};

			/*
			 * Core keeps the sync status as a top-level field on the pattern in
			 * some versions and inside post meta in others, so both are read.
			 * "unsynced" is only set on unsynced patterns; empty means synced.
			 */
			const syncStatus =
				store.getEditedPostAttribute( 'wp_pattern_sync_status' ) ||
				meta.wp_pattern_sync_status ||
				current.wp_pattern_sync_status ||
				'';

			return {
				postType: store.getCurrentPostType(),
				slug: store.getEditedPostAttribute( 'slug' ) || current.slug || '',
				isNew: store.isEditedPostNew(),
				isUnsynced: 'unsynced' === syncStatus,
			};
		}, [] );

		if ( 'wp_block' !== pattern.postType ) {
			return null;
		}

		const title = __( 'Use in a template', 'konrads-editable-html' );

		if ( pattern.isNew || ! pattern.slug ) {
			return el(
				PluginDocumentSettingPanel,
				{ name: 'konrads-editable-html-template', title, className: 'konrads-editable-html-snippet' },
				el(
					'p',
					{ className: 'konrads-editable-html-snippet__help' },
					__( 'Save this pattern first. Its template code then appears here.', 'konrads-editable-html' )
				)
			);
		}

		const snippet = buildSnippet( pattern.slug );

		return el(
			PluginDocumentSettingPanel,
			{ name: 'konrads-editable-html-template', title, className: 'konrads-editable-html-snippet' },
			el(
				'p',
				{ className: 'konrads-editable-html-snippet__help' },
				__( 'Paste this into your theme template where the old markup was. Clients then edit this pattern instead of your PHP.', 'konrads-editable-html' )
			),
			el( TextareaControl, {
				__nextHasNoMarginBottom: true,
				label: __( 'Template code', 'konrads-editable-html' ),
				hideLabelFromVision: true,
				value: snippet,
				readOnly: true,
				rows: 9,
				onChange() {},
			} ),
			el(
				Button,
				{
					variant: 'primary',
					onClick() {
						copyText( snippet, function ( worked ) {
							if ( worked ) {
								createSuccessNotice( __( 'Template code copied.', 'konrads-editable-html' ), {
									type: 'snackbar',
								} );
								return;
							}

							createErrorNotice(
								__( 'Copying failed. Select the code above and copy it by hand.', 'konrads-editable-html' ),
								{ type: 'snackbar' }
							);
						} );
					},
				},
				__( 'Copy code', 'konrads-editable-html' )
			),
			el(
				'p',
				{ className: 'konrads-editable-html-snippet__help' },
				__( 'Keep CSS and JavaScript in your theme, not in the pattern.', 'konrads-editable-html' )
			),
			pattern.isUnsynced &&
				el(
					'p',
					{ className: 'konrads-editable-html-snippet__help' },
					__( 'This pattern is not synced. The template always shows this pattern as edited here, but a copy placed in a post is separate - edits made there never reach the template.', 'konrads-editable-html' )
				),
			! HAS_EDITOR_STYLES &&
				el(
					'p',
					{ className: 'konrads-editable-html-snippet__help' },
					__( 'Your theme\'s styles are not loaded here, so the pattern looks plainer than on the front end. Add add_editor_style( \'style.css\' ); to your theme\'s functions.php to fix that.', 'konrads-editable-html' )
				)
		);
	}

	registerPlugin( 'konrads-editable-html-template-snippet', {
		render: TemplateSnippetPanel,
	} );
} )( window.wp, window.konradsEditableHtmlTemplate );
