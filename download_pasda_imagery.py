#!/usr/bin/env python3
"""
Download all ZIP files from PASDA Imagery directory with parallel downloads,
progress tracking, and resume capability.
"""

import requests
from bs4 import BeautifulSoup
from pathlib import Path
from urllib.parse import urljoin
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
import os
import sys

# ============================================================================
# CONFIGURATION - Modify these settings as needed
# ============================================================================

URL = "https://www.pasda.psu.edu/download/philacity/data/Imagery2019/"
OUTPUT_DIR = Path(r"C:\Users\benlieb\Documents\Jared Farmer\PASDA 2019 Philadelphia Imagery")

# Number of parallel downloads (adjust based on system resources)
MAX_WORKERS = 3

# Chunk size for downloading (8KB is good for most connections)
CHUNK_SIZE = 8192

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(OUTPUT_DIR / 'download.log') if OUTPUT_DIR.exists() else logging.NullHandler(),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============================================================================
# CORE FUNCTIONS
# ============================================================================

def get_zip_files(url):
    """
    Fetch the directory listing and extract all .zip file URLs.
    
    Args:
        url (str): The directory URL to scrape
        
    Returns:
        list: List of tuples (filename, full_url)
    """
    logger.info(f"Fetching directory listing from {url}")
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to fetch directory: {e}")
        return []
    
    soup = BeautifulSoup(response.content, 'html.parser')
    zip_files = []
    
    for link in soup.find_all('a'):
        href = link.get('href')
        if href and href.endswith('.zip'):
            file_url = urljoin(url, href)
            filename = href.split('/')[-1]
            zip_files.append((filename, file_url))
    
    logger.info(f"Found {len(zip_files)} ZIP files to download")
    return zip_files


def get_file_size(url):
    """
    Get the file size from URL headers without downloading.
    
    Args:
        url (str): The file URL
        
    Returns:
        int: File size in bytes, or 0 if unable to determine
    """
    try:
        response = requests.head(url, timeout=10)
        return int(response.headers.get('content-length', 0))
    except Exception as e:
        logger.warning(f"Could not determine size for {url}: {e}")
        return 0


def download_file(filename, file_url, output_dir):
    """
    Download a single file with resume capability and progress tracking.
    
    Args:
        filename (str): Name of the file to save
        file_url (str): URL to download from
        output_dir (Path): Directory to save to
        
    Returns:
        tuple: (success: bool, filename: str, error_message: str or None)
    """
    file_path = output_dir / filename
    
    try:
        # Get total file size
        total_size = get_file_size(file_url)
        
        # Check if file already exists and is complete
        if file_path.exists():
            if total_size > 0 and file_path.stat().st_size == total_size:
                logger.info(f"✓ {filename} already complete, skipping")
                return (True, filename, None)
            elif file_path.stat().st_size >= total_size and total_size > 0:
                logger.info(f"✓ {filename} already complete, skipping")
                return (True, filename, None)
        
        # Resumable download
        resume_header = {}
        if file_path.exists():
            resume_header = {'Range': f'bytes={file_path.stat().st_size}-'}
            logger.info(f"Resuming {filename} from byte {file_path.stat().st_size}")
        
        # Download with streaming
        response = requests.get(file_url, stream=True, headers=resume_header, timeout=30)
        response.raise_for_status()
        
        # Get size from response if available
        if not total_size and 'content-length' in response.headers:
            total_size = int(response.headers['content-length'])
        
        # Write to file with progress bar
        mode = 'ab' if file_path.exists() else 'wb'
        downloaded = file_path.stat().st_size if mode == 'ab' else 0
        
        with open(file_path, mode) as f:
            with tqdm(total=total_size, initial=downloaded, unit='B', unit_scale=True, 
                     desc=filename, leave=False) as pbar:
                for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                    if chunk:
                        f.write(chunk)
                        pbar.update(len(chunk))
        
        logger.info(f"✓ Downloaded {filename}")
        return (True, filename, None)
        
    except Exception as e:
        error_msg = f"Failed to download {filename}: {str(e)}"
        logger.error(error_msg)
        return (False, filename, error_msg)


def download_all_files(zip_files, output_dir, max_workers=3):
    """
    Download all files with parallel execution.
    
    Args:
        zip_files (list): List of (filename, url) tuples
        output_dir (Path): Output directory
        max_workers (int): Number of parallel downloads
        
    Returns:
        dict: Summary statistics
    """
    stats = {'total': len(zip_files), 'successful': 0, 'failed': 0, 'skipped': 0, 'errors': []}
    
    if not zip_files:
        logger.warning("No ZIP files found to download")
        return stats
    
    logger.info(f"Starting parallel downloads ({max_workers} workers)...")
    logger.info("Press Ctrl+C to pause/stop. Run again to resume.\n")
    
    executor = ThreadPoolExecutor(max_workers=max_workers)
    try:
        futures = {
            executor.submit(download_file, filename, url, output_dir): (filename, url)
            for filename, url in zip_files
        }
        
        for future in tqdm(as_completed(futures), total=len(futures), desc="Overall Progress"):
            success, filename, error = future.result()
            
            if success:
                stats['successful'] += 1
            else:
                stats['failed'] += 1
                stats['errors'].append((filename, error))
    
    except KeyboardInterrupt:
        logger.info("\n\nDownload paused by user (Ctrl+C)")
        logger.info("Shutting down workers...")
        executor.shutdown(wait=False)
        raise
    finally:
        executor.shutdown(wait=True)
    
    return stats


def print_summary(stats):
    """Print download summary."""
    print("\n" + "=" * 70)
    print("DOWNLOAD SUMMARY")
    print("=" * 70)
    print(f"Total files:    {stats['total']}")
    print(f"Successful:     {stats['successful']}")
    print(f"Failed:         {stats['failed']}")
    if stats['errors']:
        print("\nErrors:")
        for filename, error in stats['errors']:
            print(f"  - {filename}: {error}")
    print("=" * 70)
    logger.info(f"Download complete: {stats['successful']}/{stats['total']} successful")


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point."""
    print(f"PASDA Imagery Downloader")
    print(f"Source: {URL}")
    print(f"Destination: {OUTPUT_DIR}")
    print()
    
    # Create output directory
    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Output directory ready: {OUTPUT_DIR}")
    except Exception as e:
        logger.error(f"Failed to create output directory: {e}")
        sys.exit(1)
    
    try:
        # Get list of files
        zip_files = get_zip_files(URL)
        if not zip_files:
            logger.error("No ZIP files found. Check the URL or internet connection.")
            sys.exit(1)
        
        # Download files
        stats = download_all_files(zip_files, OUTPUT_DIR, max_workers=MAX_WORKERS)
        
        # Print summary
        print_summary(stats)
        
        # Exit with appropriate code
        sys.exit(0 if stats['failed'] == 0 else 1)
    
    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("DOWNLOAD PAUSED")
        print("=" * 70)
        print("Your progress has been saved.")
        print("Run the script again to resume downloading remaining files.")
        print("=" * 70)
        logger.info("Script interrupted by user")
        sys.exit(0)


if __name__ == '__main__':
    main()
