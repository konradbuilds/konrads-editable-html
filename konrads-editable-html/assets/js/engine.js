/**
 * Konrad's Editable HTML engine.
 *
 * Finds the parts of a piece of HTML that people can safely edit
 * (text, links, images), and reads or writes their values.
 *
 * Plain JavaScript, no build step, no dependencies. Works anywhere a
 * browser DOM exists: the block editor, the web app, tests.
 *
 * A "field" is { path, kind, label }. The path is a list of element
 * indexes from the top of the markup, e.g. "0/1/2".
 *
 * @package KonradsEditableHtml
 */

( function ( window ) {
	'use strict';

	// Tags whose whole text can become one editable field.
	const TEXT_TAGS = [
		'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote', 'figcaption',
		'button', 'label', 'dt', 'dd', 'td', 'th', 'span', 'small', 'cite', 'q',
		'caption', 'legend', 'summary',
	];

	// Formatting tags allowed inside an editable text field.
	const INLINE_TAGS = [
		'a', 'abbr', 'b', 'br', 'cite', 'code', 'em', 'i', 'kbd', 'mark', 's',
		'small', 'span', 'strong', 'sub', 'sup', 'time', 'u',
	];

	// Never look inside these.
	const SKIP_TAGS = [
		'script', 'style', 'svg', 'template', 'iframe', 'noscript', 'select',
		'textarea', 'input', 'video', 'audio', 'canvas', 'object',
	];

	// Small leading elements that are icons, not text (kept static).
	const ICON_TAGS = [ 'i', 'svg', 'span', 'img' ];

	/*
	 * Names for parts without a useful class name. English by default;
	 * the plugin replaces them with translations (engine.labels).
	 * "list" gets the tag name, e.g. "UL list".
	 */
	const LABELS = {
		button: 'Button',
		heading: 'Heading',
		image: 'Image',
		link: 'Link',
		list: '%s list',
		listItem: 'List item',
		text: 'Text',
	};

	// Friendlier names for common class names (keys of LABELS).
	const ALIASES = {
		btn: 'button',
		cta: 'button',
		img: 'image',
		pic: 'image',
		title: 'heading',
	};

	/**
	 * Parses HTML into a detached document body.
	 *
	 * @param {string} html Markup.
	 * @return {HTMLElement} The body element holding the markup.
	 */
	function parse( html ) {
		const doc = new window.DOMParser().parseFromString(
			'<!doctype html><html><body>' + ( html || '' ) + '</body></html>',
			'text/html'
		);
		return doc.body;
	}

	/**
	 * Returns the lowercase tag name of an element.
	 *
	 * @param {Element} node Element.
	 * @return {string} Tag name.
	 */
	function tagOf( node ) {
		return node.tagName.toLowerCase();
	}

	/**
	 * Checks whether a string contains letters or numbers.
	 *
	 * @param {string} text Text.
	 * @return {boolean} True when readable text is present.
	 */
	function hasLetters( text ) {
		return /[\p{L}\p{N}]/u.test( text || '' );
	}

	/**
	 * Checks whether an element only contains inline formatting.
	 *
	 * @param {Element} node Element.
	 * @return {boolean} True when every descendant is an inline tag.
	 */
	function onlyInline( node ) {
		const all = node.querySelectorAll( '*' );
		for ( let i = 0; i < all.length; i++ ) {
			// Inline SVG icons count as inline too.
			if ( INLINE_TAGS.indexOf( tagOf( all[ i ] ) ) === -1 && ! all[ i ].closest( 'svg' ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Splits a leading icon from the text, e.g. <li><i>♥</i> Design</li>.
	 *
	 * @param {Element} node  Element.
	 * @param {boolean} force Split even when no text follows (field already known).
	 * @return {Object|null} { prefix, text } or null when there is no icon.
	 */
	function iconSplit( node, force ) {
		const nodes = Array.prototype.slice.call( node.childNodes );
		let i = 0;

		while ( i < nodes.length && 3 === nodes[ i ].nodeType && ! nodes[ i ].textContent.trim() ) {
			i++;
		}
		const icon = nodes[ i ];
		if ( ! icon || 1 !== icon.nodeType || ICON_TAGS.indexOf( tagOf( icon ) ) === -1 || hasLetters( icon.textContent ) ) {
			return null;
		}
		const rest = nodes.slice( i + 1 );
		const restText = rest.map( ( n ) => n.textContent ).join( '' );
		if ( ! force && ! hasLetters( restText ) ) {
			return null;
		}
		const holder = node.ownerDocument.createElement( 'div' );
		rest.forEach( ( n ) => holder.appendChild( n.cloneNode( true ) ) );
		const prefixHolder = node.ownerDocument.createElement( 'div' );
		nodes.slice( 0, i + 1 ).forEach( ( n ) => prefixHolder.appendChild( n.cloneNode( true ) ) );
		const gap = /^\s/.test( holder.innerHTML ) ? ' ' : '';

		return {
			prefix: prefixHolder.innerHTML + gap,
			text: holder.innerHTML.trim(),
		};
	}

	/**
	 * Decides whether an element is an editable field, and of which kind.
	 *
	 * @param {Element} node Element.
	 * @return {string|null} 'text', 'link', 'image' or null.
	 */
	function kindOf( node ) {
		const tag = tagOf( node );

		if ( 'img' === tag ) {
			return 'image';
		}
		if ( 'a' === tag ) {
			return hasLetters( node.textContent ) && onlyInline( node ) ? 'link' : null;
		}
		if ( TEXT_TAGS.indexOf( tag ) !== -1 && onlyInline( node ) && hasLetters( node.textContent ) ) {
			return 'text';
		}
		return null;
	}

	/**
	 * Builds a readable label from class names or the tag.
	 *
	 * @param {Element} node Element.
	 * @param {string}  kind Field kind.
	 * @return {string} Label, e.g. "Lead" or "Heading".
	 */
	function labelOf( node, kind ) {
		const classes = Array.prototype.filter.call( node.classList, function ( name ) {
			return ! /^(wp-|is-|has-)/.test( name );
		} );
		const tag = tagOf( node );

		if ( classes.length ) {
			const name = classes[ classes.length - 1 ];
			if ( ALIASES[ name ] ) {
				return LABELS[ ALIASES[ name ] ];
			}
			const words = name.replace( /[-_]+/g, ' ' ).trim();
			return words.charAt( 0 ).toUpperCase() + words.slice( 1 );
		}
		if ( /^h[1-6]$/.test( tag ) ) {
			return LABELS.heading;
		}
		if ( 'image' === kind ) {
			return LABELS.image;
		}
		if ( 'link' === kind ) {
			return LABELS.link;
		}
		if ( 'li' === tag ) {
			return LABELS.listItem;
		}
		if ( 'button' === tag ) {
			return LABELS.button;
		}
		return LABELS.text;
	}

	/**
	 * Finds an element by path.
	 *
	 * @param {HTMLElement} body Parsed body.
	 * @param {string}      path Path like "0/1/2".
	 * @return {Element|null} The element, or null when the path is gone.
	 */
	function nodeAt( body, path ) {
		const steps = String( path ).split( '/' );
		let node = body;
		for ( let i = 0; i < steps.length; i++ ) {
			if ( ! node || ! node.children ) {
				return null;
			}
			node = node.children[ parseInt( steps[ i ], 10 ) ] || null;
		}
		return node;
	}

	/**
	 * Lists every part of the markup that could be editable.
	 *
	 * @param {string} html Markup.
	 * @return {Array} Candidates: { path, kind, label, tag, preview }.
	 */
	function detect( html ) {
		const body = parse( html );
		const found = [];
		const used = {};

		function walk( parent, prefix ) {
			Array.prototype.forEach.call( parent.children, function ( child, index ) {
				const tag = tagOf( child );
				const path = prefix ? prefix + '/' + index : String( index );

				if ( SKIP_TAGS.indexOf( tag ) !== -1 || tag.indexOf( '-' ) > 0 ) {
					return;
				}

				const kind = kindOf( child );
				if ( ! kind ) {
					walk( child, path );
					return;
				}

				let label = labelOf( child, kind );
				used[ label ] = ( used[ label ] || 0 ) + 1;
				if ( used[ label ] > 1 ) {
					label += ' ' + used[ label ];
				}

				const split = 'text' === kind ? iconSplit( child, false ) : null;
				const source = split ? parse( split.text ) : child;
				const text = 'image' === kind
					? child.getAttribute( 'alt' ) || child.getAttribute( 'src' ) || ''
					: source.textContent.replace( /\s+/g, ' ' ).trim();

				found.push( {
					path,
					kind,
					label,
					tag,
					classes: child.getAttribute( 'class' ) || '',
					icon: 'text' === kind && !! iconSplit( child, false ),
					preview: text.length > 40 ? text.slice( 0, 39 ) + '…' : text,
				} );
			} );
		}

		walk( body, '' );
		return found;
	}

	/**
	 * Turns candidates into stored fields.
	 *
	 * @param {Array} candidates Result of detect().
	 * @return {Array} Fields: { path, kind, label }.
	 */
	function toFields( candidates ) {
		return candidates.map( function ( candidate ) {
			const field = {
				path: candidate.path,
				kind: candidate.kind,
				label: candidate.label,
				tag: candidate.tag,
			};
			if ( candidate.icon ) {
				field.icon = true;
			}
			return field;
		} );
	}

	/**
	 * Keeps the user's choices when the markup changes.
	 *
	 * Paths shift when elements are added or removed, so parts are matched
	 * by what they are first (kind, tag, classes, text), by position last.
	 * Matched parts keep their ticked or unticked state. New parts are ticked.
	 *
	 * @param {Array} before     Candidates before the change.
	 * @param {Array} fields     Fields ticked before the change.
	 * @param {Array} candidates Candidates after the change.
	 * @return {Array} Fields after the change.
	 */
	function mergeFields( before, fields, candidates ) {
		const used = [];
		const tests = [
			function ( a, b ) {
				return a.kind === b.kind && a.tag === b.tag && a.classes === b.classes && a.preview === b.preview;
			},
			function ( a, b ) {
				return a.kind === b.kind && a.tag === b.tag && a.classes === b.classes;
			},
			function ( a, b ) {
				return a.kind === b.kind && a.path === b.path;
			},
		];
		const matches = candidates.map( function () {
			return null;
		} );

		// One pass per test, so exact matches win over rough ones.
		tests.forEach( function ( test ) {
			candidates.forEach( function ( candidate, i ) {
				if ( matches[ i ] ) {
					return;
				}
				const old = before.find( function ( item ) {
					return used.indexOf( item ) === -1 && test( item, candidate );
				} );
				if ( old ) {
					used.push( old );
					matches[ i ] = old;
				}
			} );
		} );

		return toFields( candidates.filter( function ( candidate, i ) {
			const old = matches[ i ];
			if ( ! old ) {
				return true;
			}
			return fields.some( function ( field ) {
				return field.path === old.path && field.kind === old.kind;
			} );
		} ) );
	}

	/**
	 * Finds the element of a stored field, if it is still there.
	 *
	 * Checks the tag rather than the content, so a field stays editable
	 * even after someone deletes all of its text.
	 *
	 * @param {HTMLElement} body  Parsed body.
	 * @param {Object}      field Field.
	 * @return {Element|null} Element or null.
	 */
	function fieldNode( body, field ) {
		const node = nodeAt( body, field.path );
		if ( ! node ) {
			return null;
		}
		if ( field.tag ) {
			return tagOf( node ) === field.tag ? node : null;
		}
		return kindOf( node ) === field.kind ? node : null;
	}

	/**
	 * Reads the current value of a field.
	 *
	 * @param {HTMLElement} body  Parsed body.
	 * @param {Object}      field Field.
	 * @return {Object|null} { text, url, alt } as they apply, or null.
	 */
	function read( body, field ) {
		const node = fieldNode( body, field );
		if ( ! node ) {
			return null;
		}
		if ( 'image' === field.kind ) {
			return {
				url: node.getAttribute( 'src' ) || '',
				alt: node.getAttribute( 'alt' ) || '',
			};
		}
		if ( 'link' === field.kind ) {
			return {
				text: node.innerHTML,
				url: node.getAttribute( 'href' ) || '',
			};
		}
		if ( field.icon ) {
			const split = iconSplit( node, true );
			if ( split ) {
				return { text: split.text, prefix: split.prefix };
			}
		}
		return { text: node.innerHTML };
	}

	/**
	 * Writes a new value into the markup.
	 *
	 * @param {string} html  Markup.
	 * @param {Object} field Field.
	 * @param {Object} patch Any of { text, url, alt }.
	 * @return {string} Updated markup. Unchanged when the field is gone.
	 */
	function write( html, field, patch ) {
		const body = parse( html );
		const node = fieldNode( body, field );

		if ( ! node ) {
			return html;
		}
		if ( undefined !== patch.text ) {
			const split = field.icon ? iconSplit( node, true ) : null;
			node.innerHTML = ( split ? split.prefix : '' ) + String( patch.text );
		}
		if ( undefined !== patch.url ) {
			if ( 'image' === field.kind ) {
				node.setAttribute( 'src', patch.url );
				// A new image makes the old responsive sizes wrong.
				node.removeAttribute( 'srcset' );
				node.removeAttribute( 'sizes' );
			} else {
				node.setAttribute( 'href', patch.url );
			}
		}
		if ( undefined !== patch.alt ) {
			node.setAttribute( 'alt', patch.alt );
		}
		return body.innerHTML;
	}

	/**
	 * Describes an element's shape, so repeated items can be recognised.
	 *
	 * @param {Element} node Element.
	 * @return {string} Shape signature.
	 */
	function shapeOf( node ) {
		return tagOf( node ) + '|' +
			Array.prototype.slice.call( node.classList ).sort().join( '.' ) + '|' +
			Array.prototype.map.call( node.children, tagOf ).join( ',' );
	}

	/**
	 * Finds repeatable lists: two or more siblings with the same shape,
	 * inside a ul/ol, or items with classes and inner elements (cards, team).
	 *
	 * @param {string} html Markup.
	 * @return {Array} Lists: { path, shape, items: [ path ], label, previews }.
	 */
	function detectLists( html ) {
		const body = parse( html );
		const lists = [];
		const used = {};

		function walk( parent, prefix ) {
			const kids = Array.prototype.slice.call( parent.children );
			const tag = tagOf( parent );
			const groups = {};
			let best = null;

			kids.forEach( function ( kid ) {
				const shape = shapeOf( kid );
				( groups[ shape ] = groups[ shape ] || [] ).push( kid );
			} );
			Object.keys( groups ).forEach( function ( shape ) {
				const group = groups[ shape ];
				const listy = 'ul' === tag || 'ol' === tag || ( group[ 0 ].classList.length > 0 && group[ 0 ].children.length > 0 );
				if ( group.length >= 2 && listy && ( ! best || group.length > best.group.length ) ) {
					best = { shape, group };
				}
			} );

			if ( best && prefix ) {
				let label = labelOf( parent, 'list' );
				label = LABELS.text === label ? LABELS.list.replace( '%s', tag.toUpperCase() ) : label;
				used[ label ] = ( used[ label ] || 0 ) + 1;
				if ( used[ label ] > 1 ) {
					label += ' ' + used[ label ];
				}
				lists.push( {
					path: prefix,
					shape: best.shape,
					label,
					items: best.group.map( ( item ) => prefix + '/' + kids.indexOf( item ) ),
					previews: best.group.map( function ( item ) {
						const text = item.textContent.replace( /\s+/g, ' ' ).trim();
						return text.length > 30 ? text.slice( 0, 29 ) + '…' : text;
					} ),
				} );
			}
			kids.forEach( function ( kid, index ) {
				const tagName = tagOf( kid );
				if ( SKIP_TAGS.indexOf( tagName ) === -1 && tagName.indexOf( '-' ) === -1 ) {
					walk( kid, prefix ? prefix + '/' + index : String( index ) );
				}
			} );
		}

		walk( body, '' );
		return lists;
	}

	/**
	 * Changes a list: duplicate, remove or move one item.
	 *
	 * Also reports where every child of the list moved, so editable fields
	 * can follow their elements exactly (see remapFields()).
	 *
	 * @param {string} html   Markup.
	 * @param {Object} list   List from detectLists().
	 * @param {number} index  Item index within the list.
	 * @param {string} action 'duplicate', 'remove', 'up' or 'down'.
	 * @return {Object} { html, moves }. moves maps old child index => [ new child indexes ].
	 */
	function listAction( html, list, index, action ) {
		const body = parse( html );
		const parent = nodeAt( body, list.path );
		const unchanged = { html, moves: null };

		if ( ! parent ) {
			return unchanged;
		}
		const items = Array.prototype.filter.call( parent.children, ( kid ) => shapeOf( kid ) === list.shape );
		const item = items[ index ];

		if ( ! item ) {
			return unchanged;
		}

		// Remember where each child was, so we can tell where it went.
		const kids = Array.prototype.slice.call( parent.children );
		kids.forEach( ( kid, i ) => kid.setAttribute( 'data-keh-was', i ) );

		if ( 'duplicate' === action ) {
			const space = item.previousSibling;
			item.after( item.cloneNode( true ) );
			// Copy the whitespace before the item too, so the markup stays tidy.
			if ( space && 3 === space.nodeType && ! space.textContent.trim() ) {
				item.after( space.cloneNode( true ) );
			}
		} else if ( 'remove' === action && items.length > 1 ) {
			if ( item.previousSibling && 3 === item.previousSibling.nodeType && ! item.previousSibling.textContent.trim() ) {
				item.previousSibling.remove();
			}
			item.remove();
		} else if ( 'up' === action && index > 0 ) {
			items[ index - 1 ].before( item );
		} else if ( 'down' === action && index < items.length - 1 ) {
			items[ index + 1 ].after( item );
		} else {
			return unchanged;
		}

		const moves = {};
		Array.prototype.forEach.call( parent.children, function ( kid, i ) {
			const was = kid.getAttribute( 'data-keh-was' );
			kid.removeAttribute( 'data-keh-was' );
			( moves[ was ] = moves[ was ] || [] ).push( i );
		} );
		return { html: body.innerHTML, moves };
	}

	/**
	 * Moves stored fields along with their elements after a list change.
	 *
	 * A duplicated item gets copies of its fields (same ticks).
	 * Fields of a removed item are dropped.
	 *
	 * @param {Array}  fields     Fields before the change.
	 * @param {string} parentPath Path of the list element.
	 * @param {Object} moves      From listAction().
	 * @return {Array} Fields after the change.
	 */
	function remapFields( fields, parentPath, moves ) {
		const prefix = parentPath + '/';
		const out = [];

		fields.forEach( function ( field ) {
			if ( 0 !== field.path.indexOf( prefix ) ) {
				out.push( field );
				return;
			}
			const rest = field.path.slice( prefix.length ).split( '/' );
			const targets = moves[ rest[ 0 ] ] || [];
			targets.forEach( function ( target ) {
				out.push( Object.assign( {}, field, {
					path: prefix + [ target ].concat( rest.slice( 1 ) ).join( '/' ),
				} ) );
			} );
		} );

		// Keep document order, so panels list parts top to bottom.
		return out.sort( function ( a, b ) {
			const pa = a.path.split( '/' ).map( Number );
			const pb = b.path.split( '/' ).map( Number );
			for ( let i = 0; i < Math.min( pa.length, pb.length ); i++ ) {
				if ( pa[ i ] !== pb[ i ] ) {
					return pa[ i ] - pb[ i ];
				}
			}
			return pa.length - pb.length;
		} );
	}

	/*
	 * Core slots (WordPress 7.1+): the Custom HTML block keeps static HTML and
	 * holds editable core blocks inside it. Only elements that a core block can
	 * save back exactly become slots; everything else stays static.
	 */
	const SLOT_BLOCKS = {
		p: 'core/paragraph',
		h1: 'core/heading',
		h2: 'core/heading',
		h3: 'core/heading',
		h4: 'core/heading',
		h5: 'core/heading',
		h6: 'core/heading',
	};

	// Inline formatting core's rich text keeps as it is (tag => allowed attributes).
	const SLOT_INLINE = {
		a: [ 'href', 'target', 'rel' ],
		br: [],
		code: [],
		em: [],
		kbd: [],
		s: [],
		strong: [],
		sub: [],
		sup: [],
	};

	/**
	 * Explains why a candidate cannot become a core slot.
	 *
	 * @param {Element} node      Element.
	 * @param {Object}  candidate Candidate from detect().
	 * @return {string} Reason code, or '' when it can become a slot.
	 */
	function slotProblem( node, candidate ) {
		if ( 'link' === candidate.kind ) {
			return 'link';
		}
		if ( 'image' === candidate.kind ) {
			return 'image';
		}
		if ( candidate.icon ) {
			return 'icon';
		}
		if ( ! SLOT_BLOCKS[ candidate.tag ] ) {
			return 'li' === candidate.tag ? 'list-item' : 'tag';
		}
		const extra = Array.prototype.some.call( node.attributes, ( attribute ) => 'class' !== attribute.name && 'id' !== attribute.name );
		if ( extra ) {
			return node.hasAttribute( 'style' ) ? 'inline-style' : 'attributes';
		}
		const inner = node.querySelectorAll( '*' );
		for ( let i = 0; i < inner.length; i++ ) {
			const allowed = SLOT_INLINE[ tagOf( inner[ i ] ) ];
			if ( ! allowed ) {
				return 'formatting';
			}
			const unknown = Array.prototype.some.call( inner[ i ].attributes, ( attribute ) => allowed.indexOf( attribute.name ) === -1 );
			if ( unknown ) {
				return 'formatting';
			}
		}
		return '';
	}

	/**
	 * Plans which parts become core slots.
	 *
	 * @param {string} html Markup.
	 * @return {Object} { slots: [ { path, label, name, attributes } ], skipped: [ { path, label, reason } ] }.
	 */
	function planSlots( html ) {
		const body = parse( html );
		const slots = [];
		const skipped = [];

		detect( html ).forEach( function ( candidate ) {
			const node = nodeAt( body, candidate.path );
			const reason = node ? slotProblem( node, candidate ) : 'tag';

			if ( reason ) {
				skipped.push( { path: candidate.path, label: candidate.label, reason } );
				return;
			}
			const attributes = { content: node.innerHTML.trim() };
			const classes = Array.prototype.filter.call( node.classList, ( name ) => 'wp-block-heading' !== name ).join( ' ' );

			if ( classes ) {
				attributes.className = classes;
			}
			if ( node.id ) {
				attributes.anchor = node.id;
			}
			if ( 'core/heading' === SLOT_BLOCKS[ candidate.tag ] ) {
				attributes.level = parseInt( candidate.tag.slice( 1 ), 10 );
			}
			slots.push( { path: candidate.path, label: candidate.label, name: SLOT_BLOCKS[ candidate.tag ], attributes } );
		} );
		return { slots, skipped };
	}

	/**
	 * Builds the inner markup of a Custom HTML block with core slots.
	 *
	 * @param {string}   html      Markup.
	 * @param {Array}    slots     From planSlots().
	 * @param {Function} serialize Receives a slot, returns its block markup.
	 * @return {string} Static HTML with serialized core blocks in place.
	 */
	function toSlotMarkup( html, slots, serialize ) {
		const body = parse( html );
		// Find every node first: replacing one changes the paths of the next.
		const nodes = slots.map( ( slot ) => nodeAt( body, slot.path ) );

		nodes.forEach( function ( node, index ) {
			if ( node ) {
				node.replaceWith( body.ownerDocument.createComment( 'keh-slot-' + index ) );
			}
		} );
		return body.innerHTML.replace( /<!--keh-slot-(\d+)-->/g, function ( match, index ) {
			return serialize( slots[ parseInt( index, 10 ) ] );
		} );
	}

	window.konradsEditableHtml = window.konradsEditableHtml || {};
	window.konradsEditableHtml.engine = {
		version: '0.1.0',
		labels: LABELS,
		parse,
		nodeAt,
		detect,
		toFields,
		mergeFields,
		read,
		write,
		kindOf,
		detectLists,
		listAction,
		remapFields,
		planSlots,
		toSlotMarkup,
	};
}( window ) );
