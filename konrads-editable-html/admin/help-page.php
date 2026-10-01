<?php
/**
 * Markup of the "How to use" page.
 *
 * @since 0.3.0
 *
 * @package KonradsEditableHtml
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Renders the "How to use" page.
 *
 * @since 0.3.0
 */
function konrads_editable_html_render_help_page() {
	if ( ! current_user_can( 'edit_theme_options' ) ) {
		return;
	}

	$patterns_url = konrads_editable_html_patterns_url();
	$new_pattern  = add_query_arg( 'post_type', 'wp_block', admin_url( 'post-new.php' ) );
	?>
	<div class="wrap keh-help">

		<header class="keh-hero">
			<p class="keh-badge"><?php esc_html_e( 'Konrad&#8217;s Editable HTML', 'konrads-editable-html' ); ?></p>
			<h1 class="keh-hero__title"><?php esc_html_e( 'How to use', 'konrads-editable-html' ); ?></h1>
			<p class="keh-hero__lead"><?php esc_html_e( 'Two ways in. Both keep your layout exactly as you built it.', 'konrads-editable-html' ); ?></p>
		</header>

		<div class="keh-cards">

			<section class="keh-card">
				<p class="keh-card__kicker">
					<span class="keh-card__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"/><path d="M7.5 9h9"/><path d="M7.5 12.5h9"/><path d="M7.5 16h5"/></svg>
					</span>
					<?php esc_html_e( 'When editing a post or page', 'konrads-editable-html' ); ?>
				</p>
				<h2 class="keh-card__title"><?php esc_html_e( 'Make a Custom HTML block editable', 'konrads-editable-html' ); ?></h2>
				<ol class="keh-steps">
					<li><?php esc_html_e( 'Add a Custom HTML block and paste your section.', 'konrads-editable-html' ); ?></li>
					<li>
						<?php
						printf(
							/* translators: %s: name of the toolbar button, "Make editable". */
							esc_html__( 'Click %s in the block toolbar.', 'konrads-editable-html' ),
							'<strong>' . esc_html__( 'Make editable', 'konrads-editable-html' ) . '</strong>'
						);
						?>
					</li>
					<li><?php esc_html_e( 'Tick the parts clients may change.', 'konrads-editable-html' ); ?></li>
					<li>
						<?php
						printf(
							/* translators: %s: name of the sidebar button, "Lock HTML". */
							esc_html__( 'Click %s before you hand the site over.', 'konrads-editable-html' ),
							'<strong>' . esc_html__( 'Lock HTML', 'konrads-editable-html' ) . '</strong>'
						);
						?>
					</li>
				</ol>
				<p class="keh-card__outcome"><?php esc_html_e( 'Clients click the text and type. Nothing else moves.', 'konrads-editable-html' ); ?></p>
			</section>

			<section class="keh-card">
				<p class="keh-card__kicker">
					<span class="keh-card__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m8.5 8.5-4 3.5 4 3.5"/><path d="m15.5 8.5 4 3.5-4 3.5"/><path d="m13.5 5-3 14"/></svg>
					</span>
					<?php esc_html_e( 'When the section sits in a PHP template', 'konrads-editable-html' ); ?>
				</p>
				<h2 class="keh-card__title"><?php esc_html_e( 'Move it out into a pattern', 'konrads-editable-html' ); ?></h2>
				<ol class="keh-steps">
					<li>
						<?php
						printf(
							/* translators: %s: link to the pattern screen, link text "all your patterns". */
							esc_html__( 'Add a new pattern. Here are %s.', 'konrads-editable-html' ),
							'<a href="' . esc_url( $patterns_url ) . '">' . esc_html__( 'all your patterns', 'konrads-editable-html' ) . '</a>'
						);
						?>
					</li>
					<li><?php esc_html_e( 'Add a Custom HTML block and paste the markup from your template.', 'konrads-editable-html' ); ?></li>
					<li>
						<?php
						printf(
							/* translators: %s: name of the toolbar button, "Make editable". */
							esc_html__( 'Click %s, tick the parts, lock the HTML.', 'konrads-editable-html' ),
							'<strong>' . esc_html__( 'Make editable', 'konrads-editable-html' ) . '</strong>'
						);
						?>
					</li>
					<li>
						<?php
						printf(
							/* translators: 1: name of the sidebar panel, "Use in a template". 2: name of the button, "Copy code". */
							esc_html__( 'Save. Then open %1$s in the sidebar and click %2$s.', 'konrads-editable-html' ),
							'<strong>' . esc_html__( 'Use in a template', 'konrads-editable-html' ) . '</strong>',
							'<strong>' . esc_html__( 'Copy code', 'konrads-editable-html' ) . '</strong>'
						);
						?>
					</li>
					<li><?php esc_html_e( 'Paste that code into your template, in place of the old markup.', 'konrads-editable-html' ); ?></li>
				</ol>
				<p class="keh-card__outcome"><?php esc_html_e( 'Clients edit the pattern. Your template stays.', 'konrads-editable-html' ); ?></p>
				<p class="keh-card__action">
					<a class="button button-primary button-hero" href="<?php echo esc_url( $new_pattern ); ?>"><?php esc_html_e( 'Create a new pattern', 'konrads-editable-html' ); ?></a>
				</p>
				<p class="keh-card__foot"><?php esc_html_e( 'For classic and hybrid themes, which have PHP templates.', 'konrads-editable-html' ); ?></p>
			</section>

		</div>

		<section class="keh-panel keh-panel--accent">
			<h2 class="keh-panel__title">
				<span class="keh-panel__icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.6a2.3 2.3 0 1 1 3 2.2v1.4"/><path d="M12.8 16.3h-1.6"/></svg>
				</span>
				<?php esc_html_e( 'Can&#8217;t find the Patterns screen?', 'konrads-editable-html' ); ?>
			</h2>
			<ul class="keh-list">
				<li>
					<?php
					printf(
						/* translators: %s: link to the pattern screen, link text "Open it directly". */
						esc_html__( '%s. That is the screen this plugin works on.', 'konrads-editable-html' ),
						'<a href="' . esc_url( $patterns_url ) . '">' . esc_html__( 'Open it directly', 'konrads-editable-html' ) . '</a>'
					);
					?>
				</li>
				<li><?php esc_html_e( 'On a block theme, Appearance &rarr; Patterns opens the site editor instead. Use the link above.', 'konrads-editable-html' ); ?></li>
				<li><?php esc_html_e( 'The menu needs the edit_theme_options capability. Editors and authors do not have it.', 'konrads-editable-html' ); ?></li>
				<li><?php esc_html_e( 'Or start in the post editor: select your blocks, open the options menu, choose Create pattern.', 'konrads-editable-html' ); ?></li>
			</ul>
		</section>

		<div class="keh-panels">

			<section class="keh-panel">
				<h2 class="keh-panel__title">
					<span class="keh-panel__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M12 3.5 5 6v5.5c0 4 3 7.3 7 9 4-1.7 7-5 7-9V6z"/><path d="M12 9v3.5"/><path d="M12 15.4h.01"/></svg>
					</span>
					<?php esc_html_e( 'Keep out of the markup', 'konrads-editable-html' ); ?>
				</h2>
				<ul class="keh-list">
					<li><?php esc_html_e( 'PHP. Patterns hold content, not code.', 'konrads-editable-html' ); ?></li>
					<li><?php esc_html_e( 'CSS and JavaScript. Keep them in your theme, where they belong and stay cached.', 'konrads-editable-html' ); ?></li>
				</ul>
				<p class="keh-panel__note"><?php esc_html_e( 'WordPress removes style and script tags when someone without the unfiltered_html capability saves.', 'konrads-editable-html' ); ?></p>
			</section>

			<section class="keh-panel">
				<h2 class="keh-panel__title">
					<span class="keh-panel__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M9.5 18h5"/><path d="M10.2 20.5h3.6"/><path d="M12 3.5a5.5 5.5 0 0 1 3.3 9.9c-.5.4-.8 1-.8 1.6H9.5c0-.6-.3-1.2-.8-1.6A5.5 5.5 0 0 1 12 3.5"/></svg>
					</span>
					<?php esc_html_e( 'Good to know', 'konrads-editable-html' ); ?>
				</h2>
				<ul class="keh-list">
					<li><?php esc_html_e( 'On WordPress 7.1 and newer, Make editable uses core&#8217;s own editable slots. The result is plain WordPress.', 'konrads-editable-html' ); ?></li>
					<li><?php esc_html_e( 'Deactivate the plugin and your pages look exactly the same.', 'konrads-editable-html' ); ?></li>
					<li><?php esc_html_e( 'The template code finds the pattern by slug, so it survives a move from staging to live.', 'konrads-editable-html' ); ?></li>
					<li><?php esc_html_e( 'Delete the pattern and the template renders nothing. No error on the front end.', 'konrads-editable-html' ); ?></li>
				</ul>
			</section>

		</div>

		<nav class="keh-links" aria-label="<?php esc_attr_e( 'More about this plugin', 'konrads-editable-html' ); ?>">
			<a class="keh-tile" href="https://wordpress.org/plugins/konrads-editable-html/">
				<span class="keh-tile__head">
					<span class="keh-tile__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4.5 5.5h15v10h-9l-4 3.5v-3.5h-2z"/><path d="M8.5 10h7"/></svg>
					</span>
					<span class="keh-tile__title"><?php esc_html_e( 'Plugin page', 'konrads-editable-html' ); ?></span>
				</span>
				<span class="keh-tile__note"><?php esc_html_e( 'Support forum and reviews', 'konrads-editable-html' ); ?></span>
			</a>
			<a class="keh-tile" href="https://github.com/konradbuilds/konrads-editable-html">
				<span class="keh-tile__head">
					<span class="keh-tile__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="7" cy="6.5" r="2.2"/><circle cx="7" cy="17.5" r="2.2"/><circle cx="17" cy="9" r="2.2"/><path d="M7 8.7v6.6"/><path d="M17 11.2c0 2.6-2.1 4.1-5 4.4"/></svg>
					</span>
					<span class="keh-tile__title"><?php esc_html_e( 'GitHub', 'konrads-editable-html' ); ?></span>
				</span>
				<span class="keh-tile__note"><?php esc_html_e( 'Read the code, report an issue', 'konrads-editable-html' ); ?></span>
			</a>
			<a class="keh-tile" href="https://konradbuilds.github.io">
				<span class="keh-tile__head">
					<span class="keh-tile__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M9.8 7.8v8.4"/><path d="M14.6 7.8 9.8 12.2"/><path d="m11.7 10.5 3.1 5.7"/></svg>
					</span>
					<span class="keh-tile__title"><?php esc_html_e( 'More free tools', 'konrads-editable-html' ); ?></span>
				</span>
				<span class="keh-tile__note"><?php esc_html_e( 'Built by Konrad Sroka', 'konrads-editable-html' ); ?></span>
			</a>
		</nav>

		<p class="keh-footnote"><?php esc_html_e( 'Where to find this page again: Plugins screen, in this plugin&#8217;s row, next to Deactivate.', 'konrads-editable-html' ); ?></p>

	</div>
	<?php
}
