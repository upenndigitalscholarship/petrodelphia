---
title: Fatalities Map
layout: map
# see _layouts/map.html for layout
# see fatalities-map.html for content
permalink: /fatalities-map.html
# see below file for the actual map components
custom-foot: js/fatalities-map-js.html
---

# {{ page.title }}

<div id="fatalities" class="mb-2">
{% include_relative fatalities-map.html %}
<!-- map content is inserted via JS into div below -->
<div id="map" class="mt-2"></div>
</div>
