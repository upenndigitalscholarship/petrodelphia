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
    // Check for saved preference, default to light mode
    const savedTheme = localStorage.getItem('petrodelphia_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || 'light'; // Always start with light mode unless saved
    
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
            // Update popup with new coordinates while dragging
            if (currentlyDraggingMarker.isPopupOpen()) {
                currentlyDraggingMarker.setPopupContent(createPopupContent(currentlyDraggingMarker.feature, currentlyDraggingMarker));
            }
        }
    });
    
    map.on('mouseup', function(e) {
        if (currentlyDraggingMarker) {
            const newPos = currentlyDraggingMarker.getLatLng();
            const feature = currentlyDraggingMarker.feature;
            feature.geometry.coordinates = [newPos.lng, newPos.lat];
            saveGeoJSONState();
            
            // Restore z-index based on selection state
            const el = currentlyDraggingMarker.getElement();
            if (el) {
                if (currentlyDraggingMarker === currentlySelectedMarker) {
                    // Restore selected marker to top
                    el.style.zIndex = '1000';
                    el.style.opacity = '1';
                } else if (currentlySelectedMarker) {
                    // Other marker when selection exists
                    el.style.zIndex = '1';
                    el.style.opacity = '0.3';
                } else {
                    // No selection - restore to normal
                    el.style.zIndex = '1';
                    el.style.opacity = '1';
                }
            }
            
            // Update popup with final coordinates
            if (currentlyDraggingMarker.isPopupOpen()) {
                currentlyDraggingMarker.setPopupContent(createPopupContent(feature, currentlyDraggingMarker));
            }
            map.dragging.enable();
            currentlyDraggingMarker = null;
        }
    });
}

function setupEventListeners() {
    // GeoJSON upload handler
    const uploadInput = document.getElementById('geojson-upload');
    uploadInput.addEventListener('change', handleGeoJSONUpload);
    
    // Search box listener
    const searchBox = document.getElementById('search-box');
    searchBox.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.accident-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
    
    // Precision filter listeners
    const filterAll = document.getElementById('filter-all');
    const filterHigh = document.getElementById('filter-high');
    const filterLow = document.getElementById('filter-low');
    const filterUnknown = document.getElementById('filter-unknown');
    
    filterAll.addEventListener('change', function() {
        if (this.checked) {
            // If "All" is checked, check all other boxes
            filterHigh.checked = true;
            filterLow.checked = true;
            filterUnknown.checked = true;
        }
        updateYearFilter();
    });
    
    filterHigh.addEventListener('change', updatePrecisionCheckboxes);
    filterLow.addEventListener('change', updatePrecisionCheckboxes);
    filterUnknown.addEventListener('change', updatePrecisionCheckboxes);
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
    
    // Determine marker based on precision level
    const markerInfo = getMarkerInfo(feature.properties);
    
    // Create custom HTML marker with symbol
    const marker = L.marker(latlng, {
        icon: createPrecisionIcon(markerInfo.precision, markerInfo.color)
    });

    // Setup drag handlers
    setupMarkerDrag(marker, feature);
    
    // Click handler to select in list or toggle popup
    marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        
        // Check if this marker is already selected
        if (currentlySelectedMarker === marker) {
            // Marker is already selected - toggle popup visibility
            if (marker.isPopupOpen()) {
                marker.closePopup();
            } else {
                marker.openPopup();
            }
        } else {
            // New marker being selected - find list item and select it
            const listItems = document.querySelectorAll('.accident-item');
            for (let item of listItems) {
                const itemText = item.textContent;
                const featureDate = feature.properties['Year-Month-Day'] || '';
                if (itemText.includes(featureDate) && itemText.includes(feature.properties['General location'] || '')) {
                    selectAccidentItem(item, feature);
                    // Open popup after selection
                    marker.openPopup();
                    break;
                }
            }
        }
    });
    
    // Hover effects - removed to avoid opacity changes on mouseover
    marker.on('mouseover', function() {
        // Keep marker appearance unchanged
    });
    
    marker.on('mouseout', function() {
        // Keep marker appearance unchanged
    });

    // Popup
    marker.bindPopup(() => createPopupContent(feature, marker));
    
    return marker;
}

function createPrecisionIcon(precision, color, strokeColor = '#333') {
    const precisionSymbolMap = {
        'High': 'H',
        'Low': 'L',
        'Unknown': 'U'
    };
    
    const symbol = precisionSymbolMap[precision] || 'U';
    
    const html = `
        <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: white;
            border: 3px solid ${strokeColor};
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-size: 18px;
            font-weight: bold;
            color: #333;
            cursor: pointer;
            font-family: Arial, sans-serif;
        ">
            ${symbol}
        </div>
    `;
    
    return L.divIcon({
        html: html,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
        className: 'precision-marker'
    });
}

function setupMarkerDrag(marker, feature) {
    // Store feature reference on marker for global handlers
    marker.feature = feature;
    
    marker.on('mousedown', function(e) {
        currentlyDraggingMarker = marker;
        map.dragging.disable();
        // Move dragged marker to top during drag
        const el = marker.getElement();
        if (el) {
            el.style.zIndex = '1001'; // Above all other markers (including selected at 1000)
        }
        L.DomEvent.stopPropagation(e);
    });
}

function getMarkerInfo(properties) {
    // Check for precision field (supports multiple naming conventions)
    const precision = properties['Precision'] || properties['precision'] || properties['Geo_Precision'] || properties['Location_Precision'] || 'Unknown';
    
    // Color coding based on precision is not used now, but keeping structure
    let color = '#3388ff'; // Default blue
    
    return {
        precision: precision.charAt(0).toUpperCase() + precision.slice(1).toLowerCase(),
        color: color
    };
}

function updateMarkerForFeature(feature) {
    // Find and update the marker for this feature
    geojsonLayer.eachLayer(function(layer) {
        if (layer.feature === feature) {
            const markerInfo = getMarkerInfo(feature.properties);
            const strokeColor = layer === currentlySelectedMarker ? '#007bff' : '#333';
            const newIcon = createPrecisionIcon(markerInfo.precision, markerInfo.color, strokeColor);
            layer.setIcon(newIcon);
        }
    });
}

function updateMarkerVisualState(marker, isSelected) {
    // Update marker stroke color based on selection state (no opacity changes)
    const markerInfo = getMarkerInfo(marker.feature.properties);
    const strokeColor = isSelected ? '#007bff' : '#333';
    const newIcon = createPrecisionIcon(markerInfo.precision, markerInfo.color, strokeColor);
    marker.setIcon(newIcon);
}

function createPopupContent(feature, marker) {
    const p = feature.properties;
    const stamped = L.stamp(marker);
    const coords = feature.geometry.coordinates;
    const lat = coords[1].toFixed(6);
    const lng = coords[0].toFixed(6);
    return `
        <div style="text-align:center; min-width: 180px;">
            <strong>ID:</strong> ${p.id || 'N/A'}<br>
            <strong>Status:</strong> ${p.status}<br>
            <strong>Coordinates:</strong><br>
            <small>Lat: ${lat}<br>Lng: ${lng}</small><br>
            <div style="margin-top: 8px;">
                <button onclick="window.toggleStatus('${stamped}')">Toggle Status</button>
                <button class="reset-btn" onclick="window.resetLocation('${stamped}')">Reset to Origin</button>
            </div>
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

function updatePrecisionCheckboxes() {
    // If any of HIGH, LOW, UNKNOWN is unchecked, uncheck ALL
    const filterHigh = document.getElementById('filter-high');
    const filterLow = document.getElementById('filter-low');
    const filterUnknown = document.getElementById('filter-unknown');
    const filterAll = document.getElementById('filter-all');
    
    if (!filterHigh.checked || !filterLow.checked || !filterUnknown.checked) {
        filterAll.checked = false;
    } else {
        // If all three are checked, check ALL
        filterAll.checked = true;
    }
    
    updateYearFilter();
}

function matchesPrecisionFilter(precision) {
    const filterHigh = document.getElementById('filter-high').checked;
    const filterLow = document.getElementById('filter-low').checked;
    const filterUnknown = document.getElementById('filter-unknown').checked;
    
    const normalizedPrecision = (precision || 'Unknown').toLowerCase();
    
    if (normalizedPrecision === 'high') return filterHigh;
    if (normalizedPrecision === 'low') return filterLow;
    if (normalizedPrecision === 'unknown') return filterUnknown;
    
    return filterUnknown; // Default to unknown if not recognized
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
    
    // Filter markers on map using year range and precision filter
    geojsonLayer.eachLayer(function(layer) {
        const year = parseInt(layer.feature.properties['Year']) || 0;
        const precision = layer.feature.properties['Precision'] || 'Unknown';
        const isInRange = year >= yearStart && year <= yearEnd;
        const matchesPrecision = matchesPrecisionFilter(precision);
        
        if (isInRange && matchesPrecision) {
            layer.getElement()?.classList.remove('marker-hidden');
            const el = layer.getElement();
            
            if (currentlySelectedMarker === layer) {
                // Selected marker: 100% opacity, blue stroke, top z-index
                if (el) {
                    el.style.opacity = '1';
                    el.style.zIndex = '1000';
                }
                updateMarkerVisualState(layer, true);
            } else if (currentlySelectedMarker) {
                // Other markers when selection exists: 30% opacity, black stroke
                if (el) {
                    el.style.opacity = '0.3';
                    el.style.zIndex = '1';
                }
                updateMarkerVisualState(layer, false);
            } else {
                // No selection: 100% opacity, black stroke
                if (el) {
                    el.style.opacity = '1';
                    el.style.zIndex = '1';
                }
                updateMarkerVisualState(layer, false);
            }
        } else {
            layer.getElement()?.classList.add('marker-hidden');
            // Clear selection if the selected marker is hidden
            if (currentlySelectedMarker === layer) {
                currentlySelectedMarker = null;
                // Reset all visible markers to normal state (100% opacity, black stroke)
                geojsonLayer.eachLayer(function(otherLayer) {
                    const el = otherLayer.getElement();
                    if (el && !el.classList.contains('marker-hidden')) {
                        el.style.opacity = '1';
                        el.style.zIndex = '1';
                        updateMarkerVisualState(otherLayer, false);
                    }
                });
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
    
    // Filter by year range and precision
    const filtered = features.filter(f => {
        const year = parseInt(f.properties['Year']) || 0;
        const precision = f.properties['Precision'] || 'Unknown';
        const yearInRange = year >= yearStart && year <= yearEnd;
        const precisionMatches = matchesPrecisionFilter(precision);
        return yearInRange && precisionMatches;
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
        currentlySelectedMarker = null;
        // Reset all visible markers to 100% opacity with black stroke
        geojsonLayer.eachLayer(function(layer) {
            if (!layer.getElement()?.classList.contains('marker-hidden')) {
                const el = layer.getElement();
                if (el) el.style.opacity = '1';
                updateMarkerVisualState(layer, false);
                el.style.zIndex = '1';
            }
        });
    }

    // Move selected items to top
    const selectedFeature = currentlySelectedMarker?.feature;
    const selected = sorted.filter(f => f === selectedFeature);
    const notSelected = sorted.filter(f => f !== selectedFeature);
    const orderedFeatures = [...selected, ...notSelected];

    orderedFeatures.forEach((feature) => {
        const props = feature.properties;
        const date = props['Year-Month-Day'] || 'Unknown Date';
        const generalLocation = props['General location'] || '';
        const streetCoords = props['Street coordinates'] || '';
        const desc = props['Description'] || 'No description';
        const shortDesc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
        const currentPrecision = props['Precision'] || 'Unknown';

        const item = document.createElement('div');
        item.className = 'accident-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <div class="accident-date">${date}</div>
                    <div class="accident-location"><strong>General location:</strong> ${generalLocation}</div>
                    <div class="accident-coords"><strong>Street coordinates:</strong> ${streetCoords}</div>
                    <div class="accident-desc">${shortDesc}</div>
                </div>
                <button class="precision-btn" style="
                    margin-left: 10px;
                    padding: 6px 10px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    white-space: nowrap;
                    min-width: 70px;
                ">${currentPrecision}</button>
            </div>
        `;

        // Get button reference
        const precisionBtn = item.querySelector('.precision-btn');

        // Precision button click handler
        precisionBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent item click
            const precisionQueue = ['Unknown', 'Low', 'High'];
            const currentIndex = precisionQueue.indexOf(feature.properties['Precision'] || 'Unknown');
            const nextIndex = (currentIndex + 1) % precisionQueue.length;
            const newPrecision = precisionQueue[nextIndex];
            
            // Update feature properties
            feature.properties['Precision'] = newPrecision;
            
            // Update button text
            precisionBtn.textContent = newPrecision;
            
            // Update marker appearance
            updateMarkerForFeature(feature);
            
            // Save to localStorage
            saveGeoJSONState();
        });

        // Mouseover: highlight marker
        item.addEventListener('mouseover', function() {
            // Marker stays visible
        });

        // Mouseout: remove highlight (unless it's selected)
        item.addEventListener('mouseout', function() {
            // Marker stays visible
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

    // Reset previously selected marker
    if (currentlySelectedMarker) {
        const el = currentlySelectedMarker.getElement();
        if (el) el.style.opacity = '1';
        updateMarkerVisualState(currentlySelectedMarker, false);
    }

    // Dim all other visible markers to 30% opacity with black stroke
    geojsonLayer.eachLayer(function(layer) {
        if (layer.feature !== feature && !layer.getElement()?.classList.contains('marker-hidden')) {
            const el = layer.getElement();
            if (el) {
                el.style.opacity = '0.3';
                el.style.zIndex = '1';
            }
            updateMarkerVisualState(layer, false);
        }
    });

    // Center map on this feature (keep current zoom level)
    const coords = feature.geometry.coordinates;
    const latlng = L.latLng(coords[1], coords[0]);
    map.panTo(latlng);

    // Find and update the newly selected marker
    geojsonLayer.eachLayer(function(layer) {
        if (layer.feature === feature) {
            currentlySelectedMarker = layer;
            // Update selected marker to 100% opacity with blue stroke
            const el = layer.getElement();
            if (el) {
                el.style.opacity = '1';
                el.style.zIndex = '1000'; // Move to top
            }
            updateMarkerVisualState(layer, true);
            
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

// ============================================================================
// GeoJSON Upload Handler
// ============================================================================
function handleGeoJSONUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const geojson = JSON.parse(content);
            
            // Validate GeoJSON structure
            if (!geojson.type || !Array.isArray(geojson.features)) {
                throw new Error('Invalid GeoJSON: Missing "type" or "features" property');
            }
            
            // Validate that features are valid
            geojson.features.forEach((feature, index) => {
                if (!feature.geometry || !feature.geometry.type || !feature.geometry.coordinates) {
                    throw new Error(`Invalid feature at index ${index}: Missing or invalid geometry`);
                }
                if (!feature.properties) {
                    throw new Error(`Invalid feature at index ${index}: Missing properties`);
                }
            });
            
            // Clear current data
            if (geojsonLayer) {
                map.removeLayer(geojsonLayer);
            }
            
            // Reset selection state
            currentlySelectedMarker = null;
            document.querySelectorAll('.accident-item').forEach(el => el.classList.remove('selected'));
            
            // Load new data
            allFeatures = geojson.features;
            renderMap(geojson);
            
            // Save to localStorage
            saveGeoJSONState();
            
            console.log(`Successfully loaded ${geojson.features.length} features from uploaded GeoJSON`);
            alert(`Successfully loaded ${geojson.features.length} features from your GeoJSON file.`);
            
        } catch (error) {
            console.error('Error loading GeoJSON:', error);
            alert(`Error: Invalid GeoJSON file.\n\n${error.message}`);
        }
    };
    
    reader.onerror = function() {
        alert('Error reading file. Please try again.');
    };
    
    reader.readAsText(file);
    
    // Reset input so same file can be uploaded again
    event.target.value = '';
}

window.handleGeoJSONUpload = handleGeoJSONUpload;
