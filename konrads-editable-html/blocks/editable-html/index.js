/**
 * Editable HTML block, and a "Make editable" button on the core Custom HTML block.
 *
 * How it works:
 * - The block stores your HTML exactly like core/html does ("content").
 * - It also stores which parts are editable ("fields", as paths into the HTML).
 * - Editing a part writes the new value straight into the HTML.
 * - The saved post contains finished HTML. Remove this plugin and the
 *   front end stays the same.
 *
 * Plain JavaScript through the global wp object. No build step.
 *
 * @since 0.1.0
 *
 * @package KonradsEditableHtml
 */

( function ( wp, engine, importer, settings ) {
	'use strict';

	const { registerBlockType, createBlock } = wp.blocks;
	const {
		BlockControls,
		InspectorControls,
		MediaUpload,
		MediaUploadCheck,
		PlainText,
		RichText,
		useBlockProps,
	} = wp.blockEditor;
	const {
		Button,
		CheckboxControl,
		FormFileUpload,
		Notice,
		PanelBody,
		Placeholder,
		TextareaControl,
		TextControl,
		ToolbarButton,
		ToolbarGroup,
	} = wp.components;
	const { createHigherOrderComponent } = wp.compose;
	const { useDispatch, useSelect } = wp.data;
	const { createElement: el, Fragment, RawHTML, useMemo, useRef, useState } = wp.element;
	const { addFilter } = wp.hooks;
	const { __, _n, sprintf } = wp.i18n;

	const BLOCK_NAME = 'konrads-editable-html/editable-html';
	const CAN_EDIT_HTML = !! ( settings && settings.canEditHtml );
	const CAN_UPDATE_CORE = !! ( settings && settings.canUpdateCore );

	// Names for detected parts, shown in the sidebar and toolbar.
	Object.assign( engine.labels, {
		button: __( 'Button', 'konrads-editable-html' ),
		heading: __( 'Heading', 'konrads-editable-html' ),
		image: __( 'Image', 'konrads-editable-html' ),
		link: __( 'Link', 'konrads-editable-html' ),
		/* translators: %s: HTML list tag, e.g. "UL". */
		list: __( '%s list', 'konrads-editable-html' ),
		listItem: __( 'List item', 'konrads-editable-html' ),
		text: __( 'Text', 'konrads-editable-html' ),
	} );

	const VOID_TAGS = [
		'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
		'meta', 'source', 'track', 'wbr',
	];

	// HTML attribute names that React spells differently.
	const PROP_NAMES = {
		'accept-charset': 'acceptCharset',
		allowfullscreen: 'allowFullScreen',
		autoplay: 'autoPlay',
		checked: 'defaultChecked',
		colspan: 'colSpan',
		crossorigin: 'crossOrigin',
		datetime: 'dateTime',
		for: 'htmlFor',
		frameborder: 'frameBorder',
		'http-equiv': 'httpEquiv',
		maxlength: 'maxLength',
		playsinline: 'playsInline',
		readonly: 'readOnly',
		referrerpolicy: 'referrerPolicy',
		rowspan: 'rowSpan',
		srcset: 'srcSet',
		tabindex: 'tabIndex',
		usemap: 'useMap',
		value: 'defaultValue',
	};

	const BOOLEAN_ATTRIBUTES = [
		'allowfullscreen', 'async', 'autoplay', 'checked', 'controls', 'defer',
		'disabled', 'hidden', 'loop', 'multiple', 'muted', 'open', 'playsinline',
		'readonly', 'required', 'reversed', 'selected',
	];

	/**
	 * Turns an inline style string into a React style object.
	 *
	 * @param {string} css Inline style, e.g. "color: red; --gap: 1rem".
	 * @return {Object} Style object.
	 */
	function styleToObject( css ) {
		const style = {};
		// Split on semicolons that are not inside brackets, e.g. url(data:...;base64).
		const parts = String( css ).split( /;(?![^(]*\))/ );

		parts.forEach( function ( part ) {
			const colon = part.indexOf( ':' );
			if ( colon < 1 ) {
				return;
			}
			let name = part.slice( 0, colon ).trim();
			const value = part.slice( colon + 1 ).trim();
			if ( 0 !== name.indexOf( '--' ) ) {
				name = name.replace( /^-ms-/, 'ms-' ).replace( /-([a-z])/g, function ( match, letter ) {
					return letter.toUpperCase();
				} );
			}
			style[ name ] = value;
		} );
		return style;
	}

	/**
	 * Copies an element's attributes into React props.
	 *
	 * Inline event handlers (onclick and friends) and srcdoc are left out on
	 * purpose: the editor never runs code from the pasted HTML.
	 *
	 * @param {Element} node Element.
	 * @return {Object} Props.
	 */
	function propsFrom( node ) {
		const props = {};

		Array.prototype.forEach.call( node.attributes, function ( attribute ) {
			const name = attribute.name;
			const value = attribute.value;

			if ( /^on/i.test( name ) || 'contenteditable' === name || 'srcdoc' === name || /^\s*javascript:/i.test( value ) ) {
				return;
			}
			if ( 'class' === name ) {
				props.className = value;
			} else if ( 'style' === name ) {
				props.style = styleToObject( value );
			} else if ( '' === value && BOOLEAN_ATTRIBUTES.indexOf( name ) !== -1 ) {
				props[ PROP_NAMES[ name ] || name ] = true;
			} else {
				props[ PROP_NAMES[ name ] || name ] = value;
			}
		} );
		return props;
	}

	/**
	 * Returns inner HTML that is safe to show in the editor.
	 *
	 * Removes scripts, inline event handlers, javascript: links and srcdoc
	 * (HTML inside an iframe, which could run scripts) from a copy.
	 * The saved HTML is not touched: this only affects the editor view.
	 *
	 * @param {Element} node Element.
	 * @return {string} Inner HTML for the editor.
	 */
	function editorSafeHtml( node ) {
		const copy = node.cloneNode( true );

		Array.prototype.forEach.call( copy.querySelectorAll( 'script' ), function ( script ) {
			script.remove();
		} );
		Array.prototype.forEach.call( copy.querySelectorAll( '*' ), function ( child ) {
			Array.prototype.slice.call( child.attributes ).forEach( function ( attribute ) {
				if ( /^on/i.test( attribute.name ) || 'srcdoc' === attribute.name || /^\s*javascript:/i.test( attribute.value ) ) {
					child.removeAttribute( attribute.name );
				}
			} );
		} );
		return copy.innerHTML;
	}

	/**
	 * Turns parsed HTML into editor elements, with editable fields in place.
	 *
	 * Parts without fields inside are rendered as they are, untouched.
	 *
	 * @param {Element} parent Parent element.
	 * @param {string}  prefix Path of the parent ("" for the top).
	 * @param {Object}  ctx    Render context.
	 * @return {Array} Children for createElement.
	 */
	function renderChildren( parent, prefix, ctx ) {
		const children = [];
		let index = 0;

		Array.prototype.forEach.call( parent.childNodes, function ( child ) {
			if ( 3 === child.nodeType ) {
				children.push( child.textContent );
				return;
			}
			if ( 1 !== child.nodeType ) {
				return;
			}
			const path = prefix ? prefix + '/' + index : String( index );
			index++;
			children.push( renderNode( child, path, ctx ) );
		} );
		return children;
	}

	/**
	 * Renders one element.
	 *
	 * @param {Element} node Element.
	 * @param {string}  path Path of the element.
	 * @param {Object}  ctx  Render context.
	 * @return {?Object} Element, or null.
	 */
	function renderNode( node, path, ctx ) {
		const tag = node.tagName.toLowerCase();
		const field = ctx.byPath[ path ];
		const props = propsFrom( node );

		// Scripts only run on the front end, never in the editor.
		if ( 'script' === tag ) {
			return null;
		}
		props.key = path;

		if ( field ) {
			const rendered = renderField( node, field, props, ctx );
			if ( rendered ) {
				return rendered;
			}
		}
		if ( VOID_TAGS.indexOf( tag ) !== -1 ) {
			return el( tag, props );
		}
		if ( 'textarea' === tag ) {
			props.defaultValue = node.value;
			return el( tag, props );
		}
		if ( ! ctx.hasFieldInside( path ) ) {
			props.dangerouslySetInnerHTML = { __html: editorSafeHtml( node ) };
			return el( tag, props );
		}
		return el.apply( null, [ tag, props ].concat( renderChildren( node, path, ctx ) ) );
	}

	/**
	 * Renders an editable field in the canvas.
	 *
	 * @param {Element} node  Element.
	 * @param {Object}  field Field.
	 * @param {Object}  props Props copied from the HTML.
	 * @param {Object}  ctx   Render context.
	 * @return {?Object} Element, or null when the field is gone.
	 */
	function renderField( node, field, props, ctx ) {
		const value = engine.read( ctx.body, field );
		const tag = node.tagName.toLowerCase();

		if ( ! value ) {
			return null;
		}
		props[ 'data-keh-field' ] = field.kind;

		if ( 'image' === field.kind ) {
			props.src = value.url;
			props.alt = value.alt;
			if ( ! props.title ) {
				props.title = __( 'Click to replace the image', 'konrads-editable-html' );
			}
			return el(
				MediaUploadCheck,
				{ key: props.key, fallback: el( 'img', props ) },
				el( MediaUpload, {
					allowedTypes: [ 'image' ],
					onSelect( media ) {
						ctx.update( field, { url: media.url, alt: media.alt || '' } );
					},
					render( upload ) {
						return el( 'img', Object.assign( {}, props, { onClick: upload.open } ) );
					},
				} )
			);
		}

		const richText = {
			identifier: 'keh-' + field.path,
			value: ctx.typed( field, value.text ),
			onChange( text ) {
				ctx.update( field, { text: String( text ) } );
			},
			placeholder: __( 'Type here…', 'konrads-editable-html' ),
			'aria-label': field.label,
			// A link field is already a link: no links inside it.
			withoutInteractiveFormatting: 'link' === field.kind,
		};

		// Leading icon stays as it is; only the text after it is editable.
		if ( undefined !== value.prefix ) {
			const outer = Object.assign( {}, props );
			delete outer[ 'data-keh-field' ];
			return el(
				tag,
				outer,
				el( 'span', {
					className: 'konrads-editable-html-icon',
					contentEditable: false,
					dangerouslySetInnerHTML: { __html: value.prefix },
				} ),
				el( RichText, Object.assign( richText, { tagName: 'span', 'data-keh-field': 'text' } ) )
			);
		}

		return el( RichText, Object.assign( props, richText, { tagName: tag } ) );
	}

	/**
	 * Reads the HTML of a core Custom HTML block.
	 *
	 * WordPress 7.0 and older keep it in the "content" attribute.
	 * WordPress 7.1 keeps it as the block's inner content (static HTML that
	 * can hold editable inner blocks), so the attribute is empty there.
	 *
	 * @param {?Object} block Block object from the block editor store.
	 * @return {string} HTML, or '' when there is none or the block already has inner blocks.
	 */
	function htmlOfCoreBlock( block ) {
		if ( ! block ) {
			return '';
		}
		if ( block.attributes && 'string' === typeof block.attributes.content && block.attributes.content.trim() ) {
			return block.attributes.content;
		}
		// Blocks with editable inner blocks already use core's own editing.
		if ( block.innerBlocks && block.innerBlocks.length ) {
			return '';
		}
		if ( Array.isArray( block.innerContent ) ) {
			return block.innerContent.filter( ( part ) => 'string' === typeof part ).join( '' );
		}
		return wp.blocks.getBlockContent ? wp.blocks.getBlockContent( block ) : '';
	}

	/**
	 * Rebuilds plain HTML from a Custom HTML block that already has core slots.
	 *
	 * Static parts come from the block's inner content; each slot is replaced
	 * by the HTML its core block saves (without block comments).
	 *
	 * @param {?Object} block Block object from the block editor store.
	 * @return {string} HTML, or '' when the block has no slots.
	 */
	function htmlWithSlots( block ) {
		if ( ! block || ! block.innerBlocks || ! block.innerBlocks.length || ! Array.isArray( block.innerContent ) ) {
			return '';
		}
		let slot = 0;
		return block.innerContent.map( function ( part ) {
			if ( 'string' === typeof part ) {
				return part;
			}
			const inner = block.innerBlocks[ slot++ ];
			return inner ? wp.blocks.getBlockContent( inner ) : '';
		} ).join( '' );
	}

	/**
	 * Creates a core Custom HTML block that works before and after WordPress 7.1.
	 *
	 * @param {string} html HTML.
	 * @return {Object} Block.
	 */
	function createCoreHtmlBlock( html ) {
		return createBlock( 'core/html', { content: html }, [], [ html ] );
	}

	/*
	 * Starting points. Short on purpose: people replace them with their own HTML.
	 */
	const PHOTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250"><rect width="400" height="250" fill="#c9d3e6"/><circle cx="130" cy="95" r="36" fill="#fff" opacity=".8"/><path d="M0 250 150 130l90 80 60-50 100 90z" fill="#8fa3c8"/></svg>'
	);

	const EXAMPLES = [
		{
			name: __( 'Hero', 'konrads-editable-html' ),
			html: [
				'<style>',
				'.hero-section { padding: 4rem 2rem; background: #111827; color: #f9fafb; font-family: system-ui, sans-serif; }',
				'.hero-section h2 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin: 0 0 .75rem; }',
				'.hero-section p { font-size: 1.2rem; opacity: .85; margin: 0 0 1.5rem; }',
				'.hero-section a { display: inline-block; padding: .7rem 1.2rem; background: #f9fafb; color: #111827; border-radius: 6px; text-decoration: none; }',
				'</style>',
				'<section class="hero-section">',
				'  <h2>Big promise in a few words.</h2>',
				'  <p class="lead">One sentence that says who this is for.</p>',
				'  <a class="button" href="#contact">Get in touch</a>',
				'</section>',
			].join( '\n' ),
		},
		{
			name: __( 'Cards', 'konrads-editable-html' ),
			html: [
				'<style>',
				'.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; padding: 2rem 0; font-family: system-ui, sans-serif; }',
				'.card-grid .card { border: 1px solid #d0d5dd; border-radius: 12px; overflow: hidden; }',
				'.card-grid img { display: block; width: 100%; height: auto; }',
				'.card-grid h3, .card-grid p, .card-grid a { margin: 1rem; }',
				'.card-grid a { display: inline-block; }',
				'</style>',
				'<div class="card-grid">',
				'  <article class="card"><img src="' + PHOTO + '" alt="Placeholder landscape"><h3>First card</h3><p>Short description.</p><a href="#">Read more</a></article>',
				'  <article class="card"><img src="' + PHOTO + '" alt="Placeholder landscape"><h3>Second card</h3><p>Short description.</p><a href="#">Read more</a></article>',
				'  <article class="card"><img src="' + PHOTO + '" alt="Placeholder landscape"><h3>Third card</h3><p>Short description.</p><a href="#">Read more</a></article>',
				'</div>',
			].join( '\n' ),
		},
		{
			name: __( 'List with icons', 'konrads-editable-html' ),
			html: [
				'<style>',
				'.check-list { list-style: none; padding: 0; font-family: system-ui, sans-serif; }',
				'.check-list li { display: flex; gap: .6rem; align-items: center; margin: .5rem 0; }',
				'.check-list svg { flex: none; width: 1.2rem; height: 1.2rem; color: #0e7a55; }',
				'</style>',
				'<ul class="check-list">',
				'  <li><svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8 13.6 4.4 10 3 11.4l5 5 9-9L15.6 6z"/></svg> Fast to load</li>',
				'  <li><svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8 13.6 4.4 10 3 11.4l5 5 9-9L15.6 6z"/></svg> Easy to edit</li>',
				'  <li><svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8 13.6 4.4 10 3 11.4l5 5 9-9L15.6 6z"/></svg> Yours to keep</li>',
				'</ul>',
			].join( '\n' ),
		},
		{
			name: __( 'Calculator (JavaScript)', 'konrads-editable-html' ),
			html: [
				'<style>',
				'.cost-calculator { max-width: 420px; padding: 1.5rem; border: 1px solid #d0d5dd; border-radius: 12px; font-family: system-ui, sans-serif; }',
				'.cost-calculator label { display: block; margin: .75rem 0 0; font-weight: 600; }',
				'.cost-calculator input { display: block; width: 100%; margin-top: .25rem; padding: .5rem; font: inherit; box-sizing: border-box; }',
				'.cost-calculator output { display: block; margin-top: 1rem; font-size: 1.5rem; font-weight: 700; }',
				'</style>',
				'<div class="cost-calculator">',
				'  <h3>Project cost estimate</h3>',
				'  <p class="intro">Change the numbers to see a rough price.</p>',
				'  <label><span>Hours</span><input type="number" min="0" value="10"></label>',
				'  <label><span>Hourly rate (€)</span><input type="number" min="0" value="80"></label>',
				'  <output aria-live="polite">€800</output>',
				'</div>',
				'<script>',
				'document.querySelectorAll( \'.cost-calculator:not([data-ready])\' ).forEach( function ( calc ) {',
				'\tcalc.setAttribute( \'data-ready\', \'\' );',
				'\tvar inputs = calc.querySelectorAll( \'input\' );',
				'\tvar output = calc.querySelector( \'output\' );',
				'\tfunction run() {',
				'\t\tvar total = ( parseFloat( inputs[ 0 ].value ) || 0 ) * ( parseFloat( inputs[ 1 ].value ) || 0 );',
				'\t\toutput.textContent = \'€\' + total.toLocaleString();',
				'\t}',
				'\tinputs.forEach( function ( input ) {',
				'\t\tinput.addEventListener( \'input\', run );',
				'\t} );',
				'\trun();',
				'} );',
				'</script>',
			].join( '\n' ),
		},
	];

	/**
	 * First screen of an empty block: pick an example, import files, or paste.
	 *
	 * @param {Object}   props          Props.
	 * @param {Function} props.onSubmit Receives the HTML.
	 * @return {Object} Element.
	 */
	function StartScreen( { onSubmit } ) {
		const [ draft, setDraft ] = useState( '' );
		const [ notes, setNotes ] = useState( [] );
		const [ isBusy, setBusy ] = useState( false );

		function importPicked( event ) {
			const picked = event.target.files;
			if ( ! picked || ! picked.length ) {
				return;
			}
			setBusy( true );
			importer.importFiles( picked ).then( function ( result ) {
				setBusy( false );
				if ( result.html ) {
					onSubmit( result.html, result.notes );
				} else {
					setNotes( result.notes );
				}
			} );
		}

		return el(
			'div',
			{ className: 'konrads-editable-html-start' },
			el(
				'div',
				{ className: 'konrads-editable-html-start__row', role: 'group', 'aria-label': __( 'Start with', 'konrads-editable-html' ) },
				el( 'span', { className: 'konrads-editable-html-start__label' }, __( 'Start with:', 'konrads-editable-html' ) ),
				EXAMPLES.map( function ( example ) {
					return el(
						Button,
						{
							key: example.name,
							variant: 'secondary',
							size: 'compact',
							onClick() {
								onSubmit( example.html, [] );
							},
						},
						example.name
					);
				} ),
				el( FormFileUpload, {
					accept: '.html,.htm,.css,.js,.mjs,.zip',
					multiple: true,
					onChange: importPicked,
					render( upload ) {
						return el(
							Button,
							{ variant: 'secondary', size: 'compact', onClick: upload.openFileDialog, isBusy, disabled: isBusy },
							__( 'Import files…', 'konrads-editable-html' )
						);
					},
				} )
			),
			el(
				'p',
				{ className: 'konrads-editable-html-help' },
				__( 'Import: pick your .html, .css and .js files together, or one .zip (a CodePen export works).', 'konrads-editable-html' )
			),
			notes.map( function ( note, index ) {
				return el( Notice, { key: index, status: note.type, isDismissible: false }, note.text );
			} ),
			el( TextareaControl, {
				__nextHasNoMarginBottom: true,
				label: __( 'Or paste HTML', 'konrads-editable-html' ),
				placeholder: __( 'Paste your HTML here, <style> and <script> included.', 'konrads-editable-html' ),
				rows: 8,
				value: draft,
				onChange: setDraft,
			} ),
			el(
				Button,
				{
					variant: 'primary',
					disabled: ! draft.trim(),
					onClick() {
						onSubmit( draft.trim(), [] );
					},
				},
				__( 'Make editable', 'konrads-editable-html' )
			)
		);
	}

	/**
	 * Sidebar row for one image: preview, replace button, alt text.
	 *
	 * @param {Object}   props        Props.
	 * @param {Object}   props.field  Field.
	 * @param {Object}   props.value  Current { url, alt }.
	 * @param {Function} props.update Writes a patch.
	 * @return {Object} Element.
	 */
	function ImageSettings( { field, value, update } ) {
		return el(
			'div',
			{ className: 'konrads-editable-html-image-settings' },
			value.url && el( 'img', { src: value.url, alt: '' } ),
			el(
				MediaUploadCheck,
				null,
				el( MediaUpload, {
					allowedTypes: [ 'image' ],
					onSelect( media ) {
						update( field, { url: media.url, alt: media.alt || '' } );
					},
					render( upload ) {
						return el(
							Button,
							{ variant: 'secondary', onClick: upload.open },
							/* translators: %s: name of the image, e.g. "Image". */
							sprintf( __( 'Replace %s', 'konrads-editable-html' ), field.label )
						);
					},
				} )
			),
			el( TextareaControl, {
				__nextHasNoMarginBottom: true,
				/* translators: %s: name of the image, e.g. "Image". */
				label: sprintf( __( '%s alt text', 'konrads-editable-html' ), field.label ),
				help: __( 'Describe the image for people who cannot see it. Leave empty only if it is decoration.', 'konrads-editable-html' ),
				value: value.alt,
				onChange( alt ) {
					update( field, { alt } );
				},
			} )
		);
	}

	/**
	 * Sidebar panel for one repeatable list: move, duplicate, remove items.
	 *
	 * @param {Object}   props          Props.
	 * @param {Object}   props.list     List from engine.detectLists().
	 * @param {Function} props.onAction Receives ( list, index, action ).
	 * @return {Object} Element.
	 */
	function ListSettings( { list, onAction } ) {
		const last = list.items.length - 1;

		function button( index, action, icon, label, disabled ) {
			return el( Button, {
				icon,
				label,
				size: 'small',
				disabled,
				onClick() {
					onAction( list, index, action );
				},
			} );
		}

		return el(
			PanelBody,
			/* translators: %s: name of the list, e.g. "Cards". */
			{ title: sprintf( __( 'List: %s', 'konrads-editable-html' ), list.label ), initialOpen: false },
			el(
				'ol',
				{ className: 'konrads-editable-html-list-items' },
				list.previews.map( function ( preview, index ) {
					/* translators: 1: item number, 2: start of the item's text. */
					const name = sprintf( __( '%1$d. %2$s', 'konrads-editable-html' ), index + 1, preview || __( 'Item', 'konrads-editable-html' ) );
					return el(
						'li',
						{ key: index },
						el( 'span', { className: 'konrads-editable-html-list-items__name' }, name ),
						/* translators: %s: item name. */
						button( index, 'up', 'arrow-up-alt2', sprintf( __( 'Move up: %s', 'konrads-editable-html' ), name ), 0 === index ),
						/* translators: %s: item name. */
						button( index, 'down', 'arrow-down-alt2', sprintf( __( 'Move down: %s', 'konrads-editable-html' ), name ), last === index ),
						/* translators: %s: item name. */
						button( index, 'duplicate', 'admin-page', sprintf( __( 'Duplicate: %s', 'konrads-editable-html' ), name ), false ),
						/* translators: %s: item name. */
						button( index, 'remove', 'trash', sprintf( __( 'Remove: %s', 'konrads-editable-html' ), name ), 0 === last )
					);
				} )
			),
			el(
				Button,
				{
					variant: 'secondary',
					onClick() {
						onAction( list, last, 'duplicate' );
					},
				},
				__( 'Add item', 'konrads-editable-html' )
			)
		);
	}

	/**
	 * Names a field kind for people.
	 *
	 * @param {string} kind Field kind.
	 * @return {string} Readable name.
	 */
	function kindName( kind ) {
		if ( 'image' === kind ) {
			return __( 'Image', 'konrads-editable-html' );
		}
		if ( 'link' === kind ) {
			return __( 'Link', 'konrads-editable-html' );
		}
		return __( 'Text', 'konrads-editable-html' );
	}

	/**
	 * Checks whether two fields point at the same part.
	 *
	 * @param {Object} a Field or candidate.
	 * @param {Object} b Field or candidate.
	 * @return {boolean} True when they match.
	 */
	function samePart( a, b ) {
		return a.path === b.path && a.kind === b.kind;
	}

	/**
	 * Shows import messages as editor notices.
	 *
	 * @param {Object} notices Actions of the core/notices store.
	 * @param {Array}  notes   Messages from the importer.
	 */
	function showNotes( notices, notes ) {
		( notes || [] ).forEach( function ( note ) {
			const status = 'error' === note.type ? 'error' : 'warning' === note.type ? 'warning' : 'info';
			notices.createNotice( status, note.text, { isDismissible: true } );
		} );
	}

	/**
	 * Editor view of the block.
	 *
	 * @param {Object} props Block props.
	 * @return {Object} Element.
	 */
	function Edit( props ) {
		const { attributes, setAttributes } = props;
		const content = attributes.content || '';
		const fields = attributes.fields || [];
		const isLocked = !! attributes.htmlLocked;
		const canSetUp = CAN_EDIT_HTML && ! isLocked;
		const [ isEditingHtml, setEditingHtml ] = useState( false );
		const partsBeforeHtmlEdit = useRef( [] );
		const lastTyped = useRef( {} );
		const notices = useDispatch( 'core/notices' );
		const blockProps = useBlockProps( { className: 'konrads-editable-html-edit' } );

		const body = useMemo( () => engine.parse( content ), [ content ] );
		const candidates = useMemo( () => engine.detect( content ), [ content ] );
		const lists = useMemo( () => engine.detectLists( content ), [ content ] );

		/**
		 * Writes a new value into the HTML.
		 *
		 * @param {Object} field Field.
		 * @param {Object} patch Any of { text, url, alt }.
		 */
		function update( field, patch ) {
			const next = engine.write( content, field, patch );
			if ( undefined !== patch.text ) {
				const stored = engine.read( engine.parse( next ), field );
				lastTyped.current[ field.path ] = { typed: patch.text, stored: stored ? stored.text : '' };
			}
			setAttributes( { content: next } );
		}

		/**
		 * Returns what the person typed when the browser only changed its spelling
		 * (e.g. &nbsp;), so the cursor does not jump while typing.
		 *
		 * @param {Object} field  Field.
		 * @param {string} stored Value read from the HTML.
		 * @return {string} Value for RichText.
		 */
		function typed( field, stored ) {
			const last = lastTyped.current[ field.path ];
			return last && last.stored === stored ? last.typed : stored;
		}

		function toggle( candidate, isOn ) {
			const others = fields.filter( ( field ) => ! samePart( field, candidate ) );
			const next = isOn ? others.concat( engine.toFields( [ candidate ] ) ) : others;
			next.sort( function ( a, b ) {
				return candidates.findIndex( ( c ) => samePart( c, a ) ) - candidates.findIndex( ( c ) => samePart( c, b ) );
			} );
			setAttributes( { fields: next } );
		}

		function changeList( list, index, action ) {
			const result = engine.listAction( content, list, index, action );
			if ( ! result.moves ) {
				return;
			}
			lastTyped.current = {};
			setAttributes( {
				content: result.html,
				fields: engine.remapFields( fields, list.path, result.moves ),
			} );
		}

		function startHtmlEdit() {
			partsBeforeHtmlEdit.current = candidates;
			setEditingHtml( true );
		}

		function endHtmlEdit() {
			setAttributes( {
				fields: engine.mergeFields( partsBeforeHtmlEdit.current, fields, candidates ),
			} );
			lastTyped.current = {};
			setEditingHtml( false );
		}

		// Empty block: examples, import, or paste.
		if ( ! content.trim() ) {
			return el(
				'div',
				blockProps,
				el(
					Placeholder,
					{
						icon: 'editor-code',
						label: __( 'Editable HTML', 'konrads-editable-html' ),
						instructions: CAN_EDIT_HTML
							? __( 'Your own HTML with editable text, links, images and lists. Everything else stays exactly as you wrote it.', 'konrads-editable-html' )
							: __( 'Only people who can add custom HTML (usually administrators) can set up this block.', 'konrads-editable-html' ),
					},
					CAN_EDIT_HTML && el( StartScreen, {
						onSubmit( html, notes ) {
							setAttributes( { content: html, fields: engine.toFields( engine.detect( html ) ) } );
							showNotes( notices, notes );
						},
					} )
				)
			);
		}

		const byPath = {};
		fields.forEach( function ( field ) {
			byPath[ field.path ] = field;
		} );
		const ctx = {
			body,
			byPath,
			update,
			typed,
			hasFieldInside( path ) {
				return fields.some( ( field ) => 0 === field.path.indexOf( path + '/' ) );
			},
		};

		const links = fields.filter( ( field ) => 'link' === field.kind );
		const images = fields.filter( ( field ) => 'image' === field.kind );
		const missingAlt = images.filter( function ( field ) {
			const value = engine.read( body, field );
			return value && ! value.alt.trim();
		} ).length;
		// Roles without unfiltered_html get this markup filtered on save.
		const mayBeFiltered = ! CAN_EDIT_HTML && /<(style|script|iframe|form|input|svg)\b|\sstyle=/i.test( content );

		const canvas = isEditingHtml
			? el( PlainText, {
				value: content,
				onChange( html ) {
					setAttributes( { content: html } );
				},
				placeholder: __( 'Write HTML…', 'konrads-editable-html' ),
				'aria-label': __( 'HTML', 'konrads-editable-html' ),
			} )
			: renderChildren( body, '', ctx );

		return el(
			Fragment,
			null,
			canSetUp && el(
				BlockControls,
				null,
				el(
					ToolbarGroup,
					null,
					el(
						ToolbarButton,
						{
							isPressed: isEditingHtml,
							onClick: isEditingHtml ? endHtmlEdit : startHtmlEdit,
						},
						isEditingHtml ? __( 'Done', 'konrads-editable-html' ) : __( 'Edit HTML', 'konrads-editable-html' )
					)
				)
			),
			el(
				InspectorControls,
				null,
				mayBeFiltered && el(
					'div',
					{ className: 'konrads-editable-html-notice' },
					el(
						Notice,
						{ status: 'warning', isDismissible: false },
						__( 'Your user role cannot save custom HTML. Saving this page may remove styles or scripts from this block. Change text only if an administrator has confirmed it is safe.', 'konrads-editable-html' )
					)
				),
				CAN_EDIT_HTML && el(
					PanelBody,
					{ title: __( 'HTML', 'konrads-editable-html' ) },
					el(
						'p',
						{ className: 'konrads-editable-html-help' },
						isLocked
							? __( 'The HTML is locked, so nobody changes the design by accident. Text, links, images and lists can still be edited.', 'konrads-editable-html' )
							: __( 'Done setting up? Lock the HTML before you hand the site over.', 'konrads-editable-html' )
					),
					el(
						Button,
						{
							variant: 'secondary',
							onClick() {
								if ( isEditingHtml ) {
									endHtmlEdit();
								}
								setAttributes( { htmlLocked: ! isLocked } );
							},
						},
						isLocked ? __( 'Unlock HTML', 'konrads-editable-html' ) : __( 'Lock HTML', 'konrads-editable-html' )
					)
				),
				canSetUp && el(
					PanelBody,
					{ title: __( 'Editable parts', 'konrads-editable-html' ) },
					el(
						'p',
						{ className: 'konrads-editable-html-help' },
						candidates.length
							? __( 'Ticked parts can be changed by anyone who can edit this page.', 'konrads-editable-html' )
							: __( 'Nothing editable found. Add headings, paragraphs, links or images to the HTML.', 'konrads-editable-html' )
					),
					candidates.map( function ( candidate ) {
						return el( CheckboxControl, {
							key: candidate.path + ':' + candidate.kind,
							__nextHasNoMarginBottom: true,
							label: candidate.label,
							help: kindName( candidate.kind ) + ( candidate.preview ? ': ' + candidate.preview : '' ),
							checked: fields.some( ( field ) => samePart( field, candidate ) ),
							onChange( isOn ) {
								toggle( candidate, isOn );
							},
						} );
					} )
				),
				lists.map( function ( list ) {
					return el( ListSettings, { key: list.path, list, onAction: changeList } );
				} ),
				links.length > 0 && el(
					PanelBody,
					{ title: __( 'Links', 'konrads-editable-html' ) },
					links.map( function ( field ) {
						const value = engine.read( body, field );
						return value && el( TextControl, {
							key: field.path,
							__next40pxDefaultSize: true,
							__nextHasNoMarginBottom: true,
							type: 'url',
							/* translators: %s: name of the link, e.g. "Button". */
							label: sprintf( __( '%s: web address', 'konrads-editable-html' ), field.label ),
							value: value.url,
							onChange( url ) {
								update( field, { url } );
							},
						} );
					} )
				),
				images.length > 0 && el(
					PanelBody,
					{ title: __( 'Images', 'konrads-editable-html' ) },
					missingAlt > 0 && el(
						Notice,
						{ status: 'warning', isDismissible: false },
						sprintf(
							/* translators: %d: number of images. */
							_n( '%d image has no alt text.', '%d images have no alt text.', missingAlt, 'konrads-editable-html' ),
							missingAlt
						)
					),
					images.map( function ( field ) {
						const value = engine.read( body, field );
						return value && el( ImageSettings, { key: field.path, field, value, update } );
					} )
				)
			),
			el.apply( null, [ 'div', blockProps ].concat( canvas ) )
		);
	}

	/**
	 * Front-end markup: the finished HTML, exactly like core/html saves it.
	 *
	 * @param {Object} props            Block props.
	 * @param {Object} props.attributes Attributes.
	 * @return {Object} Element.
	 */
	function save( { attributes } ) {
		return el( RawHTML, null, attributes.content );
	}

	registerBlockType( BLOCK_NAME, {
		edit: Edit,
		save,
		transforms: {
			from: [
				{
					type: 'block',
					blocks: [ 'core/html' ],
					// WordPress 7.1 moved the HTML out of attributes; the toolbar button covers that case.
					isMatch: ( attributes ) => CAN_EDIT_HTML && !! ( attributes.content || '' ).trim(),
					transform( attributes ) {
						return createBlock( BLOCK_NAME, {
							content: attributes.content,
							fields: engine.toFields( engine.detect( attributes.content ) ),
						} );
					},
				},
			],
			to: [
				{
					type: 'block',
					blocks: [ 'core/html' ],
					transform( attributes ) {
						return createCoreHtmlBlock( attributes.content );
					},
				},
			],
		},
	} );

	/**
	 * Checks whether the Custom HTML block can hold editable core blocks (WordPress 7.1+).
	 *
	 * @return {boolean} True when core slots are available.
	 */
	function hasCoreSlots() {
		const type = wp.blocks.getBlockType( 'core/html' );
		if ( ! type ) {
			return false;
		}
		if ( wp.blocks.hasBlockSupport && wp.blocks.hasBlockSupport( type, 'innerContent' ) ) {
			return true;
		}
		// Older WordPress keeps the HTML in a "raw" sourced attribute.
		return !! ( type.attributes && type.attributes.content && 'raw' !== type.attributes.content.source );
	}

	/**
	 * Says in plain words which parts stay fixed.
	 *
	 * @param {Array} skipped From engine.planSlots().
	 * @return {string} E.g. "2 parts stay fixed (link, image)." or ''.
	 */
	function skippedSummary( skipped ) {
		const names = {
			link: __( 'link', 'konrads-editable-html' ),
			image: __( 'image', 'konrads-editable-html' ),
			icon: __( 'text with icon', 'konrads-editable-html' ),
			'list-item': __( 'list item', 'konrads-editable-html' ),
			tag: __( 'other element', 'konrads-editable-html' ),
			'inline-style': __( 'inline style', 'konrads-editable-html' ),
			attributes: __( 'extra attributes', 'konrads-editable-html' ),
			formatting: __( 'special formatting', 'konrads-editable-html' ),
		};
		if ( ! skipped.length ) {
			return '';
		}
		const reasons = skipped.map( ( item ) => names[ item.reason ] || item.reason )
			.filter( ( name, index, all ) => all.indexOf( name ) === index );

		return sprintf(
			/* translators: 1: number of parts, 2: list of reasons, e.g. "link, image". */
			_n( '%1$d part stays fixed (%2$s).', '%1$d parts stay fixed (%2$s).', skipped.length, 'konrads-editable-html' ),
			skipped.length,
			reasons.join( ', ' )
		);
	}

	/**
	 * Builds a Custom HTML block with core slots from plain HTML.
	 *
	 * Every slot is serialized by WordPress itself, then the whole block is
	 * parsed and validated. Returns null when anything does not validate,
	 * so the page is never changed by a half-working conversion.
	 *
	 * @param {string} html  HTML.
	 * @param {Array}  slots From engine.planSlots().
	 * @return {?Object} Parsed core/html block, or null.
	 */
	function buildSlotBlock( html, slots ) {
		const inner = engine.toSlotMarkup( html, slots, function ( slot ) {
			return wp.blocks.serialize( createBlock( slot.name, slot.attributes ) );
		} );
		const parsed = wp.blocks.parse( '<!-- wp:html -->' + inner + '<!-- /wp:html -->' );
		const block = parsed.length === 1 ? parsed[ 0 ] : null;

		if ( ! block || 'core/html' !== block.name || block.innerBlocks.length !== slots.length ) {
			return null;
		}
		const allValid = [ block ].concat( block.innerBlocks ).every( ( item ) => false !== item.isValid );
		return allValid ? block : null;
	}

	/**
	 * "Make editable" button in the toolbar of the core Custom HTML block.
	 *
	 * WordPress 7.1+: turns headings and paragraphs into core's own editable
	 * slots. The result is pure core; no plugin is needed to show or edit it.
	 * Older WordPress, or when asked: uses the Editable HTML block instead.
	 *
	 * @param {Object} props          Props.
	 * @param {string} props.clientId Block client ID.
	 * @return {?Object} Element, or null when there is nothing to do.
	 */
	function MakeEditableButton( { clientId } ) {
		const block = useSelect( ( select ) => select( 'core/block-editor' ).getBlock( clientId ), [ clientId ] );
		const { replaceBlocks } = useDispatch( 'core/block-editor' );
		const { createSuccessNotice, createNotice } = useDispatch( 'core/notices' );
		function switchToEditableBlock( targetId, html ) {
			const found = engine.detect( html );
			replaceBlocks( targetId, createBlock( BLOCK_NAME, {
				content: html,
				fields: engine.toFields( found ),
			} ) );
			createSuccessNotice(
				sprintf(
					/* translators: %d: number of editable parts. */
					_n( '%d part is now editable in the Editable HTML block.', '%d parts are now editable in the Editable HTML block.', found.length, 'konrads-editable-html' ),
					found.length
				),
				{ type: 'snackbar' }
			);
		}

		const content = htmlOfCoreBlock( block );
		const slotted = htmlWithSlots( block );

		// Converted block: offer the next step, but only while parts are still fixed.
		if ( slotted ) {
			if ( ! engine.planSlots( slotted ).skipped.length ) {
				return null;
			}
			return el(
				BlockControls,
				null,
				el(
					ToolbarGroup,
					null,
					el( ToolbarButton, { onClick: () => switchToEditableBlock( clientId, slotted ) }, __( 'Make all editable', 'konrads-editable-html' ) )
				)
			);
		}

		// Empty block: nothing to make editable yet.
		if ( ! content.trim() ) {
			return null;
		}


		function convert() {
			if ( ! hasCoreSlots() ) {
				switchToEditableBlock( clientId, content );
				if ( CAN_UPDATE_CORE ) {
					createNotice(
						'info',
						__( 'Tip: on WordPress 7.1 or newer, "Make editable" uses WordPress\'s own editing. No plugin is needed afterwards.', 'konrads-editable-html' ),
						{ type: 'snackbar' }
					);
				}
				return;
			}

			const plan = engine.planSlots( content );
			const fallback = plan.skipped.length
				? [ {
					label: __( 'Make all editable', 'konrads-editable-html' ),
					onClick: () => switchToEditableBlock( clientId, content ),
				} ]
				: [];

			if ( ! plan.slots.length ) {
				createNotice(
					'info',
					plan.skipped.length
						? __( 'No headings or paragraphs that core can make editable. The Editable HTML block can handle links, images and lists.', 'konrads-editable-html' )
						: __( 'Nothing editable found in this HTML.', 'konrads-editable-html' ),
					{ type: 'snackbar', actions: fallback }
				);
				return;
			}

			const slotBlock = buildSlotBlock( content, plan.slots );
			if ( ! slotBlock ) {
				createNotice(
					'error',
					__( 'This HTML could not be converted safely, so nothing was changed.', 'konrads-editable-html' ),
					{ type: 'snackbar', actions: [ { label: __( 'Make all editable', 'konrads-editable-html' ), onClick: () => switchToEditableBlock( clientId, content ) } ] }
				);
				return;
			}

			replaceBlocks( clientId, slotBlock );
			createSuccessNotice(
				[
					sprintf(
						/* translators: %d: number of editable parts. */
						_n( '%d part is now editable.', '%d parts are now editable.', plan.slots.length, 'konrads-editable-html' ),
						plan.slots.length
					),
					skippedSummary( plan.skipped ),
				].filter( Boolean ).join( ' ' ),
				{
					type: 'snackbar',
					actions: plan.skipped.length
						? [ { label: __( 'Make all editable', 'konrads-editable-html' ), onClick: () => switchToEditableBlock( slotBlock.clientId, content ) } ]
						: [],
				}
			);
		}

		return el(
			BlockControls,
			null,
			el(
				ToolbarGroup,
				null,
				el( ToolbarButton, { onClick: convert }, __( 'Make editable', 'konrads-editable-html' ) )
			)
		);
	}

	const withMakeEditable = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			if ( 'core/html' !== props.name || ! CAN_EDIT_HTML ) {
				return el( BlockEdit, props );
			}
			return el(
				Fragment,
				null,
				el( BlockEdit, props ),
				props.isSelected && el( MakeEditableButton, { clientId: props.clientId } )
			);
		};
	}, 'withMakeEditable' );

	addFilter( 'editor.BlockEdit', 'konrads-editable-html/make-editable', withMakeEditable );
}( window.wp, window.konradsEditableHtml.engine, window.konradsEditableHtml.importer, window.konradsEditableHtmlSettings ) );
