---
title: Accidents Map
layout: map
# see _layouts/map.html for layout
# see accidents-map.html for content
permalink: /accidents-map.html
# see below file for the actual map components
custom-foot: js/accident-js.html
---

# {{ page.title }}

<div id="accidents-map" class="mb-2">
{% include_relative accidents-map.html %}
<!-- map content is inserted via JS into div below -->
<div id="map" class="mt-2"></div>
</div>
