<?php
/**
 * The "How to use" page, its link on the Plugins screen, and the welcome notice.
 *
 * The page has no menu item on purpose: people who never need it should not
 * see it. It is reached from the plugin row and from the welcome notice.
 *
 * @since 0.3.0
 *
 * @package KonradsEditableHtml
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/help-page.php';

/**
 * Returns the URL of the pattern list screen.
 *
 * Always the list screen, never the site editor: the "Use in a template"
 * panel lives in the post editor, which is what the list screen opens.
 * Core links block themes to the site editor instead, so this page gives
 * everyone the screen the plugin actually works on.
 *
 * @since 0.3.0
 *
 * @return string Admin URL.
 */
function konrads_editable_html_patterns_url() {
	return admin_url( 'edit.php?post_type=wp_block' );
}

/**
 * Returns the URL of the "How to use" page.
 *
 * @since 0.3.0
 *
 * @return string Admin URL.
 */
function konrads_editable_html_help_url() {
	return admin_url( 'tools.php?page=konrads-editable-html-help' );
}

/**
 * Registers the "How to use" page and hides it from the menu.
 *
 * @since 0.3.0
 */
function konrads_editable_html_add_help_page() {
	add_submenu_page(
		'tools.php',
		__( 'Konrad&#8217;s Editable HTML', 'konrads-editable-html' ),
		__( 'Konrad&#8217;s Editable HTML', 'konrads-editable-html' ),
		'edit_theme_options',
		'konrads-editable-html-help',
		'konrads_editable_html_render_help_page'
	);

	remove_submenu_page( 'tools.php', 'konrads-editable-html-help' );
}
add_action( 'admin_menu', 'konrads_editable_html_add_help_page' );

/**
 * Loads the page's styles, on that page only.
 *
 * @since 0.3.0
 *
 * @param string $hook_suffix Current admin page.
 */
function konrads_editable_html_help_styles( $hook_suffix ) {
	if ( 'tools_page_konrads-editable-html-help' !== $hook_suffix ) {
		return;
	}

	wp_enqueue_style(
		'konrads-editable-html-help',
		plugins_url( 'help.css', __FILE__ ),
		array(),
		KONRADS_EDITABLE_HTML_VERSION
	);
}
add_action( 'admin_enqueue_scripts', 'konrads_editable_html_help_styles' );

/**
 * Adds a "How to use" link to the plugin's row on the Plugins screen.
 *
 * @since 0.3.0
 *
 * @param string[] $links Existing action links.
 * @return string[] Links with ours added.
 */
function konrads_editable_html_plugin_row_link( $links ) {
	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return $links;
	}

	$link = sprintf(
		'<a href="%1$s">%2$s</a>',
		esc_url( konrads_editable_html_help_url() ),
		esc_html__( 'How to use', 'konrads-editable-html' )
	);

	array_unshift( $links, $link );

	return $links;
}

/**
 * Sends the user to the "How to use" page once, right after activation.
 *
 * Skipped on bulk and network activation, where a redirect would interrupt
 * someone activating several plugins at once. The welcome notice on the
 * Plugins screen covers those cases instead.
 *
 * @since 0.4.0
 */
function konrads_editable_html_welcome_redirect() {
	if ( ! get_option( 'konrads_editable_html_welcome' ) ) {
		return;
	}

	if ( wp_doing_ajax() || is_network_admin() ) {
		return;
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading core's own activation flag, nothing is changed.
	if ( isset( $_GET['activate-multi'] ) ) {
		return;
	}

	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return;
	}

	delete_option( 'konrads_editable_html_welcome' );

	wp_safe_redirect( konrads_editable_html_help_url() );
	exit;
}
add_action( 'admin_init', 'konrads_editable_html_welcome_redirect' );

/**
 * Shows the welcome notice once, on the Plugins screen.
 *
 * @since 0.3.0
 */
function konrads_editable_html_welcome_notice() {
	$screen = get_current_screen();

	if ( ! $screen || 'plugins' !== $screen->id ) {
		return;
	}

	if ( ! current_user_can( 'edit_theme_options' ) || ! get_option( 'konrads_editable_html_welcome' ) ) {
		return;
	}

	$dismiss_url = wp_nonce_url(
		add_query_arg( 'konrads-editable-html-dismiss', '1', admin_url( 'plugins.php' ) ),
		'konrads-editable-html-dismiss'
	);

	printf(
		'<div class="notice notice-info"><p>%1$s <a href="%2$s">%3$s</a> <a href="%4$s" class="alignright">%5$s</a></p></div>',
		esc_html__( 'Konrad&#8217;s Editable HTML is ready.', 'konrads-editable-html' ),
		esc_url( konrads_editable_html_help_url() ),
		esc_html__( 'See how it works', 'konrads-editable-html' ),
		esc_url( $dismiss_url ),
		esc_html__( 'Dismiss', 'konrads-editable-html' )
	);
}
add_action( 'admin_notices', 'konrads_editable_html_welcome_notice' );

/**
 * Removes the welcome notice for good when it is dismissed.
 *
 * @since 0.3.0
 */
function konrads_editable_html_dismiss_welcome() {
	if ( ! isset( $_GET['konrads-editable-html-dismiss'] ) ) {
		return;
	}

	check_admin_referer( 'konrads-editable-html-dismiss' );

	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return;
	}

	delete_option( 'konrads_editable_html_welcome' );

	wp_safe_redirect( admin_url( 'plugins.php' ) );
	exit;
}
add_action( 'load-plugins.php', 'konrads_editable_html_dismiss_welcome' );
