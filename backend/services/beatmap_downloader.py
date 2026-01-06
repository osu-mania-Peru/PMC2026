"""
Service for downloading and extracting osu! beatmaps.

Downloads .osz files from mirror and extracts them to local storage.
"""
import zipfile
from pathlib import Path

import httpx

from config import Config


class BeatmapDownloader:
    """Downloads and extracts osu! beatmaps from mirror sites."""

    MIRROR_URL = "https://catboy.best/d/{beatmapset_id}"

    def __init__(self, storage_path: str | None = None):
        """
        Initialize the downloader.

        Args:
            storage_path: Directory to store extracted beatmaps.
                         Defaults to BEATMAP_STORAGE_PATH from config or ./beatmaps
        """
        self.storage_path = Path(
            storage_path
            or getattr(Config, 'BEATMAP_STORAGE_PATH', None)
            or './beatmaps'
        )
        self.storage_path.mkdir(parents=True, exist_ok=True)

    def get_beatmapset_path(self, beatmapset_id: str) -> Path:
        """Get the storage path for a beatmapset."""
        return self.storage_path / beatmapset_id

    def exists(self, beatmapset_id: str) -> bool:
        """Check if a beatmapset is already downloaded and extracted."""
        path = self.get_beatmapset_path(beatmapset_id)
        if not path.exists():
            return False
        # Check if it has any .osu files (valid extraction)
        osu_files = list(path.glob("*.osu"))
        return len(osu_files) > 0

    async def download(self, beatmapset_id: str, force: bool = False) -> dict:
        """
        Download and extract a beatmapset.

        Args:
            beatmapset_id: The osu! beatmapset ID.
            force: Re-download even if already exists.

        Returns:
            Dict with status and path info.
        """
        if not force and self.exists(beatmapset_id):
            return {
                "status": "exists",
                "beatmapset_id": beatmapset_id,
                "path": str(self.get_beatmapset_path(beatmapset_id)),
            }

        url = self.MIRROR_URL.format(beatmapset_id=beatmapset_id)

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
                response = await client.get(url)

                if response.status_code == 404:
                    return {
                        "status": "not_found",
                        "beatmapset_id": beatmapset_id,
                        "error": "Beatmapset not found on mirror",
                    }

                response.raise_for_status()

                # Save the .osz file temporarily
                osz_path = self.storage_path / f"{beatmapset_id}.osz"
                osz_path.write_bytes(response.content)

                # Extract the .osz (it's a ZIP file)
                extract_path = self.get_beatmapset_path(beatmapset_id)
                extract_path.mkdir(parents=True, exist_ok=True)

                with zipfile.ZipFile(osz_path, 'r') as zf:
                    zf.extractall(extract_path)

                # Remove the .osz file after extraction
                osz_path.unlink()

                # Get list of extracted files
                files = list(extract_path.iterdir())

                return {
                    "status": "downloaded",
                    "beatmapset_id": beatmapset_id,
                    "path": str(extract_path),
                    "files_count": len(files),
                }

        except httpx.HTTPStatusError as e:
            return {
                "status": "error",
                "beatmapset_id": beatmapset_id,
                "error": f"HTTP error: {e.response.status_code}",
            }
        except zipfile.BadZipFile:
            return {
                "status": "error",
                "beatmapset_id": beatmapset_id,
                "error": "Invalid .osz file (not a valid ZIP)",
            }
        except Exception as e:
            return {
                "status": "error",
                "beatmapset_id": beatmapset_id,
                "error": str(e),
            }

    def get_beatmap_files(self, beatmapset_id: str) -> dict:
        """
        Get info about files in a downloaded beatmapset.

        Returns:
            Dict with file listings by type.
        """
        path = self.get_beatmapset_path(beatmapset_id)
        if not path.exists():
            return {"exists": False}

        files = {
            "exists": True,
            "path": str(path),
            "osu_files": [],
            "audio_files": [],
            "image_files": [],
            "other_files": [],
        }

        for f in path.iterdir():
            name = f.name.lower()
            if name.endswith(".osu"):
                files["osu_files"].append(f.name)
            elif name.endswith((".mp3", ".ogg", ".wav")):
                files["audio_files"].append(f.name)
            elif name.endswith((".jpg", ".jpeg", ".png", ".gif")):
                files["image_files"].append(f.name)
            else:
                files["other_files"].append(f.name)

        return files


# Singleton instance
beatmap_downloader = BeatmapDownloader()
