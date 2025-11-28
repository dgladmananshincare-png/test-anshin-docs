---
id: safe-file
title: safe file
---
## SQL injection attempt
本文'; DROP TABLE users; --

## Inline JavaScript (XSS)
<img src="x" onerror="alert('XSS')">
<script>alert('XSS')</script>
<a href="javascript:alert('XSS')">Click me</a>

## HTML Event Handler
<button onclick="alert('Hacked!')">Click</button>

## Iframe Injection
<iframe src="http://malicious.example.com"></iframe>

## Embedded Object
<object data="malicious.swf"></object>

## Style Injection
<div style="background:url(javascript:alert('XSS'))">Test</div>
