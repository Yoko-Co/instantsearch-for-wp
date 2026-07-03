---
sidebar_position: 0
---

# Overview

Welcome to the official documentation for the Yoko Core plugin.

## AI Integration Instructions

Use this guide for theme/plugin integration work involving custom facets and custom Algolia record fields:

- [AI Agent Integrations](./ai-agent-integrations.md)
- [SiteSearch Filters](./sitesearch-filters.md)

## How to create new documentation.

1. The Docusaurus blog is the changelog (in the `/blog` folder).
2. The `/docs` folder holds organized documentation about key functionality.

## Adding to Changelog

The changelog allows us to quickly update team members about new features via RSS feeds in Slack. In order to make the changelog as useful as possible, please follow these guidelines:

1. Set the metadata of the blog post with the following information:
	1. **Title**: Start with the version number and add a summary
	2. **Slug**: Make a slug with the version number first
	3. **Authors**: Add the individuals who contributed to this update
	4. **Tags**: Add tags for the feature sets that these updates relate to

```
---
title: 1.9.2 Docusaurus Documentation!
slug: 1-9-2-documentation
authors: [konstantin, leo]
tags: [new-feature, bug-fix, cpt-sync]
---
```

2. Add a single line written summary of the release's features. Even if it is multiple sentences, keep it as one line so that the whole thing shows up in the RSS feed which is broadcast to the team.
3. Add a single line summary in a numbered list at the top of the post with a contextual prefix in square brackets ex. `[BEAVER BUILDER]` and add appropriate links to any functionality.
4. Add any extended context and information about the line item below the `<!-- truncate -->` line so that anyone interested can read more.