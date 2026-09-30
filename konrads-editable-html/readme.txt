=== Konrad's Editable HTML ===
Contributors:      konradS
Tags:              custom html, editable, blocks, patterns, templates
Requires at least: 6.6
Tested up to:      7.1
Requires PHP:      7.4
Stable tag:        0.2.0
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

HTML or page template section to editable block in 1 click. Paste one line back and clients can edit the text. No React, no npm, no build.

== Description ==

**Your custom HTML and page template parts, client-editable in one click.**

Your templates are full of sections clients can't touch. The hero, the intro block, the call to action - all sitting in PHP, so every small text change means a message to you. Move them out, one at a time.

Paste the markup into a Custom HTML block, click once, and the text is editable. Your layout stays exactly as you built it. Clients change only the parts you chose.

1. Add a Custom HTML block and paste your section, `<style>` included.
2. Click **Make editable** in the block toolbar.
3. Done. Headings and paragraphs can now be edited right on the page. Everything else stays as you wrote it.

Built on core blocks. Deactivate the plugin – your content stays. On 7.1+, it even stays editable.

= What you get =

* **One click.** Select your Custom HTML block, click **Make editable**.
* **Your layout, untouched.** The markup and CSS stay exactly as you wrote them.
* **You pick what's editable.** Headings, paragraphs, links, images, lists – tick what clients may change.
* **Core blocks on WordPress 7.1+.** Plain WordPress, no plugin needed to keep editing.
* **A fallback block on 6.6–7.0.** Same result on older sites.
* **Examples and import.** Start from a hero, cards, list or calculator, or import .html/.css/.js or a .zip.
* **Lock HTML.** Freeze the setup before hand-over.
* **No lock-in.** Deactivate the plugin – your pages look the same.
* **No React, no npm, no build step.** Plain PHP and JavaScript you can read.

= Get sections out of your page templates =

The part that really costs you time sits in `header.php` or a page template, not in a page. The way out:

1. **Patterns** in wp-admin: create a pattern and paste your section into a Custom HTML block.
2. Click **Make editable** and tick what clients may change.
3. Open **Use in a template** in the sidebar and click **Copy code**.
4. Paste that code into your template, in place of the old markup.

Done. The section looks exactly the same, and clients edit it under Patterns instead of messaging you.

The code it gives you is core WordPress - `get_page_by_path()` and `do_blocks()`, nothing of this plugin. It finds the pattern by slug, not by ID, so it survives a move from staging to live. Deactivate the plugin and the template keeps working.

= Who it's for =

* **Designers:** keep your own HTML and CSS. No page builder, no React.
* **Freelancers:** hand over sites clients can edit without breaking the design.
* **Agencies:** turn custom sections into editable content without a block build pipeline.
* **Clients:** click the text, type, save. That's it.

= Native first =

On WordPress 7.1 and newer, the Custom HTML block can hold editable core blocks inside static HTML. Konrad's Editable HTML finds the parts that can be edited and sets them up for you. The result is plain WordPress: headings and paragraphs are core blocks, no plugin needed to keep editing them.

Every conversion is checked by WordPress's own parser first. If anything would not work, nothing is changed.

On older WordPress (6.6 to 7.0), "Make editable" uses the plugin's lightweight Editable HTML block instead.

= Make all editable =

Links, images and lists can't be kept exactly by core's editable slots, so they stay fixed at first. Click **Make all editable** (in the message, or in the toolbar afterwards) and the Editable HTML block takes over:

* Text and links: type right on the page.
* Images: click to replace, alt text in the sidebar.
* Lists: move, duplicate, add and remove cards, team members or list items.
* Icons at the start of a line stay fixed; only the text is editable.
* Start with an example (hero, cards, list with icons, calculator), import files, or paste HTML.
* Import: pick your .html, .css and .js files, or a .zip (a CodePen export works). Files are read in your browser; nothing is uploaded.

= You stay in control =

* Tick exactly which parts clients can change. Everything else stays fixed.
* **Lock HTML** before hand-over: the setup tools disappear, so nobody changes the design by accident. Or leave it open for full flexibility.
* People who can add custom HTML (usually administrators and editors) set up blocks. Everyone who can edit the page can change the editable parts.

= No lock-in =

Both modes save finished HTML into the page. Deactivate or delete the plugin and your pages look exactly the same.

= Try it in 5 minutes =

Open the live demo in your browser, no install: [Try it live](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/konradbuilds/konrads-editable-html/main/blueprint.json)

= Free and open source =

Code, issues and ideas on [GitHub](https://github.com/konradbuilds/konrads-editable-html). If it saves you time, a GitHub star or a review here helps others find it.

Built by Konrad Sroka and Claude AI.

Thanks, WordPress community.

== Installation ==

1. Plugins → Add New → search for "Konrad's Editable HTML", or upload the zip.
2. Activate.
3. Select a Custom HTML block and click **Make editable**.

== Frequently Asked Questions ==

= Do I need Node, npm or React? =

No. The plugin is plain PHP and JavaScript. There is nothing to build.

= Do I need a block theme? =

No. It works with classic and block themes, anywhere the block editor works.

= Does my JavaScript run in the editor? =

No. Scripts in your HTML only run on the front end, like in the Custom HTML block.

= Can Authors and Contributors edit these blocks? =

They can change the editable parts. In the Editable HTML block, WordPress removes custom HTML such as `<style>` when people without the "unfiltered_html" capability save a page. The block warns them. Core's editable slots (WordPress 7.1+) don't have this problem for the text itself.

= What happens to my CSS? =

It stays in your HTML, exactly as written. Selectors without a class (for example `h1 { }`) affect the whole page, so prefer class names.

= What happens if I deactivate the plugin? =

Your pages look exactly the same. On WordPress 7.1+, headings and paragraphs made editable with core slots stay editable. Editable HTML blocks keep their HTML; WordPress offers to keep them as Custom HTML.

= Can I use this in a theme template, not just on a page? =

Yes. Build the section as a pattern, then copy the template code from the **Use in a template** panel and paste it into your template file. The code uses core functions only.

= Does the pattern have to be synced? =

No. A template always shows the pattern as you edit it under Patterns, synced or not. The difference only shows up inside posts: a copy of an unsynced pattern placed in a post is separate, so edits made there never reach the template. The panel says so when a pattern is unsynced.

= The pattern looks plain in the editor =

Your theme's CSS is not loaded there. Classic themes need `add_editor_style( 'style.css' );` in `functions.php`. Block themes load their styles already.

== Changelog ==

= 0.2.0 =
* New: **Use in a template** panel in the pattern editor. Copy one line of core PHP and render the pattern from a theme template.
* New: a note when the pattern is not synced, so nobody expects edits made inside a post to reach the template.
* New: a hint when the theme loads no editor styles.

= 0.1.0 =
* First public release.
* WordPress 7.1+: "Make editable" turns headings and paragraphs into WordPress's own editable slots.
* "Make all editable": the Editable HTML block for links, images and lists.
* Older WordPress (6.6+): the Editable HTML block right away.
* Examples, file and .zip import, Lock HTML, alt text check.

===== FILE: konrads-editable-html/blocks/editable-html/block.json =====
