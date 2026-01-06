"""
Service for parsing osu!mania .osu files.

Extracts metadata and note data from the text-based osu file format.
"""
from pathlib import Path
from typing import Literal, TypedDict


class TapNote(TypedDict):
    """Type definition for a tap note."""

    col: int
    time: int
    type: Literal["tap"]


class HoldNote(TypedDict):
    """Type definition for a hold note."""

    col: int
    time: int
    type: Literal["hold"]
    end: int


NoteData = TapNote | HoldNote


class MetadataDict(TypedDict):
    """Type definition for beatmap metadata."""

    title: str
    artist: str
    creator: str
    version: str
    keys: int
    audio_filename: str


class ParsedBeatmap(TypedDict):
    """Type definition for the complete parsed beatmap."""

    metadata: MetadataDict
    notes: list[NoteData]


def parse_metadata(lines: list[str]) -> dict[str, str | int]:
    """
    Extract metadata from [General], [Metadata] and [Difficulty] sections.

    Args:
        lines: All lines from the .osu file.

    Returns:
        Dictionary containing title, artist, creator, version, keys, and audio_filename.
    """
    metadata: dict[str, str | int] = {
        "title": "",
        "artist": "",
        "creator": "",
        "version": "",
        "keys": 4,
        "audio_filename": "",
    }

    current_section = ""

    for line in lines:
        line = line.strip()

        # Detect section headers
        if line.startswith("[") and line.endswith("]"):
            current_section = line[1:-1]
            continue

        # Skip empty lines or lines without key-value pairs
        if ":" not in line:
            continue

        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        if current_section == "General":
            if key == "AudioFilename":
                metadata["audio_filename"] = value

        elif current_section == "Metadata":
            if key == "Title":
                metadata["title"] = value
            elif key == "Artist":
                metadata["artist"] = value
            elif key == "Creator":
                metadata["creator"] = value
            elif key == "Version":
                metadata["version"] = value

        elif current_section == "Difficulty":
            if key == "CircleSize":
                try:
                    metadata["keys"] = int(float(value))
                except ValueError:
                    metadata["keys"] = 4

    return metadata


def parse_hit_objects(lines: list[str], key_count: int) -> list[NoteData]:
    """
    Extract notes from the [HitObjects] section.

    Args:
        lines: All lines from the .osu file.
        key_count: Number of keys (columns) in the beatmap.

    Returns:
        List of note dictionaries with col, time, type, and optionally end.
    """
    notes: list[NoteData] = []
    in_hit_objects = False

    for line in lines:
        line = line.strip()

        # Detect [HitObjects] section
        if line == "[HitObjects]":
            in_hit_objects = True
            continue

        # Detect start of a new section (exit HitObjects)
        if line.startswith("[") and line.endswith("]"):
            if in_hit_objects:
                break
            continue

        if not in_hit_objects:
            continue

        # Skip empty lines
        if not line:
            continue

        # Parse hit object line: x,y,time,type,hitSound,extras...
        parts = line.split(",")
        if len(parts) < 4:
            continue

        try:
            x = int(parts[0])
            time = int(parts[2])
            obj_type = int(parts[3])
        except ValueError:
            continue

        # Calculate column: floor(x * keyCount / 512)
        col = (x * key_count) // 512

        # Ensure column is within valid range
        col = max(0, min(col, key_count - 1))

        # Check note type using bitwise flags
        is_hold = bool(obj_type & 128)
        is_tap = bool(obj_type & 1)

        if is_hold:
            # Hold note format: x,y,time,128,hitSound,endTime:hitSample
            # The extras field contains endTime:hitSample
            if len(parts) >= 6:
                extras = parts[5]
                end_time_str = extras.split(":")[0]
                try:
                    end_time = int(end_time_str)
                except ValueError:
                    end_time = time

                hold_note: HoldNote = {
                    "col": col,
                    "time": time,
                    "type": "hold",
                    "end": end_time,
                }
                notes.append(hold_note)
        elif is_tap:
            tap_note: TapNote = {
                "col": col,
                "time": time,
                "type": "tap",
            }
            notes.append(tap_note)

    # Sort notes by time, then by column
    notes.sort(key=lambda n: (n["time"], n["col"]))

    return notes


def parse_osu_file(file_path: str) -> ParsedBeatmap:
    """
    Parse an osu!mania .osu file and extract note data.

    Args:
        file_path: Path to the .osu file.

    Returns:
        Dictionary containing metadata and notes.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file cannot be parsed.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Read file with UTF-8 encoding, handling BOM if present
    try:
        content = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        # Fallback to latin-1 for older beatmaps
        content = path.read_text(encoding="latin-1")

    lines = content.splitlines()

    if not lines:
        raise ValueError(f"Empty file: {file_path}")

    # Verify this is an osu file format
    first_line = lines[0].strip()
    if not first_line.startswith("osu file format"):
        raise ValueError(f"Invalid osu file format: {file_path}")

    # Parse metadata and hit objects
    metadata_dict = parse_metadata(lines)
    key_count = int(metadata_dict.get("keys", 4))
    notes = parse_hit_objects(lines, key_count)

    result: ParsedBeatmap = {
        "metadata": {
            "title": str(metadata_dict.get("title", "")),
            "artist": str(metadata_dict.get("artist", "")),
            "creator": str(metadata_dict.get("creator", "")),
            "version": str(metadata_dict.get("version", "")),
            "keys": key_count,
            "audio_filename": str(metadata_dict.get("audio_filename", "")),
        },
        "notes": notes,
    }

    return result
