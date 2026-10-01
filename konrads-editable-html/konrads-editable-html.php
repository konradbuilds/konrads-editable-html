<?php
/**
 * Plugin Name:       Konrad's Editable HTML
 * Plugin URI:        https://github.com/konradbuilds/konrads-editable-html
 * Description:       HTML or page template section to editable block in 1 click. Paste one line back and clients can edit the text. No React, no npm, no build.
 * Version:           0.4.0
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

define( 'KONRADS_EDITABLE_HTML_VERSION', '0.4.0' );

if ( is_admin() ) {
	require_once __DIR__ . '/admin/help.php';

	add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), 'konrads_editable_html_plugin_row_link' );
}

/**
 * Remembers that the plugin was just activated, so the welcome notice shows once.
 *
 * @since 0.3.0
 */
function konrads_editable_html_activate() {
	add_option( 'konrads_editable_html_welcome', '1' );
}
register_activation_hook( __FILE__, 'konrads_editable_html_activate' );

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

	konrads_editable_html_register_template_snippet();

	wp_set_script_translations( 'konrads-editable-html-importer', 'konrads-editable-html' );
	wp_set_script_translations( 'konrads-editable-html-template-snippet', 'konrads-editable-html' );
	wp_set_script_translations( 'konrads-editable-html-pattern-panel', 'konrads-editable-html' );
	wp_set_script_translations( 'konrads-editable-html-editable-html-editor-script', 'konrads-editable-html' );
}
add_action( 'init', 'konrads_editable_html_init' );

/**
 * Registers the "Use in a template" panel shown in the pattern editor.
 *
 * @since 0.2.0
 */
function konrads_editable_html_register_template_snippet() {
	wp_register_script(
		'konrads-editable-html-snippet',
		plugins_url( 'assets/js/snippet.js', __FILE__ ),
		array(),
		KONRADS_EDITABLE_HTML_VERSION,
		array( 'in_footer' => true )
	);

	wp_register_script(
		'konrads-editable-html-template-snippet',
		plugins_url( 'assets/js/template-snippet.js', __FILE__ ),
		array(
			'konrads-editable-html-snippet',
			'wp-components',
			'wp-data',
			'wp-editor',
			'wp-element',
			'wp-i18n',
			'wp-notices',
			'wp-plugins',
		),
		KONRADS_EDITABLE_HTML_VERSION,
		array( 'in_footer' => true )
	);

	wp_register_script(
		'konrads-editable-html-pattern-panel',
		plugins_url( 'assets/js/pattern-panel.js', __FILE__ ),
		array(
			'konrads-editable-html-snippet',
			'wp-block-editor',
			'wp-components',
			'wp-compose',
			'wp-data',
			'wp-element',
			'wp-hooks',
			'wp-i18n',
			'wp-notices',
		),
		KONRADS_EDITABLE_HTML_VERSION,
		array( 'in_footer' => true )
	);

	wp_register_style(
		'konrads-editable-html-template-snippet',
		plugins_url( 'assets/css/template-snippet.css', __FILE__ ),
		array(),
		KONRADS_EDITABLE_HTML_VERSION
	);

	/*
	 * Block themes always style the editor. Classic themes only do when they
	 * call add_editor_style(). Without it the pattern looks plainer here than
	 * on the front end, so the panel says so.
	 */
	wp_add_inline_script(
		'konrads-editable-html-template-snippet',
		'window.konradsEditableHtmlTemplate = ' . wp_json_encode(
			array(
				'hasEditorStyles' => wp_is_block_theme() || current_theme_supports( 'editor-styles' ),
			)
		) . ';',
		'before'
	);
}

/**
 * Loads the panel on the pattern editor screen only.
 *
 * @since 0.2.0
 */
function konrads_editable_html_enqueue_template_snippet() {
	wp_enqueue_script( 'konrads-editable-html-pattern-panel' );
	wp_enqueue_style( 'konrads-editable-html-template-snippet' );

	if ( ! function_exists( 'get_current_screen' ) ) {
		return;
	}

	$screen = get_current_screen();

	if ( ! $screen || 'wp_block' !== $screen->post_type ) {
		return;
	}

	wp_enqueue_script( 'konrads-editable-html-template-snippet' );
}
add_action( 'enqueue_block_editor_assets', 'konrads_editable_html_enqueue_template_snippet' );
