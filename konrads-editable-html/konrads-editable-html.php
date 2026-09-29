<?php
/**
 * Plugin Name:       Konrad's Editable HTML
 * Plugin URI:        https://github.com/konradbuilds/konrads-editable-html
 * Description:       Make your custom HTML client-editable in one click. Your layout stays exactly as built. No React, no npm, no build step.
 * Version:           0.1.0
 * Requires at least: 6.6
 * Requires PHP:      7.4
 * Author:            Konrad Sroka
 * Author URI:        https://konradbuilds.github.io
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       konrads-editable-html
 *
 * @package KonradsEditableHtml
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'KONRADS_EDITABLE_HTML_VERSION', '0.1.0' );

/**
 * Registers the shared scripts and the Editable HTML block.
 *
 * @since 0.1.0
 */
function konrads_editable_html_init() {
	wp_register_script(
		'konrads-editable-html-engine',
		plugins_url( 'assets/js/engine.js', __FILE__ ),
		array(),
		KONRADS_EDITABLE_HTML_VERSION,
		array( 'in_footer' => true )
	);

	wp_register_script(
		'konrads-editable-html-importer',
		plugins_url( 'assets/js/importer.js', __FILE__ ),
		array( 'wp-i18n' ),
		KONRADS_EDITABLE_HTML_VERSION,
		array( 'in_footer' => true )
	);

	/*
	 * Only people allowed to write raw HTML may set up or change the markup.
	 * Everyone who can edit the page can still edit the ticked parts.
	 */
	wp_add_inline_script(
		'konrads-editable-html-engine',
		'window.konradsEditableHtmlSettings = ' . wp_json_encode(
			array(
				'canEditHtml'   => current_user_can( 'unfiltered_html' ),
				'canUpdateCore' => current_user_can( 'update_core' ),
			)
		) . ';',
		'before'
	);

	register_block_type( __DIR__ . '/blocks/editable-html' );

	wp_set_script_translations( 'konrads-editable-html-importer', 'konrads-editable-html' );
	wp_set_script_translations( 'konrads-editable-html-editable-html-editor-script', 'konrads-editable-html' );
}
add_action( 'init', 'konrads_editable_html_init' );
