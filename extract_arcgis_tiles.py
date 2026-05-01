#!/usr/bin/env python3
"""
Extract tile information from ArcGIS REST ImageServer/MapServer endpoint.
"""

import requests
import json
from pathlib import Path
from typing import Dict, List, Any

# ============================================================================
# CONFIGURATION
# ============================================================================

REST_ENDPOINT = "https://imagery.pasda.psu.edu/arcgis/rest/services/pasda/PhiladelphiaImagery2019/MapServer/3"
OUTPUT_DIR = Path(r"C:\Users\benlieb\Documents\Jared Farmer\PASDA 2019 Philadelphia Imagery")

# ============================================================================
# FUNCTIONS
# ============================================================================

def query_arcgis_service(url: str) -> Dict[str, Any]:
    """
    Query ArcGIS REST service for layer information.
    
    Args:
        url (str): REST endpoint URL
        
    Returns:
        dict: JSON response from the service
    """
    print(f"Querying: {url}")
    
    try:
        # Add f=json to request JSON response
        params = {'f': 'json'}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print("✓ Service query successful\n")
        return data
        
    except Exception as e:
        print(f"✗ Error querying service: {e}\n")
        return {}


def query_tile_bounds(url: str) -> Dict[str, Any]:
    """
    Query tile bounds and extent information.
    
    Args:
        url (str): REST endpoint URL
        
    Returns:
        dict: Tile information
    """
    try:
        params = {'f': 'json'}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        tile_info = {}
        
        # Extract relevant tile information
        if 'extent' in data:
            tile_info['extent'] = data['extent']
        if 'tileInfo' in data:
            tile_info['tileInfo'] = data['tileInfo']
        if 'maxRecordCount' in data:
            tile_info['maxRecordCount'] = data['maxRecordCount']
        if 'minScale' in data:
            tile_info['minScale'] = data['minScale']
        if 'maxScale' in data:
            tile_info['maxScale'] = data['maxScale']
        
        return tile_info
        
    except Exception as e:
        print(f"Error querying tile bounds: {e}")
        return {}


def query_export_tiles(url: str, extent: Dict) -> Dict[str, Any]:
    """
    Try to query exportTiles endpoint if available (for image services).
    
    Args:
        url (str): REST endpoint URL
        extent (dict): Extent bounds
        
    Returns:
        dict: Export tile information
    """
    try:
        # Try /exportTiles endpoint
        export_url = url.replace('/3', '') + '/exportTiles'
        params = {
            'f': 'json',
            'extent': json.dumps(extent)
        }
        
        response = requests.get(export_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        return data
        
    except Exception as e:
        print(f"exportTiles not available: {e}")
        return {}


def print_service_info(data: Dict[str, Any]):
    """Print formatted service information."""
    print("=" * 70)
    print("SERVICE INFORMATION")
    print("=" * 70)
    
    # Basic info
    if 'name' in data:
        print(f"Layer Name: {data['name']}")
    if 'type' in data:
        print(f"Layer Type: {data['type']}")
    if 'description' in data and data['description']:
        print(f"Description: {data['description']}")
    
    print()
    
    # Extent
    if 'extent' in data:
        ext = data['extent']
        print("EXTENT (Geographic bounds):")
        if 'xmin' in ext:
            print(f"  Longitude: {ext['xmin']:.4f} to {ext['xmax']:.4f}")
            print(f"  Latitude:  {ext['ymin']:.4f} to {ext['ymax']:.4f}")
    
    print()
    
    # Spatial Reference
    if 'sourceSpatialReference' in data:
        sr = data['sourceSpatialReference']
        print("SPATIAL REFERENCE:")
        if 'wkt' in sr:
            print(f"  WKT: {sr['wkt'][:80]}...")
    
    print()
    
    # Capabilities
    if 'capabilities' in data:
        print(f"Capabilities: {data['capabilities']}")
    
    if 'minScale' in data and 'maxScale' in data:
        print(f"Scale Range: {data['minScale']} to {data['maxScale']}")
    
    print()
    
    # Tile info if available
    if 'tileInfo' in data:
        print("TILE INFORMATION:")
        print(json.dumps(data['tileInfo'], indent=2))
    
    print()


def check_image_service(url: str) -> bool:
    """
    Check if this is an ImageServer (more likely to have tile export).
    
    Args:
        url (str): REST endpoint URL
        
    Returns:
        bool: True if ImageServer
    """
    return 'ImageServer' in url


def main():
    """Main entry point."""
    print("ArcGIS REST Tile Information Extractor")
    print(f"Endpoint: {REST_ENDPOINT}\n")
    
    # Query service
    service_data = query_arcgis_service(REST_ENDPOINT)
    
    if not service_data:
        print("Failed to query service. Check the URL and network connection.")
        return
    
    # Print service info
    print_service_info(service_data)
    
    # Query tile bounds
    print("=" * 70)
    print("QUERYING TILE INFORMATION...")
    print("=" * 70)
    
    tile_bounds = query_tile_bounds(REST_ENDPOINT)
    if tile_bounds:
        print("Tile Bounds Data:")
        print(json.dumps(tile_bounds, indent=2))
    else:
        print("No tile bounds information available")
    
    print()
    
    # Save full response for reference
    output_file = OUTPUT_DIR / "arcgis_service_info.json"
    try:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, 'w') as f:
            json.dump(service_data, f, indent=2)
        print(f"✓ Full service info saved to: {output_file}")
    except Exception as e:
        print(f"Could not save service info: {e}")
    
    # Service type
    print()
    print("=" * 70)
    print("SERVICE TYPE")
    print("=" * 70)
    
    service_type = service_data.get('type', 'Unknown')
    print(f"Service Type: {service_type}")
    
    if service_type == 'Raster Layer':
        print("\nThis is a Raster/Image layer. URL structure for tiles:")
        print(f"  Base: {REST_ENDPOINT}")
        print("\nTo access tiles, use:")
        print(f"  {REST_ENDPOINT}/query")
        print(f"  {REST_ENDPOINT}/identify")
        print(f"  {REST_ENDPOINT}/export")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    main()
