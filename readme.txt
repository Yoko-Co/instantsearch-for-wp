=== InstantSearch for WP Plugin ===
Contributors: konstantinbrazhnik
Requires at least: 4.5
Tested up to: 6.2.2
Requires PHP: 8.0
Stable tag: 1.0.1

This plugin is a set of Gutenberg Blocks of InstantSearch.js widgets.

== Description ==

This is the long description.

== Installation ==

Install Yoko Core just like you would any other WordPress plugin.

Install the Git Updater plugin for plugin updates.


== Privacy Policy ==

Yoko Core uses [Appsero](https://appsero.com) SDK to collect some telemetry data upon user's confirmation. This helps us to troubleshoot problems faster & make product improvements.

Appsero SDK **does not gather any data by default.** The SDK only starts gathering basic telemetry data **when a user allows it via the admin notice**. We collect the data to ensure a great user experience for all our users.

Integrating Appsero SDK **DOES NOT IMMEDIATELY** start gathering data, **without confirmation from users in any case.**

Learn more about how [Appsero collects and uses this data](https://appsero.com/privacy-policy/).

== Frequently Asked Questions ==

== Screenshots ==

1. This screen shot description corresponds to screenshot-1.(png|jpg|jpeg|gif). Note that the screenshot is taken from
the /assets directory or the directory that contains the stable readme.txt (tags or trunk). Screenshots in the /assets
directory take precedence. For example, `/assets/screenshot-1.png` would win over `/tags/4.3/screenshot-1.png`
(or jpg, jpeg, gif).
2. This is the second screen shot

== Changelog ==

= 1.0.1 =
* Fix: Prevent a PHP warning ("Attempt to read property \"name\" on null") when deleting posts from the Algolia index without an explicit index. `delete_posts()` now falls back to the default index, matching `index_posts()`.

= 1.0.0 =
* Initial Launch
