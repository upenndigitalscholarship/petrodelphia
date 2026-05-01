# GeoTIFF to MapWarper Converter

This script automates the conversion of 16-bit georeferenced TIFFs into 8-bit JPEGs and generates Ground Control Point (GCP) files for MapWarper.net bulk import.

## Overview

This tool eliminates the need for manual workflows spanning ArcGIS, QGIS, Photoshop, and Excel by providing a single, well-documented Python script that:

- **Converts 16-bit to 8-bit** using a percentile-based linear stretch to preserve contrast
- **Extracts geospatial metadata** (CRS, bounds, transform) from TIFF headers
- **Generates GCP files** formatted for MapWarper's bulk import feature
- **Handles multiple band types** (single-band grayscale, RGB, RGBA)
- **Reprojects coordinates** to WGS84 (EPSG:4326) as required by MapWarper
- **Batch processes** directories of TIFF files
- **Provides clear error messages** for non-georeferenced or invalid files

## Installation

### Prerequisites

- Python 3.8+
- GDAL/rasterio system libraries (required by rasterio)

### Windows Installation

```powershell
# Install GDAL via conda (recommended)
conda install -c conda-forge gdal rasterio

# Or install Python packages via pip
pip install -r requirements-geotiff.txt
```

### macOS/Linux Installation

```bash
# Using conda (recommended)
conda install -c conda-forge gdal rasterio

# Using Homebrew (macOS)
brew install gdal
pip install -r requirements-geotiff.txt

# Using apt (Ubuntu/Debian)
sudo apt-get install gdal-bin libgdal-dev
pip install -r requirements-geotiff.txt
```

## Usage

### Basic Usage

**Convert a single TIFF file:**
```bash
python geotiff_to_mapwarper.py input.tif
```

**Process all TIFFs in a directory:**
```bash
python geotiff_to_mapwarper.py /path/to/tiff/directory/
```

### Advanced Options

```bash
# Specify custom percentiles for contrast stretch
python geotiff_to_mapwarper.py input.tif --percentile-low 5 --percentile-high 95

# Save outputs to a different directory
python geotiff_to_mapwarper.py input.tif --output-dir ./output

# Adjust JPEG compression quality (1-100, default 95)
python geotiff_to_mapwarper.py input.tif --jpeg-quality 85

# Combine options
python geotiff_to_mapwarper.py /path/to/tiffs/ \
    --percentile-low 2 \
    --percentile-high 98 \
    --output-dir ./processed \
    --jpeg-quality 90
```

### Command-Line Help

```bash
python geotiff_to_mapwarper.py --help
```

## How It Works

### 1. Validation
- Checks if TIFF file has valid georeferencing (CRS + transform)
- Raises clear error if georeferencing is missing

### 2. Bit-Depth Conversion with Percentile Stretch
The script uses a **percentile-based linear stretch** to convert 16-bit data to 8-bit:

```
stretched_value = (value - P[low]) / (P[high] - P[low]) * 255
```

Where:
- `P[low]` = value at the lower percentile (default 2nd percentile)
- `P[high]` = value at the upper percentile (default 98th percentile)
- Values below `P[low]` → 0 (black)
- Values above `P[high]` → 255 (white)
- Values between → linearly mapped to 0-255

**Why percentile-based?**
- Standard min/max stretching can be skewed by outliers
- Percentile stretch balances contrast enhancement with detail preservation
- 2nd-98th percentile is a good default; adjust for your data

### 3. Georeferencing Extraction
The script reads from the TIFF header:
- **Bounding box (BBOX)** from `rasterio.bounds`
- **Affine transform** for pixel-to-coordinate mapping
- **CRS (Coordinate Reference System)**

### 4. Corner Coordinate Calculation
Calculates the four image corners in pixel space:
- Top-left: (0, 0)
- Top-right: (width, 0)
- Bottom-left: (0, height)
- Bottom-right: (width, height)

Uses the affine transform to convert to geographic coordinates, then reprojects to **WGS84 (EPSG:4326)** if needed.

### 5. GCP File Generation
Creates a CSV file in MapWarper's import format:

```csv
x,y,lon,lat
0,0,-76.5,40.2
width,0,-76.4,40.2
0,height,-76.5,40.1
width,height,-76.4,40.1
```

Where:
- `x, y` = pixel coordinates in the JPEG
- `lon, lat` = geographic coordinates in decimal degrees (WGS84)

## Output Files

For each input TIFF named `sample.tif`, the script generates:

1. **sample.jpg** - 8-bit JPEG image
2. **sample_gcps.csv** - Ground Control Points file for MapWarper

## Output Directory

- **Default**: Same directory as the input TIFF file
- **Custom**: Use `--output-dir` to specify a different location

## Example Workflow

```bash
# 1. Process a directory of TIFFs
python geotiff_to_mapwarper.py ./raw_tiffs/ --output-dir ./processed

# 2. Files are generated in ./processed/:
#    - ortho_001.jpg + ortho_001_gcps.csv
#    - ortho_002.jpg + ortho_002_gcps.csv
#    - ...

# 3. Upload JPEGs to MapWarper.net and import GCPs
# 4. MapWarper will use the GCPs to auto-georeference the images
```

## Troubleshooting

### Error: "TIFF file is not properly georeferenced"

**Cause**: The TIFF lacks CRS (Coordinate Reference System) or transform information.

**Solution**:
1. Check the original TIFF in QGIS or ArcGIS to confirm georeferencing
2. Use `gdalinfo` to inspect metadata:
   ```bash
   gdalinfo input.tif
   ```
3. If missing, georeference the TIFF:
   - In QGIS: Layer → Georeference
   - In ArcGIS: Raster → Georeference

### Error: "Cannot read TIFF file"

**Cause**: GDAL/rasterio cannot open the file.

**Solution**:
1. Verify file format with `file` command
2. Ensure the file isn't corrupted
3. Check file permissions

### JPEG output is too dark or too bright

**Solution**: Adjust percentile values:
```bash
# Darker areas: Use lower low-percentile
python geotiff_to_mapwarper.py input.tif --percentile-low 1

# Brighter areas: Use higher high-percentile
python geotiff_to_mapwarper.py input.tif --percentile-high 99

# More contrast: Tighten percentile range
python geotiff_to_mapwarper.py input.tif --percentile-low 5 --percentile-high 95
```

### GCP coordinates don't look correct

**Check 1**: Verify original TIFF CRS in QGIS/ArcGIS
```bash
gdalinfo input.tif | grep -i "crs"
```

**Check 2**: Validate MapWarper import
- MapWarper requires WGS84 (EPSG:4326) coordinates
- The script auto-reprojects if needed
- Check CSV in a text editor to verify lon/lat values

### GDAL Installation Issues

**Windows**: Use conda instead of pip:
```powershell
conda install -c conda-forge gdal rasterio
```

**Linux**: Ensure GDAL dev headers are installed:
```bash
# Ubuntu/Debian
sudo apt-get install libgdal-dev
```

## Technical Details

### Supported TIFF Types

- **Bit depths**: 16-bit, 32-bit (converted to 8-bit)
- **Band count**: 1 (grayscale), 3 (RGB), 4 (RGBA)
- **Compression**: Any GDAL-supported codec

### Coordinate Systems Supported

- Any CRS supported by rasterio/GDAL (EPSG codes, WKT, etc.)
- Automatically reprojects to WGS84 for MapWarper

### Performance

- Single TIFF (~500MB): ~5-10 seconds
- Batch directory (10 files): ~1-2 minutes
- Bottleneck: Disk I/O for large files

## Using GCP Files in MapWarper

1. **Generate GCP CSV** (this script)
2. **Upload image JPEG** to MapWarper.net
3. **Import GCPs**:
   - MapWarper → Edit Georeference → Upload ...
   - Select `sample_gcps.csv`
   - MapWarper will auto-georeference based on the control points
4. **Fine-tune** in MapWarper UI if needed

## API Usage (Python)

You can use the converter programmatically in your own scripts:

```python
from geotiff_to_mapwarper import TIFFToMapWarperConverter

# Create converter instance
converter = TIFFToMapWarperConverter(
    percentile_low=2,
    percentile_high=98,
    jpeg_quality=95
)

# Process single file
result = converter.process_file("input.tif")
print(result)
# Output: {'jpeg': 'input.jpg', 'gcp': 'input_gcps.csv'}

# Process directory
results = converter.process_directory("./tiff_directory/")
```

## Limitations

- RGBA images convert to grayscale JPEG (JPEG doesn't support transparency)
- No support for multi-band imagery beyond RGB(A)
- Percentile stretch is linear (not histogram equalization)
- Large files (>1GB) may require more system memory

## Related Tools

- **QGIS**: For manual georeferencing and quality checks
- **MapWarper**: For interactive georeference refinement
- **gdalinfo**: For inspecting TIFF metadata
- **rasterio CLI**: For additional geospatial processing

## License & Attribution

This script uses open-source geospatial libraries:
- **rasterio**: Reading/writing geospatial rasters
- **numpy**: Array processing
- **Pillow**: Image encoding

## Future Enhancements

Potential improvements:
- [ ] Multi-threaded batch processing
- [ ] Histogram equalization option
- [ ] Support for COG (Cloud Optimized GeoTIFF)
- [ ] GeoJSON boundary export
- [ ] Interactive percentile preview UI
