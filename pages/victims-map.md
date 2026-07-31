---
title: Victims Map
layout: map
# see _layouts/map.html for layout
# see victims-map.html for content
permalink: /victims-map.html
# see below file for the actual map components
custom-foot: js/victims-map-js.html
---

# {{ page.title }}

<div id="victims" class="mb-2">
{% include_relative victims-map.html %}
<!-- map content is inserted via JS into div below -->
<div id="map" class="mt-2"></div>
</div>
