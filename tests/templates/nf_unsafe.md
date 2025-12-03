---
id: test-danger-advanced
title: Advanced Dangerous Content Test
subtitle: tests
---

# Advanced Dangerous Content Test

<script>alert('Script tag XSS');</script>

<iframe src="javascript:alert('Iframe XSS')"></iframe>

<object data="javascript:alert('Object XSS')"></object>

<img src="x" onerror="alert('Image error!')" />

![Dangerous Image](javascript:alert('Markdown Image XSS'))

<a href="javascript:alert('Link XSS')">Dangerous Link</a>

<div onclick="alert('Div XSS')">Click me</div>

<style>
body { background: pink; }
</style>

<!-- Safe content below -->
**This part should remain after sanitization.**