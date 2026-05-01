# GeoTIFF to MapWarper Quick Reference

## Installation (One-time Setup)

```bash
# Option 1: Using conda (recommended, handles GDAL automatically)
conda install -c conda-forge gdal rasterio numpy pillow

# Option 2: Using pip (requires GDAL system libraries)
pip install -r requirements-geotiff.txt
```

## Common Commands

```bash
# Single file
python geotiff_to_mapwarper.py image.tif

# Batch process directory
python geotiff_to_mapwarper.py ./tiff_folder/

# Custom output directory
python geotiff_to_mapwarper.py image.tif --output-dir ./output

# Darker image (adjust percentiles)
python geotiff_to_mapwarper.py image.tif --percentile-low 1 --percentile-high 99

# Lighter image
python geotiff_to_mapwarper.py image.tif --percentile-low 5 --percentile-high 95

# Lower JPEG file size
python geotiff_to_mapwarper.py image.tif --jpeg-quality 80
```

## Output Files

For `map_01.tif`:
- **map_01.jpg** — 8-bit JPEG (ready for MapWarper)
- **map_01_gcps.csv** — Ground Control Points (import to MapWarper)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Not georeferenced" | TIFF missing CRS; use QGIS/ArcGIS to georeference first |
| Dark/bright output | Adjust `--percentile-low` and `--percentile-high` |
| GDAL error on Windows | Use `conda install` instead of `pip` |
| Permission denied | Run script from a writable directory |

## MapWarper Workflow

1. ✓ Run script → generates `.jpg` + `_gcps.csv`
2. Upload `.jpg` to MapWarper.net
3. MapWarper → Edit → Upload GCPs from `_gcps.csv`
4. Done! Image is now georeferenced

## Percentile Stretch Cheat Sheet

```
Default (2-98):  Balanced, works for most data
Tight (5-95):    More contrast, removes more outliers
Wide (1-99):     Preserves detail in extreme values
Extreme (0-100): Min-max stretch (can have outliers)
```

## File Sizes

- Input: Raw 16-bit GeoTIFF (~500 MB per image)
- Output: 8-bit JPEG (~5-10 MB) + CSV (~1 KB)
- Typical processing: 5-10 sec per image

## Getting Help

```bash
python geotiff_to_mapwarper.py --help
```

Inspect TIFF metadata:
```bash
gdalinfo image.tif
```
