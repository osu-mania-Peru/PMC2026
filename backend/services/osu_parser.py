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


class TimingPoint(TypedDict):
    """Type definition for a timing/SV point."""

    time: int
    sv: float  # Scroll velocity multiplier (1.0 = normal)
    bpm: float | None  # BPM if uninherited point, None if inherited


class StoryboardSprite(TypedDict):
    """Type definition for a storyboard sprite or animation."""

    id: int
    type: Literal["sprite", "animation"]
    layer: int  # 0=Background, 1=Fail, 2=Pass, 3=Foreground
    origin: int  # 0=TopLeft, 1=Centre, 2=CentreLeft, etc.
    filepath: str
    x: float
    y: float
    # Animation-specific fields (optional)
    frame_count: int | None
    frame_delay: float | None
    loop_type: str | None  # "LoopForever" or "LoopOnce"


class StoryboardCommand(TypedDict):
    """Type definition for a storyboard command."""

    sprite_id: int
    type: str  # F, M, S, R, C, V, P, L, T
    easing: int
    start_time: int
    end_time: int
    params: list[float]  # Command-specific parameters
    # For loops/triggers
    loop_count: int | None
    sub_commands: list["StoryboardCommand"] | None


class StoryboardData(TypedDict):
    """Type definition for complete storyboard data."""

    sprites: list[StoryboardSprite]
    commands: list[StoryboardCommand]
    images: list[str]  # List of image paths for preloading


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
    timing_points: list[TimingPoint]
    storyboard: StoryboardData | None


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


def parse_timing_points(lines: list[str]) -> list[TimingPoint]:
    """
    Extract timing points from the [TimingPoints] section.

    Timing point format: time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects

    For uninherited points (red lines): beatLength = ms per beat, SV = 1.0
    For inherited points (green lines): SV = -100 / beatLength

    Args:
        lines: All lines from the .osu file.

    Returns:
        List of timing points with time, sv multiplier, and optionally bpm.
    """
    timing_points: list[TimingPoint] = []
    in_timing_points = False

    for line in lines:
        line = line.strip()

        # Detect [TimingPoints] section
        if line == "[TimingPoints]":
            in_timing_points = True
            continue

        # Detect start of a new section
        if line.startswith("[") and line.endswith("]"):
            if in_timing_points:
                break
            continue

        if not in_timing_points:
            continue

        # Skip empty lines
        if not line:
            continue

        # Parse timing point: time,beatLength,meter,sampleSet,sampleIndex,volume,uninherited,effects
        parts = line.split(",")
        if len(parts) < 2:
            continue

        try:
            time = int(float(parts[0]))
            beat_length = float(parts[1])

            # Check if uninherited (index 6, default to 1 for old formats)
            uninherited = int(parts[6]) if len(parts) > 6 else 1

            if uninherited == 1:
                # Uninherited point (red line) - defines BPM
                # beatLength is ms per beat, BPM = 60000 / beatLength
                bpm = 60000 / beat_length if beat_length > 0 else 120
                timing_point: TimingPoint = {
                    "time": time,
                    "sv": 1.0,
                    "bpm": bpm,
                }
            else:
                # Inherited point (green line) - defines SV
                # beatLength is negative, SV = -100 / beatLength
                sv = -100 / beat_length if beat_length < 0 else 1.0
                # Clamp SV to extended range (allows freeze/teleport effects)
                sv = max(0.01, min(40.0, sv))
                timing_point = {
                    "time": time,
                    "sv": sv,
                    "bpm": None,
                }

            timing_points.append(timing_point)

        except (ValueError, ZeroDivisionError):
            continue

    # Sort by time
    timing_points.sort(key=lambda tp: tp["time"])

    return timing_points


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


# Layer name to number mapping
LAYER_MAP = {
    "Background": 0,
    "Fail": 1,
    "Pass": 2,
    "Foreground": 3,
}

# Origin name to number mapping
ORIGIN_MAP = {
    "TopLeft": 0,
    "Centre": 1,
    "CentreLeft": 2,
    "TopRight": 3,
    "BottomCentre": 4,
    "TopCentre": 5,
    "Custom": 6,
    "CentreRight": 7,
    "BottomLeft": 8,
    "BottomRight": 9,
}


def parse_storyboard(lines: list[str]) -> StoryboardData | None:
    """
    Parse storyboard elements from the [Events] section.

    The [Events] section contains:
    - Background declarations: 0,0,"filename",0,0
    - Video declarations: Video,startTime,"filename"
    - Sprite declarations: Sprite,layer,origin,"filepath",x,y
    - Animation declarations: Animation,layer,origin,"filepath",x,y,frameCount,frameDelay,loopType
    - Commands for sprites (indented with _ or spaces)

    Args:
        lines: All lines from the .osu file.

    Returns:
        StoryboardData dictionary with sprites, commands, and image list.
        Returns None if no storyboard elements are found.
    """
    sprites: list[StoryboardSprite] = []
    commands: list[StoryboardCommand] = []
    images: list[str] = []
    in_events = False
    current_sprite_id = -1
    sprite_id_counter = 0

    # For handling loops and triggers
    in_loop = False
    loop_command: StoryboardCommand | None = None

    for line in lines:
        stripped = line.strip()

        # Detect [Events] section
        if stripped == "[Events]":
            in_events = True
            continue

        # Detect start of a new section
        if stripped.startswith("[") and stripped.endswith("]"):
            if in_events:
                break
            continue

        if not in_events:
            continue

        # Skip empty lines and comments
        if not stripped or stripped.startswith("//"):
            continue

        # Check if this is a command (starts with _ or space followed by command)
        is_command = line.startswith("_") or line.startswith(" ")

        # Count indentation depth (1 = regular command, 2+ = inside loop/trigger)
        indent_depth = 0
        for ch in line:
            if ch in (" ", "_"):
                indent_depth += 1
            else:
                break

        # If we're in a loop but this command has depth 1, close the loop first
        if in_loop and loop_command and is_command and indent_depth == 1:
            commands.append(loop_command)
            in_loop = False
            loop_command = None

        if is_command and current_sprite_id >= 0:
            # Parse command
            cmd_line = stripped.lstrip("_")
            parts = cmd_line.split(",")
            if not parts:
                continue

            cmd_type = parts[0]

            # Handle loop start
            if cmd_type == "L" and len(parts) >= 3:
                try:
                    start_time = int(parts[1])
                    loop_count = int(parts[2])
                    loop_command = {
                        "sprite_id": current_sprite_id,
                        "type": "L",
                        "easing": 0,
                        "start_time": start_time,
                        "end_time": start_time,
                        "params": [],
                        "loop_count": loop_count,
                        "sub_commands": [],
                    }
                    in_loop = True
                except ValueError:
                    continue
            # Handle trigger start
            elif cmd_type == "T" and len(parts) >= 4:
                try:
                    # parts[1] is trigger_name (e.g., "HitSound", "Passing", "Failing")
                    trigger_name = parts[1]
                    start_time = int(parts[2])
                    end_time = int(parts[3]) if len(parts) > 3 else start_time
                    loop_command = {
                        "sprite_id": current_sprite_id,
                        "type": "T",
                        "easing": 0,
                        "start_time": start_time,
                        "end_time": end_time,
                        "params": [],
                        "loop_count": None,
                        "sub_commands": [],
                        "trigger_name": trigger_name,
                    }
                    in_loop = True
                except ValueError:
                    continue
            # Handle regular commands
            elif cmd_type in ("F", "M", "MX", "MY", "S", "V", "R", "C", "P"):
                try:
                    easing = int(parts[1]) if len(parts) > 1 else 0
                    start_time = int(parts[2]) if len(parts) > 2 else 0
                    # End time can be empty string for instantaneous commands
                    end_time_str = parts[3] if len(parts) > 3 else ""
                    end_time = int(end_time_str) if end_time_str else start_time

                    # Parse parameters (remaining values)
                    params = []
                    for p in parts[4:]:
                        if p:  # Skip empty strings
                            try:
                                params.append(float(p))
                            except ValueError:
                                pass

                    command: StoryboardCommand = {
                        "sprite_id": current_sprite_id,
                        "type": cmd_type,
                        "easing": easing,
                        "start_time": start_time,
                        "end_time": end_time,
                        "params": params,
                        "loop_count": None,
                        "sub_commands": None,
                    }

                    if in_loop and loop_command and loop_command["sub_commands"] is not None:
                        loop_command["sub_commands"].append(command)
                    else:
                        commands.append(command)
                except (ValueError, IndexError):
                    continue
        else:
            # Close any open loop
            if in_loop and loop_command:
                commands.append(loop_command)
                in_loop = False
                loop_command = None

            # Parse object declaration
            parts = stripped.split(",")
            obj_type = parts[0]

            if obj_type == "Sprite" and len(parts) >= 6:
                try:
                    layer_str = parts[1]
                    origin_str = parts[2]
                    # Filepath may have quotes
                    filepath = parts[3].strip('"')
                    x = float(parts[4])
                    y = float(parts[5])

                    # Convert layer/origin names to numbers
                    layer = LAYER_MAP.get(layer_str, int(layer_str) if layer_str.isdigit() else 0)
                    origin = ORIGIN_MAP.get(origin_str, int(origin_str) if origin_str.isdigit() else 1)

                    sprite: StoryboardSprite = {
                        "id": sprite_id_counter,
                        "type": "sprite",
                        "layer": layer,
                        "origin": origin,
                        "filepath": filepath,
                        "x": x,
                        "y": y,
                        "frame_count": None,
                        "frame_delay": None,
                        "loop_type": None,
                    }
                    sprites.append(sprite)
                    current_sprite_id = sprite_id_counter
                    sprite_id_counter += 1

                    if filepath not in images:
                        images.append(filepath)
                except (ValueError, IndexError):
                    continue

            elif obj_type == "Animation" and len(parts) >= 9:
                try:
                    layer_str = parts[1]
                    origin_str = parts[2]
                    filepath = parts[3].strip('"')
                    x = float(parts[4])
                    y = float(parts[5])
                    frame_count = int(parts[6])
                    frame_delay = float(parts[7])
                    loop_type = parts[8] if len(parts) > 8 else "LoopForever"

                    layer = LAYER_MAP.get(layer_str, int(layer_str) if layer_str.isdigit() else 0)
                    origin = ORIGIN_MAP.get(origin_str, int(origin_str) if origin_str.isdigit() else 1)

                    anim_sprite: StoryboardSprite = {
                        "id": sprite_id_counter,
                        "type": "animation",
                        "layer": layer,
                        "origin": origin,
                        "filepath": filepath,
                        "x": x,
                        "y": y,
                        "frame_count": frame_count,
                        "frame_delay": frame_delay,
                        "loop_type": loop_type,
                    }
                    sprites.append(anim_sprite)
                    current_sprite_id = sprite_id_counter
                    sprite_id_counter += 1

                    # For animations, add all frame images
                    # Animation files are named like "file0.png", "file1.png", etc.
                    base_path = filepath.rsplit(".", 1)[0] if "." in filepath else filepath
                    ext = filepath.rsplit(".", 1)[1] if "." in filepath else "png"
                    for i in range(frame_count):
                        frame_path = f"{base_path}{i}.{ext}"
                        if frame_path not in images:
                            images.append(frame_path)
                except (ValueError, IndexError):
                    continue

    # Close any remaining open loop
    if in_loop and loop_command:
        commands.append(loop_command)

    # Return None if no storyboard elements found
    if not sprites and not commands:
        return None

    return {
        "sprites": sprites,
        "commands": commands,
        "images": images,
    }


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

    # Parse metadata, timing points, hit objects, and storyboard
    metadata_dict = parse_metadata(lines)
    key_count = int(metadata_dict.get("keys", 4))
    timing_points = parse_timing_points(lines)
    notes = parse_hit_objects(lines, key_count)
    storyboard = parse_storyboard(lines)

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
        "timing_points": timing_points,
        "storyboard": storyboard,
    }

    return result
