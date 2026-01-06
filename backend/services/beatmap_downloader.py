"""
Service for downloading and extracting osu! beatmaps.

Downloads .osz files from mirror and extracts them to local storage.
"""
import json
import re
import zipfile
from pathlib import Path

import httpx

from config import Config
from services.osu_parser import parse_osu_file


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

                # Auto-generate notes.json files
                notes_result = self.generate_notes_json(beatmapset_id)

                return {
                    "status": "downloaded",
                    "beatmapset_id": beatmapset_id,
                    "path": str(extract_path),
                    "files_count": len(files),
                    "notes_generated": notes_result.get("generated", []),
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

    def generate_notes_json(self, beatmapset_id: str) -> dict:
        """
        Parse all .osu files in a beatmapset and generate notes JSON files.

        Creates a 'notes' subdirectory with JSON files for each difficulty.

        Args:
            beatmapset_id: The osu! beatmapset ID.

        Returns:
            Dict with status and list of generated files.
        """
        path = self.get_beatmapset_path(beatmapset_id)
        if not path.exists():
            return {"status": "error", "error": "Beatmapset not found"}

        notes_dir = path / "notes"
        notes_dir.mkdir(exist_ok=True)

        generated = []
        errors = []

        # Find background image
        bg_file = None
        for f in path.iterdir():
            if f.suffix.lower() in (".jpg", ".jpeg", ".png") and "bg" in f.name.lower():
                bg_file = f.name
                break
        # Fallback to first image if no bg found
        if not bg_file:
            for f in path.iterdir():
                if f.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    bg_file = f.name
                    break

        for osu_file in path.glob("*.osu"):
            try:
                parsed = parse_osu_file(str(osu_file))

                # Use audio file from the .osu file's [General] section
                audio_file = parsed["metadata"].get("audio_filename", "")

                # Add audio, background, and timing info
                output = {
                    "metadata": parsed["metadata"],
                    "audio_file": audio_file,
                    "background_file": bg_file,
                    "notes": parsed["notes"],
                    "timing_points": parsed.get("timing_points", []),
                }

                # Use a sanitized filename based on difficulty name
                diff_name = parsed["metadata"]["version"]
                safe_name = "".join(c if c.isalnum() or c in "._- " else "_" for c in diff_name)
                json_filename = f"{safe_name}.json"
                json_path = notes_dir / json_filename

                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(output, f, ensure_ascii=False)

                generated.append({
                    "osu_file": osu_file.name,
                    "json_file": json_filename,
                    "notes_count": len(parsed["notes"]),
                })

            except Exception as e:
                errors.append({
                    "osu_file": osu_file.name,
                    "error": str(e),
                })

        return {
            "status": "success" if generated else "error",
            "beatmapset_id": beatmapset_id,
            "generated": generated,
            "errors": errors,
        }

    def get_notes_json(self, beatmapset_id: str, difficulty: str | None = None) -> dict | None:
        """
        Get parsed notes JSON for a beatmapset.

        Args:
            beatmapset_id: The osu! beatmapset ID.
            difficulty: Optional specific difficulty name. If None, returns first found.

        Returns:
            Parsed notes data or None if not found.
        """
        path = self.get_beatmapset_path(beatmapset_id)
        notes_dir = path / "notes"

        if not notes_dir.exists():
            # Try to generate if not exists
            self.generate_notes_json(beatmapset_id)

        if not notes_dir.exists():
            return None

        json_files = list(notes_dir.glob("*.json"))
        if not json_files:
            return None

        # Find specific difficulty or return first
        target_file = None
        if difficulty:
            # Strip [#K] prefix (e.g., "[4K] " or "[7K] ") that osu! API adds
            clean_diff = re.sub(r'^\[\d+K\]\s*', '', difficulty)
            safe_diff = "".join(c if c.isalnum() or c in "._- " else "_" for c in clean_diff)
            for jf in json_files:
                # Check both directions - difficulty in filename or filename in difficulty
                if safe_diff.lower() in jf.stem.lower() or jf.stem.lower() in safe_diff.lower():
                    target_file = jf
                    break
        if not target_file:
            target_file = json_files[0]

        with open(target_file, "r", encoding="utf-8") as f:
            return json.load(f)


# Singleton instance
beatmap_downloader = BeatmapDownloader()
