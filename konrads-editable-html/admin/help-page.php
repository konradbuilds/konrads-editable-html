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
	?>
	<div class="wrap keh-help">

		<div class="keh-hero">
			<p class="keh-hero__eyebrow"><?php esc_html_e( 'Konrad&#8217;s Editable HTML', 'konrads-editable-html' ); ?></p>
			<h1 class="keh-hero__title"><?php esc_html_e( 'Your HTML, editable by your clients', 'konrads-editable-html' ); ?></h1>
			<p class="keh-hero__lead">
				<?php esc_html_e( 'Two ways to use it. Both keep your layout exactly as you built it. No React, no npm, no build step.', 'konrads-editable-html' ); ?>
			</p>
		</div>

		<div class="keh-cards">

			<section class="keh-card">
				<p class="keh-card__kicker"><?php esc_html_e( 'The section sits on a page', 'konrads-editable-html' ); ?></p>
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
				<p class="keh-card__kicker"><?php esc_html_e( 'The section is stuck in a PHP template', 'konrads-editable-html' ); ?></p>
				<h2 class="keh-card__title"><?php esc_html_e( 'Move it out into a pattern', 'konrads-editable-html' ); ?></h2>
				<ol class="keh-steps">
					<li>
						<?php
						printf(
							/* translators: %s: link to the pattern screen, link text "Patterns". */
							esc_html__( 'Open %s and add a new one.', 'konrads-editable-html' ),
							'<a href="' . esc_url( $patterns_url ) . '">' . esc_html__( 'Patterns', 'konrads-editable-html' ) . '</a>'
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
				<p class="keh-card__outcome"><?php esc_html_e( 'Clients edit the pattern. Your template stays one line long.', 'konrads-editable-html' ); ?></p>
				<p class="keh-card__foot"><?php esc_html_e( 'For classic and hybrid themes, which have PHP templates.', 'konrads-editable-html' ); ?></p>
			</section>

		</div>

		<section class="keh-panel keh-panel--accent">
			<h2 class="keh-panel__title"><?php esc_html_e( 'Can&#8217;t find the Patterns screen?', 'konrads-editable-html' ); ?></h2>
			<p class="keh-panel__intro"><?php esc_html_e( 'Four ways in, in order of speed.', 'konrads-editable-html' ); ?></p>
			<ul class="keh-list">
				<li>
					<?php
					printf(
						/* translators: %s: link to the pattern screen, link text "Open it directly". */
						esc_html__( '%s. That is the screen this plugin works on.', 'konrads-editable-html' ),
						'<a class="keh-link" href="' . esc_url( $patterns_url ) . '">' . esc_html__( 'Open it directly', 'konrads-editable-html' ) . '</a>'
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
				<h2 class="keh-panel__title"><?php esc_html_e( 'Keep out of the markup', 'konrads-editable-html' ); ?></h2>
				<ul class="keh-list">
					<li><?php esc_html_e( 'PHP. Patterns hold content, not code.', 'konrads-editable-html' ); ?></li>
					<li><?php esc_html_e( 'CSS and JavaScript. Keep them in your theme, where they belong and stay cached.', 'konrads-editable-html' ); ?></li>
				</ul>
				<p class="keh-panel__note"><?php esc_html_e( 'WordPress removes style and script tags when someone without the unfiltered_html capability saves.', 'konrads-editable-html' ); ?></p>
			</section>

			<section class="keh-panel">
				<h2 class="keh-panel__title"><?php esc_html_e( 'Good to know', 'konrads-editable-html' ); ?></h2>
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
				<span class="keh-tile__title"><?php esc_html_e( 'Plugin page', 'konrads-editable-html' ); ?></span>
				<span class="keh-tile__note"><?php esc_html_e( 'Support forum and reviews', 'konrads-editable-html' ); ?></span>
			</a>
			<a class="keh-tile" href="https://github.com/konradbuilds/konrads-editable-html">
				<span class="keh-tile__title"><?php esc_html_e( 'GitHub', 'konrads-editable-html' ); ?></span>
				<span class="keh-tile__note"><?php esc_html_e( 'Read the code, report an issue', 'konrads-editable-html' ); ?></span>
			</a>
			<a class="keh-tile" href="https://konradbuilds.github.io">
				<span class="keh-tile__title"><?php esc_html_e( 'More free tools', 'konrads-editable-html' ); ?></span>
				<span class="keh-tile__note"><?php esc_html_e( 'Built by Konrad Sroka', 'konrads-editable-html' ); ?></span>
			</a>
		</nav>

	</div>
	<?php
}
