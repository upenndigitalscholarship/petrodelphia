#!/usr/bin/env python3
"""
Geospatial Workflow Automation: TIFF to MapWarper Converter

Converts 16-bit georeferenced TIFFs into 8-bit JPEGs and generates
Ground Control Point (GCP) files for MapWarper.net bulk import.

Features:
- Percentile-based stretch for optimal contrast on 16-bit to 8-bit conversion
- Automatic georeferencing validation
- WGS84 coordinate projection for GCP files
- Batch processing support
- Comprehensive error handling

Usage:
    python geotiff_to_mapwarper.py input_file.tif
    python geotiff_to_mapwarper.py /path/to/tiff/directory
    python geotiff_to_mapwarper.py input.tif --percentile-low 2 --percentile-high 98 --output-dir ./output
"""

import argparse
import os
import sys
import csv
from pathlib import Path
from typing import Tuple, Optional, Dict, List

import numpy as np
import rasterio
from rasterio.transform import xy
from rasterio.warp import calculate_default_transform, transform_bounds
import rasterio.crs
from PIL import Image


class TIFFToMapWarperConverter:
    """Main converter class for TIFF to MapWarper workflow."""

    def __init__(
        self,
        percentile_low: int = 2,
        percentile_high: int = 98,
        output_dir: Optional[str] = None,
        jpeg_quality: int = 95,
    ):
        """
        Initialize the converter.

        Args:
            percentile_low: Lower percentile for stretch (default: 2)
            percentile_high: Upper percentile for stretch (default: 98)
            output_dir: Directory for output files (default: same as input)
            jpeg_quality: JPEG compression quality 1-100 (default: 95)
        """
        self.percentile_low = percentile_low
        self.percentile_high = percentile_high
        self.output_dir = output_dir
        self.jpeg_quality = jpeg_quality

    def validate_georeference(self, filepath: str) -> bool:
        """
        Validate that the TIFF file has georeferencing information.

        Args:
            filepath: Path to the TIFF file

        Returns:
            True if georeferenced, False otherwise

        Raises:
            FileNotFoundError: If file doesn't exist
            rasterio.errors.RasterioIOError: If file can't be read
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        try:
            with rasterio.open(filepath) as src:
                if src.crs is None:
                    return False
                if src.transform is None or src.transform == rasterio.transform.Affine.identity():
                    return False
                return True
        except Exception as e:
            raise rasterio.errors.RasterioIOError(f"Cannot read TIFF file: {e}")

    def get_percentile_stretch_values(
        self, data: np.ndarray
    ) -> Tuple[float, float]:
        """
        Calculate the percentile-based stretch values for bit depth conversion.

        Args:
            data: Input array (typically 16-bit)

        Returns:
            Tuple of (low_value, high_value) for stretching
        """
        # Handle nodata values if present
        valid_data = data[~np.isnan(data)]
        if len(valid_data) == 0:
            return float(np.nanmin(data)), float(np.nanmax(data))

        low_val = float(np.percentile(valid_data, self.percentile_low))
        high_val = float(np.percentile(valid_data, self.percentile_high))

        # Ensure we don't have identical values
        if low_val == high_val:
            low_val = float(np.nanmin(valid_data))
            high_val = float(np.nanmax(valid_data))

        return low_val, high_val

    def stretch_16bit_to_8bit(self, data: np.ndarray) -> np.ndarray:
        """
        Convert 16-bit data to 8-bit using percentile-based linear stretch.

        Args:
            data: 16-bit input array

        Returns:
            8-bit output array (0-255)
        """
        # Handle multiple bands
        if len(data.shape) == 3:
            output = np.zeros(data.shape, dtype=np.uint8)
            for band in range(data.shape[0]):
                output[band] = self.stretch_16bit_to_8bit(data[band])
            return output

        # Single band processing
        stretched = data.astype(np.float32)
        low_val, high_val = self.get_percentile_stretch_values(stretched)

        # Linear stretch: (value - low) / (high - low) * 255
        stretched = np.clip((stretched - low_val) / (high_val - low_val) * 255, 0, 255)

        return stretched.astype(np.uint8)

    def extract_corner_coordinates(
        self, filepath: str
    ) -> Tuple[List[Tuple[float, float]], str]:
        """
        Extract the four corner coordinates of the image.

        Args:
            filepath: Path to the TIFF file

        Returns:
            Tuple of (list of corner coordinates in WGS84, crs_string)
            Corners in order: (top-left, top-right, bottom-left, bottom-right)
        """
        with rasterio.open(filepath) as src:
            # Get image dimensions
            height = src.height
            width = src.width
            transform = src.transform
            crs = src.crs
            bounds = src.bounds

            # Calculate corner coordinates in pixel space
            pixel_corners = [
                (0, 0),  # top-left
                (width, 0),  # top-right
                (0, height),  # bottom-left
                (width, height),  # bottom-right
            ]

            # Convert pixel coordinates to geographic coordinates using the transform
            geo_corners = [xy(transform, px, py) for px, py in pixel_corners]

            # If not in WGS84, reproject
            if crs != rasterio.crs.CRS.from_epsg(4326):
                from rasterio.warp import transform

                geo_corners_wgs84 = []
                for lon, lat in geo_corners:
                    xs, ys = transform(crs, rasterio.crs.CRS.from_epsg(4326), [lon], [lat])
                    geo_corners_wgs84.append((xs[0], ys[0]))
                geo_corners = geo_corners_wgs84

            return geo_corners, str(crs)

    def generate_gcp_file(
        self, input_filepath: str, corner_coords: List[Tuple[float, float]], output_dir: str
    ) -> str:
        """
        Generate a GCP CSV file for MapWarper bulk import.

        MapWarper GCP format: x,y,lon,lat
        where x,y are image pixel coordinates, lon,lat are geographic coordinates

        Args:
            input_filepath: Original TIFF filepath (for metadata)
            corner_coords: List of (lon, lat) tuples for corners
            output_dir: Directory to save the GCP file

        Returns:
            Path to the generated GCP file
        """
        with rasterio.open(input_filepath) as src:
            width = src.width
            height = src.height

        # Define pixel coordinates for the four corners
        pixel_coords = [
            (0, 0),  # top-left
            (width, 0),  # top-right
            (0, height),  # bottom-left
            (width, height),  # bottom-right
        ]

        # Define the GCP file path
        base_name = Path(input_filepath).stem
        gcp_filepath = os.path.join(output_dir, f"{base_name}_gcps.csv")

        # Write GCP file in MapWarper format
        with open(gcp_filepath, "w", newline="") as f:
            writer = csv.writer(f)
            # MapWarper header
            writer.writerow(["x", "y", "lon", "lat"])

            # Write corner points
            for (px, py), (lon, lat) in zip(pixel_coords, corner_coords):
                writer.writerow([px, py, lon, lat])

        return gcp_filepath

    def convert_tiff_to_jpeg(self, input_filepath: str, output_dir: Optional[str] = None) -> str:
        """
        Convert a single TIFF to JPEG with bit-depth conversion.

        Args:
            input_filepath: Path to input TIFF file
            output_dir: Output directory (uses input dir if not specified)

        Returns:
            Path to the output JPEG file

        Raises:
            ValueError: If TIFF is not georeferenced
        """
        # Validate georeferencing
        if not self.validate_georeference(input_filepath):
            raise ValueError(
                f"TIFF file is not properly georeferenced: {input_filepath}\n"
                "Ensure the file contains CRS and transform information."
            )

        # Determine output directory
        if output_dir is None:
            output_dir = os.path.dirname(input_filepath) or "."
        os.makedirs(output_dir, exist_ok=True)

        # Read TIFF data
        with rasterio.open(input_filepath) as src:
            data = src.read()
            profile = src.profile

            # Determine how to handle bands
            if src.count == 1:
                # Single band
                img_array = self.stretch_16bit_to_8bit(data[0])
                jpeg_data = Image.fromarray(img_array, mode="L")
            elif src.count == 3:
                # RGB
                img_array = np.zeros((src.height, src.width, 3), dtype=np.uint8)
                for i in range(3):
                    img_array[:, :, i] = self.stretch_16bit_to_8bit(data[i])
                jpeg_data = Image.fromarray(img_array, mode="RGB")
            elif src.count == 4:
                # RGBA
                img_array = np.zeros((src.height, src.width, 4), dtype=np.uint8)
                for i in range(4):
                    img_array[:, :, i] = self.stretch_16bit_to_8bit(data[i])
                jpeg_data = Image.fromarray(img_array, mode="RGBA")
            else:
                raise ValueError(f"Unsupported number of bands: {src.count}")

        # Save JPEG
        base_name = Path(input_filepath).stem
        jpeg_filepath = os.path.join(output_dir, f"{base_name}.jpg")
        jpeg_data.save(jpeg_filepath, "JPEG", quality=self.jpeg_quality, optimize=True)

        return jpeg_filepath

    def process_file(self, input_filepath: str) -> Dict[str, str]:
        """
        Process a single TIFF file (convert to JPEG and generate GCPs).

        Args:
            input_filepath: Path to input TIFF file

        Returns:
            Dictionary with 'jpeg' and 'gcp' file paths

        Raises:
            Various exceptions if processing fails
        """
        print(f"\nProcessing: {input_filepath}")

        output_dir = self.output_dir or os.path.dirname(input_filepath) or "."

        try:
            # Convert TIFF to JPEG
            jpeg_path = self.convert_tiff_to_jpeg(input_filepath, output_dir)
            print(f"  ✓ JPEG created: {jpeg_path}")

            # Extract corner coordinates
            corner_coords, crs = self.extract_corner_coordinates(input_filepath)
            print(f"  ✓ Coordinates extracted (CRS: {crs})")

            # Generate GCP file
            gcp_path = self.generate_gcp_file(input_filepath, corner_coords, output_dir)
            print(f"  ✓ GCP file created: {gcp_path}")

            return {"jpeg": jpeg_path, "gcp": gcp_path}

        except Exception as e:
            print(f"  ✗ Error processing file: {e}")
            raise

    def process_directory(self, directory: str) -> List[Dict[str, str]]:
        """
        Process all TIFF files in a directory.

        Args:
            directory: Path to directory containing TIFF files

        Returns:
            List of dictionaries with 'jpeg' and 'gcp' file paths for each processed file
        """
        tiff_files = list(Path(directory).glob("*.tif")) + list(Path(directory).glob("*.tiff"))

        if not tiff_files:
            print(f"No TIFF files found in: {directory}")
            return []

        print(f"Found {len(tiff_files)} TIFF file(s) to process")

        results = []
        for tiff_file in tiff_files:
            try:
                result = self.process_file(str(tiff_file))
                results.append(result)
            except Exception as e:
                print(f"Failed to process {tiff_file}: {e}")
                continue

        return results


def main():
    """Command-line interface for the converter."""
    parser = argparse.ArgumentParser(
        description="Convert georeferenced TIFFs to JPEGs with MapWarper GCP files",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single file
  python geotiff_to_mapwarper.py input.tif
  
  # Process directory
  python geotiff_to_mapwarper.py /path/to/tiffs/
  
  # Custom percentiles and output directory
  python geotiff_to_mapwarper.py input.tif --percentile-low 5 --percentile-high 95 --output-dir ./output
  
  # Adjust JPEG quality
  python geotiff_to_mapwarper.py input.tif --jpeg-quality 85
        """,
    )

    parser.add_argument(
        "input",
        help="Path to input TIFF file or directory of TIFF files",
    )

    parser.add_argument(
        "--percentile-low",
        type=int,
        default=2,
        help="Lower percentile for stretch (default: 2)",
        metavar="N",
    )

    parser.add_argument(
        "--percentile-high",
        type=int,
        default=98,
        help="Upper percentile for stretch (default: 98)",
        metavar="N",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Output directory for JPEG and GCP files (default: input directory)",
        metavar="PATH",
    )

    parser.add_argument(
        "--jpeg-quality",
        type=int,
        default=95,
        help="JPEG quality 1-100 (default: 95)",
        metavar="N",
    )

    args = parser.parse_args()

    # Validate percentiles
    if not (0 <= args.percentile_low < args.percentile_high <= 100):
        print(
            f"Error: Invalid percentiles. Must satisfy: 0 <= {args.percentile_low} < {args.percentile_high} <= 100"
        )
        sys.exit(1)

    # Validate JPEG quality
    if not (1 <= args.jpeg_quality <= 100):
        print(f"Error: JPEG quality must be between 1 and 100, got {args.jpeg_quality}")
        sys.exit(1)

    # Initialize converter
    converter = TIFFToMapWarperConverter(
        percentile_low=args.percentile_low,
        percentile_high=args.percentile_high,
        output_dir=args.output_dir,
        jpeg_quality=args.jpeg_quality,
    )

    # Process input
    input_path = args.input
    if not os.path.exists(input_path):
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)

    try:
        if os.path.isdir(input_path):
            results = converter.process_directory(input_path)
        else:
            result = converter.process_file(input_path)
            results = [result]

        # Summary
        print("\n" + "=" * 60)
        print(f"Successfully processed {len(results)} file(s)")
        print("=" * 60)
        for result in results:
            print(f"  JPEG: {result['jpeg']}")
            print(f"  GCP:  {result['gcp']}")

    except Exception as e:
        print(f"\nFatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
