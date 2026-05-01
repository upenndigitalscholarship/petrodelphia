// ============================================================================
// Map Configuration
// ============================================================================
const MAP_CONFIG = {
    CENTER: [41.2, -77.1],
    DEFAULT_ZOOM: 7,
    GEOJSON_FILE: 'AOIgeoData_Merged.geojson', // Merged with final_accidents CSV
    STORAGE_KEY: 'petrodelphia_geojson_state',
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap'
};

// ============================================================================
// Global State
// ============================================================================
let map;
let geojsonLayer;
let allFeatures = [];
let currentlyDraggingMarker = null;  // Track which marker is being dragged
let currentlySelectedMarker = null;  // Track which marker is selected/highlighted

// ============================================================================
// Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeMap();
    loadGeoJSONData();
    setupEventListeners();
});

// ============================================================================
// Theme Management
// ============================================================================
function initializeTheme() {
    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem('petrodelphia_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('petrodelphia_theme', theme);
    updateThemeButton(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function updateThemeButton(theme) {
    const button = document.querySelector('button[onclick="toggleTheme()"]');
    if (button) {
        button.textContent = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    }
}

function initializeMap() {
    map = L.map('map').setView(MAP_CONFIG.CENTER, MAP_CONFIG.DEFAULT_ZOOM);
    
    L.tileLayer(MAP_CONFIG.TILE_LAYER, {
        attribution: MAP_CONFIG.ATTRIBUTION
    }).addTo(map);
    
    // Setup global drag handlers (once only)
    setupGlobalDragHandlers();
}

function setupGlobalDragHandlers() {
    map.on('mousemove', function(e) {
        if (currentlyDraggingMarker) {
            currentlyDraggingMarker.setLatLng(e.latlng);
        }
    });
    
    map.on('mouseup', function(e) {
        if (currentlyDraggingMarker) {
            const newPos = currentlyDraggingMarker.getLatLng();
            const feature = currentlyDraggingMarker.feature;
            feature.geometry.coordinates = [newPos.lng, newPos.lat];
            saveGeoJSONState();
            map.dragging.enable();
            currentlyDraggingMarker = null;
        }
    });
}

function setupEventListeners() {
    // Search box listener
    const searchBox = document.getElementById('search-box');
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.accident-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
    
    // Year slider listeners are set up in setupYearSliders
}

// ============================================================================
// Data Loading & Rendering
// ============================================================================
function loadGeoJSONData() {
    // Check if data is embedded (from data.js)
    if (typeof GEOJSON_DATA !== 'undefined') {
        console.log('Using embedded GeoJSON data');
        renderMap(GEOJSON_DATA);
        return;
    }
    
    // Check for saved state in localStorage
    const saved = localStorage.getItem(MAP_CONFIG.STORAGE_KEY);
    if (saved) {
        console.log('Loading from saved state');
        try {
            const data = JSON.parse(saved);
            renderMap(data);
            return;
        } catch (e) {
            console.error('Error parsing saved state:', e);
        }
    }

    // Fall back to fetching from local file
    fetch(MAP_CONFIG.GEOJSON_FILE)
        .then(res => {
            console.log('Fetch response status:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            console.log('GeoJSON loaded successfully:', data);
            renderMap(data);
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            alert('Error loading GeoJSON data. Check browser console for details.');
        });
}

function renderMap(data) {
    geojsonLayer = L.geoJSON(data, {
        pointToLayer: createMarker
    }).addTo(map);

    if (geojsonLayer.getLayers().length > 0) {
        map.fitBounds(geojsonLayer.getBounds());
    }
    
    // Store all features and set up year sliders
    allFeatures = data.features;
    setupYearSliders(data.features);
    populateAccidentList(data.features);
}

// ============================================================================
// Marker Creation & Dragging
// ============================================================================
function createMarker(feature, latlng) {
    // Store original position
    if (!feature.properties._origin) {
        feature.properties._origin = { lat: latlng.lat, lng: latlng.lng };
    }
    
    if (!feature.properties.status) feature.properties.status = 'incomplete';
    
    // Determine marker color based on Injurious? and Deadly? properties
    const markerColor = getMarkerColor(feature.properties);
    
    const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: markerColor,
        color: markerColor,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.8
    });

    // Setup drag handlers
    setupMarkerDrag(marker, feature);
    
    // Click handler to select in list
    marker.on('click', function(e) {
        // Find the corresponding list item and click it
        const listItems = document.querySelectorAll('.accident-item');
        for (let item of listItems) {
            const itemText = item.textContent;
            const featureDate = feature.properties['Year-Month-Day'] || '';
            if (itemText.includes(featureDate) && itemText.includes(feature.properties['General location'] || '')) {
                selectAccidentItem(item, feature);
                break;
            }
        }
    });
    
    // Hover effects
    marker.on('mouseover', function() {
        marker.setStyle({ opacity: 1 });
    });
    
    marker.on('mouseout', function() {
        marker.setStyle({ opacity: 0.8 });
    });

    // Popup
    marker.bindPopup(() => createPopupContent(feature, marker));
    
    return marker;
}

function setupMarkerDrag(marker, feature) {
    // Store feature reference on marker for global handlers
    marker.feature = feature;
    
    marker.on('mousedown', function(e) {
        currentlyDraggingMarker = marker;
        map.dragging.disable();
        L.DomEvent.stopPropagation(e);
    });
}

function getMarkerColor(properties) {
    const injurious = properties['Injurious?'] === 'Y';
    const deadly = properties['Deadly?'] === 'Y';
    
    if (injurious && deadly) {
        return '#e74c3c'; // Red
    } else if (injurious && !deadly) {
        return '#ffc107'; // Yellow/Orange
    }
    return '#3388ff'; // Default blue
}

function createPopupContent(feature, marker) {
    const p = feature.properties;
    const stamped = L.stamp(marker);
    return `
        <div style="text-align:center; min-width: 140px;">
            <strong>ID:</strong> ${p.id || 'N/A'}<br>
            <strong>Status:</strong> ${p.status}<br>
            <button onclick="window.toggleStatus('${stamped}')">Toggle Status</button>
            <button class="reset-btn" onclick="window.resetLocation('${stamped}')">Reset to Origin</button>
        </div>
    `;
}

// ============================================================================
// Year Range Filtering
// ============================================================================
function setupYearSliders(features) {
    const years = features
        .map(f => parseInt(f.properties['Year']) || 0)
        .filter(y => y > 0);
    
    if (years.length === 0) return;
    
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    
    // Set slider ranges
    const startSlider = document.getElementById('year-start');
    const endSlider = document.getElementById('year-end');
    
    startSlider.min = minYear;
    startSlider.max = maxYear;
    startSlider.value = minYear;
    document.getElementById('year-start-value').textContent = minYear;
    
    endSlider.min = minYear;
    endSlider.max = maxYear;
    endSlider.value = maxYear;
    document.getElementById('year-end-value').textContent = maxYear;
    
    updateRangeFill();
    
    // Consolidated event listeners
    const updateYears = () => {
        let start = parseInt(startSlider.value);
        let end = parseInt(endSlider.value);
        
        // Ensure start <= end
        if (start > end) {
            start = end;
            startSlider.value = start;
        }
        if (end < start) {
            end = start;
            endSlider.value = end;
        }
        
        document.getElementById('year-start-value').textContent = start;
        document.getElementById('year-end-value').textContent = end;
        updateRangeFill();
        updateYearFilter();
    };
    
    startSlider.addEventListener('input', updateYears);
    endSlider.addEventListener('input', updateYears);
}

function updateRangeFill() {
    const start = parseInt(document.getElementById('year-start').value);
    const end = parseInt(document.getElementById('year-end').value);
    const min = parseInt(document.getElementById('year-start').min);
    const max = parseInt(document.getElementById('year-start').max);
    
    const startPercent = ((start - min) / (max - min)) * 100;
    const endPercent = ((end - min) / (max - min)) * 100;
    
    const rangeFill = document.getElementById('range-fill');
    rangeFill.style.left = startPercent + '%';
    rangeFill.style.right = (100 - endPercent) + '%';
}

function updateYearFilter() {
    const yearStart = parseInt(document.getElementById('year-start').value);
    const yearEnd = parseInt(document.getElementById('year-end').value);
    
    // Filter markers on map using CSS class
    geojsonLayer.eachLayer(function(layer) {
        const year = parseInt(layer.feature.properties['Year']) || 0;
        const isInRange = year >= yearStart && year <= yearEnd;
        if (isInRange) {
            layer.getElement()?.classList.remove('marker-hidden');
        } else {
            layer.getElement()?.classList.add('marker-hidden');
            // Clear selection if the selected marker is hidden
            if (currentlySelectedMarker === layer) {
                const originalColor = getMarkerColor(currentlySelectedMarker.feature.properties);
                currentlySelectedMarker.setStyle({
                    weight: 2,
                    color: originalColor
                });
                currentlySelectedMarker = null;
            }
        }
    });
    
    // Update accident list
    populateAccidentList(allFeatures);
}

// ============================================================================
// Accident List & Search
// ============================================================================
function populateAccidentList(features) {
    const yearStart = parseInt(document.getElementById('year-start').value);
    const yearEnd = parseInt(document.getElementById('year-end').value);
    
    // Filter by year range
    const filtered = features.filter(f => {
        const year = parseInt(f.properties['Year']) || 0;
        return year >= yearStart && year <= yearEnd;
    });
    
    // Sort features by date
    const sorted = filtered.slice().sort((a, b) => {
        const dateA = a.properties['Year-Month-Day'] || '';
        const dateB = b.properties['Year-Month-Day'] || '';
        return dateB.localeCompare(dateA);
    });

    const listDiv = document.getElementById('accident-list');
    listDiv.innerHTML = '';
    
    // Clear selection if the selected feature is not in the filtered list
    if (currentlySelectedMarker && !sorted.some(f => f === currentlySelectedMarker.feature)) {
        const originalColor = getMarkerColor(currentlySelectedMarker.feature.properties);
        currentlySelectedMarker.setStyle({
            weight: 2,
            color: originalColor
        });
        currentlySelectedMarker = null;
    }

    sorted.forEach((feature) => {
        const props = feature.properties;
        const date = props['Year-Month-Day'] || 'Unknown Date';
        const generalLocation = props['General location'] || '';
        const streetCoords = props['Street coordinates'] || '';
        const desc = props['Description'] || 'No description';
        const shortDesc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;

        const item = document.createElement('div');
        item.className = 'accident-item';
        item.innerHTML = `
            <div class="accident-date">${date}</div>
            <div class="accident-location"><strong>General location:</strong> ${generalLocation}</div>
            <div class="accident-coords"><strong>Street coordinates:</strong> ${streetCoords}</div>
            <div class="accident-desc">${shortDesc}</div>
        `;

        // Mouseover: highlight marker with blue ring
        item.addEventListener('mouseover', function() {
            geojsonLayer.eachLayer(function(layer) {
                if (layer.feature === feature && layer !== currentlySelectedMarker) {
                    const selectedColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#b0b0b0' : '#404040';
                    layer.setStyle({
                        weight: 5,
                        color: selectedColor
                    });
                }
            });
        });

        // Mouseout: remove blue ring (unless it's selected)
        item.addEventListener('mouseout', function() {
            geojsonLayer.eachLayer(function(layer) {
                if (layer.feature === feature && layer !== currentlySelectedMarker) {
                    const originalColor = getMarkerColor(layer.feature.properties);
                    layer.setStyle({
                        weight: 2,
                        color: originalColor
                    });
                }
            });
        });

        // Click: select the item
        item.addEventListener('click', function() {
            selectAccidentItem(item, feature);
        });

        listDiv.appendChild(item);
    });
}


function selectAccidentItem(item, feature) {
    // Remove previous selection from list items
    document.querySelectorAll('.accident-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    
    // Scroll item into view
    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Remove blue ring from previously selected marker and restore original style
    if (currentlySelectedMarker) {
        const originalColor = getMarkerColor(currentlySelectedMarker.feature.properties);
        currentlySelectedMarker.setStyle({
            weight: 2,
            color: originalColor
        });
    }

    // Center map on this feature (keep current zoom level)
    const coords = feature.geometry.coordinates;
    const latlng = L.latLng(coords[1], coords[0]);
    map.panTo(latlng);

    // Find, highlight, and open the marker popup
    geojsonLayer.eachLayer(function(layer) {
        if (layer.feature === feature) {
            // Add blue ring to selected marker by increasing stroke width and changing color
            const selectedColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#b0b0b0' : '#404040';
            layer.setStyle({
                weight: 5,
                color: selectedColor
            });
            currentlySelectedMarker = layer;
            
            // Open popup
            if (layer.openPopup) {
                layer.openPopup();
            }
        }
    });
}

// ============================================================================
// State Management
// ============================================================================
function saveGeoJSONState() {
    try {
        const data = geojsonLayer.toGeoJSON();
        data.features.forEach(f => delete f.properties._origin);
        localStorage.setItem(MAP_CONFIG.STORAGE_KEY, JSON.stringify(data));
        console.log('GeoJSON state saved to localStorage');
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

window.resetLocation = function(leafletId) {
    const layer = geojsonLayer.getLayer(leafletId);
    const origin = layer.feature.properties._origin;
    
    if (origin) {
        const newLatLng = new L.LatLng(origin.lat, origin.lng);
        layer.setLatLng(newLatLng);
        layer.feature.geometry.coordinates = [origin.lng, origin.lat];
        layer.closePopup();
    }
};

window.toggleStatus = function(leafletId) {
    const layer = geojsonLayer.getLayer(leafletId);
    const p = layer.feature.properties;
    p.status = (p.status === 'complete') ? 'incomplete' : 'complete';
    layer.closePopup();
};

window.toggleTheme = toggleTheme;

// ============================================================================
// Export
// ============================================================================
function exportGeoJSON() {
    const data = geojsonLayer.toGeoJSON();
    data.features.forEach(f => delete f.properties._origin);
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "updated_AOI.geojson";
    link.click();
}

window.exportGeoJSON = exportGeoJSON;
