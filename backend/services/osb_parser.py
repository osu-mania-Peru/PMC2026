"""
Service for parsing osu! storyboard .osb files.

Standalone storyboard files that apply to all difficulties in a beatmapset.
Uses the same format as the [Events] section in .osu files.
"""
from pathlib import Path

from services.osu_parser import (
    LAYER_MAP,
    ORIGIN_MAP,
    StoryboardCommand,
    StoryboardData,
    StoryboardSprite,
)


def parse_osb_file(file_path: str) -> StoryboardData | None:
    """
    Parse a standalone osu! storyboard .osb file.

    The .osb format is identical to the [Events] section in .osu files,
    but without the section header. It contains:
    - Sprite declarations: Sprite,layer,origin,"filepath",x,y
    - Animation declarations: Animation,layer,origin,"filepath",x,y,frameCount,frameDelay,loopType
    - Commands for sprites (indented with _ or spaces)

    Args:
        file_path: Path to the .osb file.

    Returns:
        StoryboardData dictionary with sprites, commands, and image list.
        Returns None if file doesn't exist or no storyboard elements found.
    """
    path = Path(file_path)

    if not path.exists():
        return None

    # Read file with UTF-8 encoding, handling BOM if present
    try:
        content = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        # Fallback to latin-1 for older files
        content = path.read_text(encoding="latin-1")

    lines = content.splitlines()

    if not lines:
        return None

    sprites: list[StoryboardSprite] = []
    commands: list[StoryboardCommand] = []
    images: list[str] = []
    current_sprite_id = -1
    sprite_id_counter = 0

    # For handling loops and triggers
    in_loop = False
    loop_command: StoryboardCommand | None = None

    # Skip to [Events] section if it exists (some .osb files have it)
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "[Events]":
            lines = lines[i + 1 :]
            break
        # If we hit another section before [Events], stop
        if stripped.startswith("[") and stripped.endswith("]"):
            continue
        # If we find storyboard content without [Events] header, process from start
        if stripped.startswith(("Sprite,", "Animation,", "_")):
            break

    for line in lines:
        stripped = line.strip()

        # Stop at next section
        if stripped.startswith("[") and stripped.endswith("]"):
            break

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
        "widescreen": False,  # .osb files don't have widescreen flag, it's in .osu
    }


def merge_storyboards(
    osb_storyboard: StoryboardData | None,
    osu_storyboard: StoryboardData | None,
) -> StoryboardData | None:
    """
    Merge .osb storyboard with difficulty-specific .osu storyboard.

    The .osb storyboard applies to all difficulties, while .osu storyboard
    is specific to one difficulty. They are merged together with .osu
    sprite IDs offset to avoid conflicts.

    Args:
        osb_storyboard: Storyboard from .osb file (applies to all diffs).
        osu_storyboard: Storyboard from .osu file (difficulty-specific).

    Returns:
        Merged StoryboardData or None if both are empty.
    """
    if not osb_storyboard and not osu_storyboard:
        return None

    if not osb_storyboard:
        return osu_storyboard

    if not osu_storyboard:
        return osb_storyboard

    # Start with .osb storyboard as base
    merged_sprites = list(osb_storyboard["sprites"])
    merged_commands = list(osb_storyboard["commands"])
    merged_images = list(osb_storyboard["images"])

    # Calculate ID offset for .osu sprites
    max_osb_id = max((s["id"] for s in merged_sprites), default=-1)
    id_offset = max_osb_id + 1

    # Add .osu sprites with offset IDs
    for sprite in osu_storyboard["sprites"]:
        new_sprite = dict(sprite)
        new_sprite["id"] = sprite["id"] + id_offset
        merged_sprites.append(new_sprite)  # type: ignore

    # Add .osu commands with offset sprite IDs
    for command in osu_storyboard["commands"]:
        new_command = dict(command)
        new_command["sprite_id"] = command["sprite_id"] + id_offset
        # Also offset sub_commands if present
        if command["sub_commands"]:
            new_sub = []
            for sub in command["sub_commands"]:
                new_sub_cmd = dict(sub)
                new_sub_cmd["sprite_id"] = sub["sprite_id"] + id_offset
                new_sub.append(new_sub_cmd)
            new_command["sub_commands"] = new_sub
        merged_commands.append(new_command)  # type: ignore

    # Merge images (avoid duplicates)
    for img in osu_storyboard["images"]:
        if img not in merged_images:
            merged_images.append(img)

    # Use widescreen from .osu storyboard (that's where the flag is defined)
    widescreen = osu_storyboard.get("widescreen", False)

    return {
        "sprites": merged_sprites,
        "commands": merged_commands,
        "images": merged_images,
        "widescreen": widescreen,
    }
