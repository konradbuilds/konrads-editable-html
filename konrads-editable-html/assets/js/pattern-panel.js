/**
 * Panels shown while editing a post.
 *
 * On a pattern placed in a post: the PHP snippet that renders it from a theme
 * template, so the loop can be finished without leaving the post.
 *
 * On an Editable HTML block: a short line pointing at core's own Create
 * pattern action, because that is where the template route starts.
 *
 * Plain JavaScript on the global wp object. No build step.
 *
 * @since 0.4.0
 *
 * @package KonradsEditableHtml
 */

( function ( wp, snippetApi ) {
	'use strict';

	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const { InspectorControls } = wp.blockEditor;
	const { Button, PanelBody, Spinner, TextareaControl } = wp.components;
	const { useDispatch, useSelect } = wp.data;
	const { createElement: el, Fragment } = wp.element;
	const { __ } = wp.i18n;

	const OUR_BLOCK = 'konrads-editable-html/editable-html';
	const PATTERN_BLOCK = 'core/block';

	if ( ! snippetApi ) {
		return;
	}

	/**
	 * The snippet panel for a pattern placed in a post.
	 *
	 * @param {Object} props           Component props.
	 * @param {number} props.patternId The pattern's post ID, from the block's ref.
	 * @return {Object} Element.
	 */
	function TemplatePanel( props ) {
		const { createSuccessNotice, createErrorNotice } = useDispatch( 'core/notices' );

		const pattern = useSelect(
			function ( select ) {
				const core = select( 'core' );

				if ( ! props.patternId ) {
					return { ready: true, slug: '', isUnsynced: false };
				}

				const record = core.getEntityRecord( 'postType', 'wp_block', props.patternId );
				const ready = core.hasFinishedResolution( 'getEntityRecord', [
					'postType',
					'wp_block',
					props.patternId,
				] );

				if ( ! record ) {
					return { ready: ready, slug: '', isUnsynced: false };
				}

				const meta = record.meta || {};
				const syncStatus = record.wp_pattern_sync_status || meta.wp_pattern_sync_status || '';

				return {
					ready: ready,
					slug: record.slug || '',
					isUnsynced: 'unsynced' === syncStatus,
				};
			},
			[ props.patternId ]
		);

		const title = __( 'Use in a template', 'konrads-editable-html' );

		if ( ! pattern.ready ) {
			return el( PanelBody, { title: title }, el( Spinner, {} ) );
		}

		if ( ! pattern.slug ) {
			return el(
				PanelBody,
				{ title: title },
				el(
					'p',
					{ className: 'konrads-editable-html-snippet__help' },
					__( 'Save this post, then select the pattern again to get its template code.', 'konrads-editable-html' )
				)
			);
		}

		const snippet = snippetApi.build( pattern.slug );

		return el(
			PanelBody,
			{ title: title, className: 'konrads-editable-html-snippet' },
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
						snippetApi.copy( snippet, function ( worked ) {
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
					__( 'This pattern is not synced. The template always shows this pattern as edited under Patterns, but a copy placed in a post is separate - edits made there never reach the template.', 'konrads-editable-html' )
				)
		);
	}

	/**
	 * The hint on an Editable HTML block.
	 *
	 * Core already offers Create pattern in the block options menu. This only
	 * says where to find it, rather than repeating the action.
	 *
	 * @return {Object} Element.
	 */
	function TemplateHint() {
		return el(
			PanelBody,
			{ title: __( 'Use in a template', 'konrads-editable-html' ), initialOpen: false },
			el(
				'p',
				{ className: 'konrads-editable-html-snippet__help' },
				__( 'Need this section in a PHP template? Choose Create pattern in the block options menu, then select the pattern and copy the template code from this sidebar.', 'konrads-editable-html' )
			)
		);
	}

	const withTemplatePanels = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( PATTERN_BLOCK === props.name ) {
				return el(
					Fragment,
					{},
					el( BlockEdit, props ),
					el(
						InspectorControls,
						{},
						el( TemplatePanel, { patternId: props.attributes && props.attributes.ref } )
					)
				);
			}

			if ( OUR_BLOCK === props.name ) {
				return el(
					Fragment,
					{},
					el( BlockEdit, props ),
					el( InspectorControls, {}, el( TemplateHint, {} ) )
				);
			}

			return el( BlockEdit, props );
		};
	}, 'withKonradsEditableHtmlTemplatePanels' );

	addFilter( 'editor.BlockEdit', 'konrads-editable-html/template-panels', withTemplatePanels );
} )( window.wp, window.konradsEditableHtmlSnippet );
