# Konrad's Editable HTML

**HTML or page template section to editable block in 1 click.**
Paste one line back and clients can edit the text. Your layout stays exactly as built. No React, no npm, no build.

[**▶ Try it live in your browser**](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/konradbuilds/konrads-editable-html/main/blueprint.json) — opens WordPress with the plugin and a demo page. Nothing to install.

## How it works

1. Add a **Custom HTML** block and paste your section, `<style>` included.
2. Click **Make editable** in the block toolbar.
3. Done. Headings and paragraphs are editable right on the page. Everything else stays exactly as you wrote it.

Built on core blocks. Deactivate the plugin – your content stays. On 7.1+, it even stays editable.

## Get sections out of your page templates

Your templates are full of sections clients can't touch. The hero, the intro, the call to action – all sitting in PHP. Move them out, one at a time:

1. **Patterns** in wp-admin → new pattern → Custom HTML block → paste your section.
2. **Make editable**, tick what clients may change.
3. Sidebar → **Use in a template** → **Copy code**.
4. Paste it into your template in place of the old markup.

You get core WordPress, nothing of this plugin:

```php
<?php
// Pattern: hero-home (edit it under Patterns in wp-admin).
$keh_pattern = get_page_by_path( 'hero-home', OBJECT, 'wp_block' );
if ( $keh_pattern instanceof WP_Post && 'publish' === $keh_pattern->post_status ) {
	echo do_blocks( '<!-- wp:block {"ref":' . (int) $keh_pattern->ID . '} /-->' );
} elseif ( current_user_can( 'edit_theme_options' ) ) {
	echo '<!-- Pattern "hero-home" not found. -->';
}
?>
```

By slug, not by ID – it survives the move from staging to live.

## Native first

- **WordPress 7.1+:** uses core's own editable slots inside the Custom HTML block. The result is plain WordPress.
- **Make all editable:** links, images and lists switch to the plugin's Editable HTML block (plus growing lists, icons, import, Lock HTML).
- **WordPress 6.6–7.0:** the Editable HTML block right away.

## Why

Designers and front-end developers write HTML and CSS. Clients want to change the text. Custom blocks usually mean npm, React and a build step. This plugin skips all of that.

- **No lock-in:** pages save finished HTML. Deactivate the plugin and nothing changes on the front end.
- **No build:** plain PHP and JavaScript, readable, WordPress Coding Standards.
- **Safe:** the editor never runs pasted scripts; every conversion is checked by WordPress's own parser first.

## Install

- **wordpress.org:** [Konrad's Editable HTML](https://wordpress.org/plugins/konrads-editable-html).
- **Or:** download the latest `konrads-editable-html` zip from [Releases](../../releases) → WordPress → Plugins → Add New → Upload.

## Repository

| Folder | What |
|---|---|
| `konrads-editable-html/` | The plugin |
| `blueprint.json` | The "Try it live" demo (WordPress Playground) |
| `.wordpress-org/` | Icon and banner for wordpress.org |

## Status

Early release (0.1.x). Feedback welcome in [Issues](../../issues).

If it saves you time, a ⭐ helps others find it. Thanks, WordPress community.

## Credits

Built by [Konrad Sroka](https://konradbuilds.github.io) and Claude AI.

## License

GPL-2.0-or-later.

