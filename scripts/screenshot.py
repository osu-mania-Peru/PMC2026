#!/usr/bin/env python3
"""Take screenshots of the frontend for layout review."""
import sys
from playwright.sync_api import sync_playwright

def screenshot(url: str = "http://localhost:5174", output: str = "/tmp/screenshot.png", width: int = 1920, height: int = 1080, full_page: bool = True):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": width, "height": height})
        page.goto(url, wait_until="networkidle")
        page.screenshot(path=output, full_page=full_page)
        browser.close()
        print(f"Screenshot saved to {output}")

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5174"
    output = sys.argv[2] if len(sys.argv) > 2 else "/tmp/screenshot.png"
    full_page = sys.argv[3] != "viewport" if len(sys.argv) > 3 else True
    screenshot(url, output, full_page=full_page)
