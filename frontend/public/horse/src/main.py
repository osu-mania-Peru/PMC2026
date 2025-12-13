import random
import pygame


HORSE = "src/assets/horse.png"
RACECOURSE = "src/assets/racetrack.png"


class AssetLoader:
    def __init__(self):
        self.images: dict[str, pygame.Surface] = {}

    def load(self, name, path):
        self.images[name] = pygame.image.load(path).convert_alpha()

    def get(self, name):
        return self.images[name]


class Entity:
    def __init__(self, asset_loader: AssetLoader):
        self.asset_loader = asset_loader
        self.position = pygame.Vector2(0, 0)


class Horse(Entity):
    # Natural horse colors (R, G, B)
    HORSE_COLORS = [
        (139, 69, 19),  # Brown
        (101, 67, 33),  # Dark brown
        (210, 180, 140),  # Tan
        (139, 115, 85),  # Light brown
        (70, 50, 40),  # Dark chestnut
        (180, 140, 100),  # Palomino
        (255, 255, 255),  # White
        (50, 50, 50),  # Black
    ]

    def __init__(self, asset_loader, init_position, color_index=0, horse_number=1):
        super().__init__(asset_loader)

        # Horse identification
        self.number = horse_number  # Horse's racing number

        # Horse stats
        self.power = random.uniform(
            0.3, 1.0
        )  # Willingness to take risks (0.0 = cautious, 1.0 = aggressive)

        # Get base image and apply color tint
        base_image = asset_loader.get("HORSE")
        self.image = self.apply_color_tint(
            base_image, self.HORSE_COLORS[color_index % len(self.HORSE_COLORS)]
        )
        self.image = pygame.transform.smoothscale_by(self.image, 0.02)
        self.image = pygame.transform.rotate(self.image, 90)  # Rotate to face left

        self.rect = self.image.get_frect()
        self.rect.center = init_position
        self.base_velocity = 140  # Base cruising speed (reduced from 180)
        self.velocity = 0  # Current speed (start at 0!)
        self.max_velocity = 200  # Maximum speed in sprint zones (reduced from 400)
        self.acceleration = (
            80  # Acceleration rate from standing start (reduced from 120)
        )
        self.deceleration = 30  # Deceleration rate when leaving sprint zone
        self.steer_angle = 0  # 0 = facing left
        self.previous_steer_angle = 0  # For calculating angular velocity
        self.vector = pygame.Vector2(-1, 0)  # Left direction
        self.timer = 0
        self.random_steer_timer = 0

        # Horse awareness system
        self.proximity_radius = 45  # Radius for detecting nearby horses (reduced from 60)
        self.collision_box = self.rect  # Bounding box for collision detection
        self.nearby_horses = []  # List of horses within proximity radius

        # Horse brain / state
        self.is_running = False  # Whether the horse is actively racing
        self.target_angle = 0  # Target steering angle the brain wants to achieve
        self.steering_smoothness = 0.1  # How quickly horse adjusts to target angle
        self.in_fence_collision = False  # Track if currently colliding with fence
        self.in_sprint_zone = False  # Whether horse is in a sprint area
        self.danger_level = (
            0.0  # How much danger the horse perceives (0.0 = none, 1.0 = maximum)
        )
        self.race_time = 0.0  # Time since this horse started racing

        # Horse vision system
        self.vision_rays = []  # List of (angle_offset, distance) tuples
        self.vision_length = 100  # How far the horse can see
        self.vision_angles = [-30, -15, 0, 15, 30]  # Ray angles relative to direction

        # Inner fence awareness
        self.distance_to_inner_fence = None  # Distance to closest inner fence
        self.preferred_inner_distance = 40  # Optimal distance from inner fence
        self.enable_inner_fence_hugging = False  # Toggle for inner fence preference

        # Horse wit - strategic positioning system
        self.wit_level = 100  # How far ahead the horse looks (higher = smarter)
        self.wit_radius = 40  # Radius of the lookahead circle
        self.horses_ahead = []  # List of horses detected in lookahead area

        # Debug info for wit
        self.wit_activated = False  # Whether wit is currently active
        self.wit_activation_timer = 0.0  # Timer for easing effect
        self.wit_action = ""  # Description of current wit action

        # Debug info for centrifugal force
        self.centrifugal_force = 0.0  # Current centrifugal force magnitude

        # Horse personality and power stats
        self.power_level = random.randint(
            50, 100
        )  # Physical strength/dominance (50-100)
        self.aggression = random.uniform(
            0.3, 1.0
        )  # How pigheaded vs. yielding (0=yielding, 1=aggressive)
        self.awareness_360 = (
            True  # Can see horses from all directions using circular vision
        )

    def apply_color_tint(self, surface, color):
        """Apply a color tint to the horse sprite"""
        # Create a copy to modify
        tinted = surface.copy()

        # Create a color overlay
        overlay = pygame.Surface(tinted.get_size(), pygame.SRCALPHA)
        overlay.fill(color)  # Add alpha for blending

        # Blend the color with the original using multiply blend mode
        tinted.blit(overlay, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)

        return tinted

    def get_vec_rotated(self):
        return self.vector.rotate(self.steer_angle)

    def get_rotated(self):
        new_image = pygame.transform.rotate(self.image, -self.steer_angle + 180)
        new_rect = new_image.get_frect(center=self.rect.center)
        # Update collision box to match rotated sprite
        self.collision_box = new_rect
        return new_image, new_rect

    def update_awareness(self, all_horses):
        """Update awareness of nearby horses with positional context"""
        self.nearby_horses.clear()
        my_pos = pygame.Vector2(self.rect.center)
        my_direction = self.get_vec_rotated()

        for other_horse in all_horses:
            if other_horse is self:
                continue

            other_pos = pygame.Vector2(other_horse.rect.center)
            distance = my_pos.distance_to(other_pos)

            # Check if within proximity radius
            if distance <= self.proximity_radius:
                # Add context about the horse's position relative to us
                to_other = (
                    (other_pos - my_pos).normalize()
                    if distance > 0
                    else pygame.Vector2(0, 0)
                )

                # Store as tuple: (horse, distance, relative_position_vector)
                self.nearby_horses.append(
                    {"horse": other_horse, "distance": distance, "direction": to_other}
                )

    def check_collision(self, other_horse):
        """Check if this horse collides with another horse"""
        return self.collision_box.colliderect(other_horse.collision_box)

    def detect_horses_ahead(self, all_horses):
        """Horse wit: Cast a circle ahead and detect horses for strategic positioning"""
        self.horses_ahead.clear()
        my_pos = pygame.Vector2(self.rect.center)
        my_direction = self.get_vec_rotated()

        # Calculate lookahead position (center of wit circle)
        lookahead_pos = my_pos + (my_direction * self.wit_level)

        for other_horse in all_horses:
            if other_horse is self or not other_horse.is_running:
                continue

            other_pos = pygame.Vector2(other_horse.rect.center)

            # Check if other horse is within the wit circle
            distance_to_lookahead = lookahead_pos.distance_to(other_pos)

            if distance_to_lookahead <= self.wit_radius:
                # Calculate relative position
                to_other = other_pos - my_pos
                distance_from_me = to_other.length()

                # Check if horse is actually ahead (not behind)
                if distance_from_me > 0:
                    direction_to_other = to_other.normalize()
                    dot = my_direction.dot(direction_to_other)

                    if dot > 0.3:  # Horse is in front (not behind or beside)
                        # Determine if horse is on left or right side
                        cross = (
                            my_direction.x * direction_to_other.y
                            - my_direction.y * direction_to_other.x
                        )
                        side = "left" if cross > 0 else "right"

                        self.horses_ahead.append(
                            {
                                "horse": other_horse,
                                "distance": distance_from_me,
                                "side": side,
                                "dot": dot,
                            }
                        )

    def check_fence_collision(self, corner_data, track_bounds):
        """Check if horse is colliding with fence (quarter circle boundaries)"""
        # Check all four corners of the horse's collision box
        test_points = [
            self.collision_box.topleft,
            self.collision_box.topright,
            self.collision_box.bottomleft,
            self.collision_box.bottomright,
            self.collision_box.center,
        ]

        for point in test_points:
            if self.is_point_in_fence(point, corner_data, track_bounds):
                return True
        return False

    def is_point_in_fence(self, point, corner_data, track_bounds, sprint_zones=None):
        """Check if a point is in a fence area (quarter circle boundaries, sprint edges, or outside track)"""
        # Check if point is outside track boundaries
        if not track_bounds.collidepoint(point):
            return True

        # Check sprint fence rectangles (actual fence boundaries)
        # sprint_zones is now a list of fence rectangles, not zone rectangles
        if sprint_zones:
            for fence_rect in sprint_zones:
                if fence_rect.collidepoint(point):
                    return True

        # Check outer fence (if point is inside corner rect but outside quarter circle)
        for (
            corner_rect,
            outer_center,
            outer_radius,
            inner_center,
            inner_radius,
        ) in corner_data:
            if corner_rect.collidepoint(point):
                # Point is in the corner rectangle, check distance from outer corner center
                distance_to_outer = pygame.Vector2(point).distance_to(outer_center)
                if distance_to_outer > outer_radius:
                    # Point is outside the outer quarter circle = in the outer fence
                    return True

        # Check inner fence (if point is inside inner quarter circle)
        for (
            corner_rect,
            outer_center,
            outer_radius,
            inner_center,
            inner_radius,
        ) in corner_data:
            # Check distance from inner corner center
            distance_to_inner = pygame.Vector2(point).distance_to(inner_center)
            if distance_to_inner < inner_radius:
                # Point is inside the inner quarter circle = in the inner fence
                return True

        return False

    def cast_vision_rays(self, corner_data, track_bounds, sprint_zones=None):
        """Cast vision rays to detect distance to fences"""
        self.vision_rays.clear()
        horse_pos = pygame.Vector2(self.rect.center)

        for angle_offset in self.vision_angles:
            # Calculate ray direction based on horse's current angle
            ray_angle = self.steer_angle + angle_offset
            ray_dir = self.vector.rotate(ray_angle).normalize()

            # Sample points along the ray
            detected_distance = self.vision_length
            for distance in range(10, int(self.vision_length), 5):
                test_point = horse_pos + (ray_dir * distance)
                if self.is_point_in_fence(
                    test_point, corner_data, track_bounds, sprint_zones
                ):
                    detected_distance = distance
                    break

            self.vision_rays.append((angle_offset, detected_distance))

    def handle_fence_collision(self, corner_data, track_bounds):
        """Emergency steering if already colliding with fence"""
        currently_colliding = self.check_fence_collision(corner_data, track_bounds)

        if currently_colliding and not self.in_fence_collision:
            # Just entered fence collision - determine which way to turn
            # Check which side of the horse is hitting the fence
            horse_center = pygame.Vector2(self.rect.center)

            # Simple heuristic: turn based on current angle
            # If moving mostly left/right, turn perpendicular
            # If moving up/down, turn to avoid
            current_direction = self.get_vec_rotated()

            # Turn to go more parallel to track (clockwise if going left)
            if current_direction.x < 0:  # Moving left
                self.target_angle -= 30  # Turn right (clockwise)
            else:  # Moving right
                self.target_angle += 30  # Turn left (counter-clockwise)

            self.in_fence_collision = True
        elif not currently_colliding:
            # No longer colliding
            self.in_fence_collision = False

    def start_running(self):
        """Start the horse running"""
        self.is_running = True

    def simulate_steering_option(
        self, steering_delta, corner_data, track_bounds, sprint_zones=None
    ):
        """Simulate what horse would see if it steered by steering_delta"""
        # Calculate what angle we'd have if we steered this way
        simulated_angle = self.steer_angle + steering_delta
        horse_pos = pygame.Vector2(self.rect.center)

        # Cast a ray forward in that simulated direction
        simulated_dir = self.vector.rotate(simulated_angle).normalize()

        # Check distance to obstacle in this direction
        lookahead_distance = 150  # How far to look ahead
        for distance in range(10, int(lookahead_distance), 5):
            test_point = horse_pos + (simulated_dir * distance)
            if self.is_point_in_fence(
                test_point, corner_data, track_bounds, sprint_zones
            ):
                return distance  # Return distance to wall in this direction

        return lookahead_distance  # No wall found

    def check_sprint_zone(self, sprint_zones):
        """Check if horse is in a sprint zone"""
        for zone in sprint_zones:
            if zone.collidepoint(self.rect.center):
                self.in_sprint_zone = True
                return
        self.in_sprint_zone = False

    def calculate_distance_to_inner_fence(self, corner_data):
        """Calculate distance to the nearest inner fence (center island)"""
        horse_pos = pygame.Vector2(self.rect.center)
        min_distance = float("inf")

        for (
            corner_rect,
            outer_center,
            outer_radius,
            inner_center,
            inner_radius,
        ) in corner_data:
            # Check if we're in a corner area where inner fence exists
            if corner_rect.collidepoint(horse_pos):
                # Calculate distance from horse to inner fence edge
                distance_to_center = horse_pos.distance_to(inner_center)
                distance_to_fence_edge = (
                    distance_to_center - inner_radius
                )  # Positive = outside fence, negative = inside

                # Only care if we're outside the inner fence (in valid track area)
                if distance_to_fence_edge > 0 and distance_to_fence_edge < min_distance:
                    min_distance = distance_to_fence_edge

        # Return None if not near any inner fence
        if min_distance == float("inf"):
            return None
        return min_distance

    def think(self, corner_data, track_bounds, sprint_fences=None):
        """Horse brain - makes decisions about steering"""
        if not self.is_running:
            return

        # Reset danger level at start of thinking
        self.danger_level = 0.0

        # Calculate centrifugal force suggestion
        # When turning at speed, centrifugal force pushes the horse outward
        # This creates a natural "drift" that the horse must compensate for
        angular_velocity = abs(self.steer_angle - self.previous_steer_angle)
        if angular_velocity > 0.5:  # Only apply when turning significantly
            # Centrifugal force is proportional to v^2 and angular velocity
            # Higher speed and sharper turns = stronger outward force
            centrifugal_strength = (
                (self.velocity / self.base_velocity) * angular_velocity * 0.3
            )
            self.centrifugal_force = centrifugal_strength  # Store for debug display

            # Apply outward steering suggestion (opposite to turn direction)
            if self.steer_angle > self.previous_steer_angle:
                # Turning left (counter-clockwise), force pushes right
                self.target_angle -= centrifugal_strength
            else:
                # Turning right (clockwise), force pushes left
                self.target_angle += centrifugal_strength
        else:
            self.centrifugal_force = 0.0

        # Calculate distance to inner fence (for optimal racing line)
        if corner_data:
            self.distance_to_inner_fence = self.calculate_distance_to_inner_fence(
                corner_data
            )

        # Horse wit: Strategic positioning based on horses ahead
        if self.horses_ahead:
            self.wit_activated = True
            self.wit_activation_timer = 1.0  # Reset timer (will decay over time)

            # Increase danger based on horses ahead (reduced by power)
            closest_wit_horse = min(self.horses_ahead, key=lambda h: h["distance"])
            wit_danger = max(0, 1.0 - (closest_wit_horse["distance"] / 100))
            # High power horses perceive less danger from horses ahead
            self.danger_level = max(
                self.danger_level, wit_danger * 0.3 * (1.0 - self.power * 0.5)
            )

            # Count horses on left vs right
            left_count = sum(1 for h in self.horses_ahead if h["side"] == "left")
            right_count = sum(1 for h in self.horses_ahead if h["side"] == "right")

            # Find gaps - steer toward the side with fewer horses
            if left_count > right_count + 1:  # More congestion on left
                # Steer right to find a gap
                self.target_angle -= 5
                self.wit_action = f"Gap R (L:{left_count} R:{right_count})"
            elif right_count > left_count + 1:  # More congestion on right
                # Steer left to find a gap
                self.target_angle += 5
                self.wit_action = f"Gap L (L:{left_count} R:{right_count})"

            # Also consider closest horse ahead
            closest = min(self.horses_ahead, key=lambda h: h["distance"])
            if closest["distance"] < 80:  # Close enough to matter
                # Position ourselves to pass on the less crowded side
                if closest["side"] == "left":
                    # Horse ahead is on left, go right
                    self.target_angle -= 3
                    self.wit_action = f"Pass R (#{closest['horse'].number} @{int(closest['distance'])}px)"
                else:
                    # Horse ahead is on right, go left
                    self.target_angle += 3
                    self.wit_action = f"Pass L (#{closest['horse'].number} @{int(closest['distance'])}px)"
        else:
            self.wit_activated = False
            self.wit_action = ""

        # Check for nearby horses and avoid collision using proximity circles
        if self.nearby_horses:
            my_direction = self.get_vec_rotated()

            # Gate cooldown: reduce collision avoidance sensitivity right after start
            gate_cooldown_factor = 1.0
            if self.race_time < 4.0:  # First 4 seconds after gate
                gate_cooldown_factor = (
                    0.1 + (self.race_time / 4.0) * 0.9
                )  # Ramp from 10% to 100%

            for horse_data in self.nearby_horses:
                other_horse = horse_data["horse"]
                distance = horse_data["distance"]
                to_other = horse_data["direction"]

                # Dot product tells us if other horse is in front
                dot = my_direction.dot(to_other)

                # Cross product tells us if other horse is on left or right
                cross = my_direction.x * to_other.y - my_direction.y * to_other.x

                # Check relative speeds - are we catching up or being overtaken?
                other_velocity = other_horse.velocity
                speed_difference = self.velocity - other_velocity

                # Calculate collision threat level based on distance and direction
                # Proximity circles overlap when distance < 2 * proximity_radius
                collision_threshold = self.proximity_radius * 0.8  # 80% of radius

                # Increase danger based on proximity to other horses (reduced by power)
                if dot > 0.5 and distance < collision_threshold:  # Horse ahead
                    proximity_danger = max(0, 1.0 - (distance / collision_threshold))
                    # High power horses perceive less danger from proximity
                    self.danger_level = max(
                        self.danger_level,
                        proximity_danger * 0.7 * (1.0 - self.power * 0.4),
                    )

                # Progressive avoidance zones based on circle proximity
                # High power horses are more willing to take risks and push through
                if dot > 0.5:  # Horse is ahead
                    # Zone 1: Very close (critical avoidance)
                    if distance < collision_threshold * 0.5:
                        # Emergency avoidance - circles nearly overlapping
                        # High power horses steer less aggressively
                        if speed_difference > 5:
                            steer_amount = (
                                8 * (1.0 - self.power * 0.3) * gate_cooldown_factor
                            )
                        else:
                            steer_amount = (
                                6 * (1.0 - self.power * 0.3) * gate_cooldown_factor
                            )

                        if cross > 0:  # Other horse is on the left
                            self.target_angle -= steer_amount  # Steer right to avoid
                        else:  # Other horse is on the right
                            self.target_angle += steer_amount  # Steer left to avoid

                    # Zone 2: Close (moderate avoidance)
                    elif distance < collision_threshold * 0.75:
                        # High power horses are more willing to push through here
                        if speed_difference > 5:
                            steer_amount = (
                                5 * (1.0 - self.power * 0.4) * gate_cooldown_factor
                            )
                        else:
                            steer_amount = (
                                3 * (1.0 - self.power * 0.4) * gate_cooldown_factor
                            )

                        if cross > 0:  # Other horse is on the left
                            self.target_angle -= steer_amount  # Steer right to avoid
                        else:  # Other horse is on the right
                            self.target_angle += steer_amount  # Steer left to avoid

                    # Zone 3: Near (gentle avoidance)
                    elif distance < collision_threshold:
                        # High power horses mostly ignore this zone
                        steer_amount = (
                            2 * (1.0 - self.power * 0.6) * gate_cooldown_factor
                        )

                        if cross > 0:  # Other horse is on the left
                            self.target_angle -= steer_amount  # Steer right to avoid
                        else:  # Other horse is on the right
                            self.target_angle += steer_amount  # Steer left to avoid

                # 360° CIRCULAR AWARENESS: Horses approaching from behind
                elif (
                    self.awareness_360 and dot < -0.3
                ):  # Horse is behind us (dot negative)
                    # Detect faster horses catching up from behind
                    if speed_difference < -5 and distance < collision_threshold * 0.9:
                        # A faster horse is overtaking from behind!

                        # Calculate dominance: who should yield?
                        # Factors: power_level difference, aggression, position advantage
                        power_diff = self.power_level - other_horse.power_level
                        position_bonus = -15  # Horse behind has slight disadvantage
                        dominance = (
                            power_diff * 0.4 + speed_difference * 1.5 + position_bonus
                        ) * self.aggression

                        should_yield = dominance < 0

                        if should_yield:
                            # We're less dominant - make room gracefully
                            yield_amount = (
                                6 * (1.0 - self.aggression) * gate_cooldown_factor
                            )
                            if cross > 0:  # Other horse approaching from left rear
                                self.target_angle -= (
                                    yield_amount  # Move right to let them pass
                                )
                            else:  # Other horse approaching from right rear
                                self.target_angle += (
                                    yield_amount  # Move left to let them pass
                                )
                        else:
                            # We're dominant - be pigheaded, hold our line!
                            block_amount = 3 * self.aggression * gate_cooldown_factor
                            if cross > 0:  # Block left side
                                self.target_angle += block_amount * 0.5  # Subtle block
                            else:  # Block right side
                                self.target_angle -= block_amount * 0.5  # Subtle block

                # Horses beside us (prevents packing)
                elif abs(dot) < 0.3 and distance < collision_threshold * 0.6:
                    # Side-by-side battle for position - personality-based!
                    # Calculate who should yield based on power_level and aggression
                    power_diff = self.power_level - other_horse.power_level
                    side_dominance = (
                        power_diff * 0.5 + speed_difference * 1.0
                    ) * self.aggression

                    if side_dominance < -10:
                        # They're clearly more dominant - yield more
                        steer_amount = (
                            6 * (1.0 - self.aggression) * gate_cooldown_factor
                        )
                    elif side_dominance > 10:
                        # We're clearly more dominant - fight for position!
                        steer_amount = 2 * self.aggression * gate_cooldown_factor
                    else:
                        # Even match - moderate avoidance
                        steer_amount = (
                            4 * (1.0 - self.power * 0.3) * gate_cooldown_factor
                        )

                    if cross > 0:  # Other horse is on the left
                        self.target_angle -= steer_amount  # Steer right to avoid
                    else:  # Other horse is on the right
                        self.target_angle += steer_amount  # Steer left to avoid

        # Use vision rays to detect obstacles early
        if self.vision_rays:
            # Check center vision (straight ahead)
            center_rays = [d for angle, d in self.vision_rays if abs(angle) <= 15]
            center_distance = min(center_rays) if center_rays else self.vision_length

            # Increase danger based on obstacles ahead (reduced by power)
            if center_distance < 100:
                obstacle_danger = max(0, 1.0 - (center_distance / 100))
                # High power horses take more risks near fences
                self.danger_level = max(
                    self.danger_level, obstacle_danger * 0.8 * (1.0 - self.power * 0.3)
                )

            # Only react if center vision detects obstacle
            if center_distance < 80:
                # *neigh* wall found! Let's check our options

                # Simulate turning right (negative angle = clockwise)
                right_distance = self.simulate_steering_option(
                    -20, corner_data, track_bounds, sprint_fences
                )

                # Simulate turning left (positive angle = counter-clockwise)
                left_distance = self.simulate_steering_option(
                    20, corner_data, track_bounds, sprint_fences
                )

                # Choose the direction with more clearance
                if right_distance > left_distance + 10:  # Right is clearly better
                    self.target_angle -= 10  # *neigh* steer right!
                elif left_distance > right_distance + 10:  # Left is clearly better
                    self.target_angle += 10  # *neigh* steer left!
                elif left_distance > right_distance:  # Left is slightly better
                    self.target_angle += 5
                else:  # Right is slightly better or equal
                    self.target_angle -= 5

        # Prefer staying close to inner fence for optimal racing line
        # Only apply this when not actively avoiding obstacles AND when enabled
        if self.enable_inner_fence_hugging and self.distance_to_inner_fence is not None:
            # Calculate how far we are from preferred distance
            distance_error = (
                self.distance_to_inner_fence - self.preferred_inner_distance
            )

            # Only apply correction if significantly off from preferred distance
            if abs(distance_error) > 15:  # Tolerance zone
                # Too far from inner fence - gently steer toward it
                if distance_error > 0:
                    # We need to move closer to inner fence
                    # Apply gentle steering adjustment (much weaker than obstacle avoidance)
                    self.target_angle += 2  # Gentle turn toward inner fence
                # Too close to inner fence - gently steer away
                else:
                    # We need to move away from inner fence
                    self.target_angle -= 2  # Gentle turn away from inner fence

        # Emergency collision avoidance (shouldn't happen if vision works)
        if corner_data:
            self.handle_fence_collision(corner_data, track_bounds)

        # Smooth steering: gradually adjust current angle toward target angle
        angle_diff = self.target_angle - self.steer_angle
        self.steer_angle += angle_diff * self.steering_smoothness

        # Store previous angle for next frame's centrifugal force calculation
        self.previous_steer_angle = self.steer_angle

    def update(
        self,
        dt,
        corner_data=None,
        track_bounds=None,
        sprint_fences=None,
        sprint_zones=None,
    ):
        # Update race time for this horse
        if self.is_running:
            self.race_time += dt

        # Decay wit activation timer for smooth easing effect
        if self.wit_activation_timer > 0:
            self.wit_activation_timer = max(0, self.wit_activation_timer - dt * 2)

        # Update vision (use sprint_fences for fence detection)
        if corner_data and track_bounds:
            self.cast_vision_rays(corner_data, track_bounds, sprint_fences)

        # Horse thinks and decides steering (use sprint_fences for fence avoidance)
        self.think(corner_data, track_bounds, sprint_fences)

        # Check if in sprint zone (use sprint_zones for acceleration check)
        if sprint_zones:
            self.check_sprint_zone(sprint_zones)

        # Handle acceleration/deceleration based on sprint zone and danger
        if self.is_running:
            # Phase 1: Standing start acceleration (0 -> base_velocity)
            if self.velocity < self.base_velocity:
                # Accelerating from standing start - fast acceleration
                self.velocity += self.acceleration * dt
                self.velocity = min(self.velocity, self.base_velocity)

            # Phase 2: Cruising speed - affected by danger and sprint zones
            else:
                # Calculate target velocity based on danger and sprint zone
                if self.danger_level > 0.5:
                    # High danger: slow down significantly
                    target_velocity = self.base_velocity * (
                        1.0 - self.danger_level * 0.4
                    )
                elif self.in_sprint_zone and self.danger_level < 0.3:
                    # In sprint zone with low danger: accelerate to max
                    target_velocity = self.max_velocity
                elif self.danger_level > 0.2:
                    # Moderate danger: reduce to base speed
                    target_velocity = self.base_velocity * (
                        1.0 - self.danger_level * 0.2
                    )
                else:
                    # No danger: maintain base speed
                    target_velocity = self.base_velocity

                # Smoothly adjust velocity toward target
                if self.velocity < target_velocity:
                    # Accelerate (slower than standing start)
                    self.velocity += (self.acceleration * 0.4) * dt
                    self.velocity = min(self.velocity, target_velocity)
                elif self.velocity > target_velocity:
                    # Decelerate (faster deceleration when in danger)
                    decel_rate = self.deceleration * (1.0 + self.danger_level * 2.0)
                    self.velocity -= decel_rate * dt
                    self.velocity = max(self.velocity, target_velocity)

        # Only move if running
        if self.is_running:
            vec = self.get_vec_rotated()
            velocity = self.velocity * vec * dt

            # Store proposed new position
            proposed_position = self.rect.center + velocity

            # Physical collision prevention: check if new position would overlap with other horses
            collision_detected = False
            for horse_data in self.nearby_horses:
                other_horse = horse_data["horse"]
                other_pos = pygame.Vector2(other_horse.rect.center)
                proposed_distance = pygame.Vector2(proposed_position).distance_to(
                    other_pos
                )

                # Minimum separation distance (sum of both proximity radii * safety factor)
                min_separation = (
                    self.proximity_radius + other_horse.proximity_radius
                ) * 0.35

                if proposed_distance < min_separation:
                    # Collision would occur! Push back along the vector between horses
                    collision_detected = True
                    to_other = (
                        other_pos - pygame.Vector2(self.rect.center)
                    ).normalize()

                    # Calculate pushback: weaker horse gets pushed more
                    my_weight = self.power_level / 100.0
                    other_weight = other_horse.power_level / 100.0
                    total_weight = my_weight + other_weight

                    # Higher power = less pushback
                    pushback_ratio = (
                        (1.0 - my_weight / total_weight) if total_weight > 0 else 0.5
                    )

                    # Calculate how much to push back
                    overlap = min_separation - proposed_distance
                    pushback_distance = overlap * pushback_ratio * 1.5

                    # Apply pushback perpendicular to our direction to maintain forward momentum
                    pushback_vector = -to_other * pushback_distance
                    proposed_position += pushback_vector
                    break  # Only handle one collision per frame

            # Apply the final position (with collision resolution)
            self.rect.center = proposed_position


import enum


class RaceState(enum.Enum):
    PREP = 0
    GATE = 1
    RUNNING = 2
    FINISH = 3


class Race(Entity):
    state = RaceState.PREP

    def __init__(self, asset_loader):
        super().__init__(asset_loader)
        # Scale the track image by 2x
        base_image = asset_loader.get("RACECOURSE")
        self.image = pygame.transform.scale_by(base_image, 2.0)
        self.rect = self.image.get_rect()

        # Race timing
        self.race_time = 0.0  # Time since race started

        # Spawn multiple horses at the starting gate
        self.horses = []
        gate_x = self.rect.width // 2
        num_horses = 5
        spacing = 70  # Vertical spacing between horses (scaled 2x from 35)
        start_y = 100  # Starting Y position (scaled 2x from 50)

        # Generate random horse numbers (1-99)
        horse_numbers = random.sample(range(1, 100), num_horses)

        for i in range(num_horses):
            y = start_y + (i * spacing)
            init_position = pygame.Vector2(gate_x, y)
            self.horses.append(
                Horse(
                    asset_loader,
                    init_position,
                    color_index=i,
                    horse_number=horse_numbers[i],
                )
            )

        self.corner = self.image.get_rect()
        self.corner.height = self.corner.height // 2
        self.corner.width = self.corner.height
        self.topleft_corner = self.corner.copy()
        self.topleft_corner.topleft = self.image.get_rect().topleft
        self.topright_corner = self.corner.copy()
        self.topright_corner.topright = self.image.get_rect().topright
        self.bottomleft_corner = self.corner.copy()
        self.bottomleft_corner.bottomleft = self.image.get_rect().bottomleft
        self.bottomright_corner = self.corner.copy()
        self.bottomright_corner.bottomright = self.image.get_rect().bottomright

        # Sprint areas (straights between corners)
        sprint_height = 400  # Scaled 2x from 200

        # Top sprint: from right side of top-left corner to left side of top-right corner
        self.top_sprint = pygame.Rect(
            self.topleft_corner.right,
            0,
            self.topright_corner.left - self.topleft_corner.right,
            sprint_height,
        )

        # Bottom sprint: from right side of bottom-left corner to left side of bottom-right corner
        self.bottom_sprint = pygame.Rect(
            self.bottomleft_corner.right,
            self.rect.height - sprint_height,
            self.bottomright_corner.left - self.bottomleft_corner.right,
            sprint_height,
        )

        # Define sprint fence rectangles (4 horizontal fences total)
        fence_thickness = 20  # Scaled 2x from 10

        # Top sprint zone has 2 fences:
        # 1. Top edge fence (at the very top of the sprint zone, moved 40px closer)
        self.top_sprint_top_fence = pygame.Rect(
            self.top_sprint.left,
            self.top_sprint.top + 40,  # Scaled 2x from 20
            self.top_sprint.width,
            fence_thickness,
        )

        # 2. Bottom edge fence (at the bottom of the top sprint zone)
        self.top_sprint_bottom_fence = pygame.Rect(
            self.top_sprint.left,
            self.top_sprint.bottom - fence_thickness,
            self.top_sprint.width,
            fence_thickness,
        )

        # Bottom sprint zone has 2 fences:
        # 3. Top edge fence (at the top of the bottom sprint zone)
        self.bottom_sprint_top_fence = pygame.Rect(
            self.bottom_sprint.left,
            self.bottom_sprint.top,
            self.bottom_sprint.width,
            fence_thickness,
        )

        # 4. Bottom edge fence (at the very bottom of the sprint zone, moved 40px closer)
        self.bottom_sprint_bottom_fence = pygame.Rect(
            self.bottom_sprint.left,
            self.bottom_sprint.bottom - fence_thickness - 40,  # Scaled 2x from 20
            self.bottom_sprint.width,
            fence_thickness,
        )

    def start_race(self):
        """Start all horses running"""
        for horse in self.horses:
            horse.start_running()
        self.race_time = 0.0  # Reset race timer

    def update(self, dt):
        # Update race timer if any horse is running
        if any(horse.is_running for horse in self.horses):
            self.race_time += dt

        # Update awareness for all horses
        for horse in self.horses:
            horse.update_awareness(self.horses)
            horse.detect_horses_ahead(self.horses)  # Horse wit detection

        # Calculate quarter-circle data for each corner
        # Each corner has outer fence (edge of track) and inner fence (center island)
        outer_radius = self.corner.width - 60  # Radius of outer quarter circle (scaled 2x from 30)
        inner_radius = (
            outer_radius / 2 + 40
        )  # Radius of inner quarter circle (scaled 2x from 20)

        corner_data = [
            # Top-left corner:
            # - Both circles center at bottom-right of rectangle (concentric)
            (
                self.topleft_corner,
                pygame.Vector2(
                    self.topleft_corner.right, self.topleft_corner.bottom
                ),  # outer center
                outer_radius,
                pygame.Vector2(
                    self.topleft_corner.right, self.topleft_corner.bottom
                ),  # inner center (same!)
                inner_radius,
            ),
            # Top-right corner:
            # - Both circles center at bottom-left of rectangle (concentric)
            (
                self.topright_corner,
                pygame.Vector2(
                    self.topright_corner.left, self.topright_corner.bottom
                ),  # outer center
                outer_radius,
                pygame.Vector2(
                    self.topright_corner.left, self.topright_corner.bottom
                ),  # inner center (same!)
                inner_radius,
            ),
            # Bottom-left corner:
            # - Both circles center at top-right of rectangle (concentric)
            (
                self.bottomleft_corner,
                pygame.Vector2(
                    self.bottomleft_corner.right, self.bottomleft_corner.top
                ),  # outer center
                outer_radius,
                pygame.Vector2(
                    self.bottomleft_corner.right, self.bottomleft_corner.top
                ),  # inner center (same!)
                inner_radius,
            ),
            # Bottom-right corner:
            # - Both circles center at top-left of rectangle (concentric)
            (
                self.bottomright_corner,
                pygame.Vector2(
                    self.bottomright_corner.left, self.bottomright_corner.top
                ),  # outer center
                outer_radius,
                pygame.Vector2(
                    self.bottomright_corner.left, self.bottomright_corner.top
                ),  # inner center (same!)
                inner_radius,
            ),
        ]

        # Collect all 4 sprint fence rectangles
        sprint_fences = [
            self.top_sprint_top_fence,
            self.top_sprint_bottom_fence,
            self.bottom_sprint_top_fence,
            self.bottom_sprint_bottom_fence,
        ]

        # Collect sprint zone rectangles for acceleration
        sprint_zones = [self.top_sprint, self.bottom_sprint]

        # Update all horses with fence collision detection, vision, and sprint awareness
        for horse in self.horses:
            # Pass sprint_fences for vision, and sprint_zones for acceleration check
            horse.update(dt, corner_data, self.rect, sprint_fences, sprint_zones)

    def render(
        self,
        display: pygame.Surface,
        debug_mode=True,
        camera_offset=pygame.Vector2(0, 0),
        zoom=1.0,
    ):
        new_image = self.image.copy()

        # Render all horses
        for horse in self.horses:
            rotated_image, rotated_rect = horse.get_rotated()
            new_image.blit(rotated_image, rotated_rect)

            # Draw horse number marker (always visible)
            marker_pos = (horse.rect.centerx, horse.rect.centery - 20)
            # Draw circular marker background with color based on power
            # High power = red tint, low power = blue tint
            power_color = (
                int(255 * horse.power),  # More red = more power
                int(255 * (1.0 - abs(horse.power - 0.5) * 2)),  # Mid-range gets green
                int(255 * (1.0 - horse.power)),  # More blue = less power
            )
            pygame.draw.circle(new_image, power_color, marker_pos, 12)
            pygame.draw.circle(new_image, (0, 0, 0), marker_pos, 12, 2)
            # Draw number
            font = pygame.font.Font(None, 20)
            number_text = font.render(str(horse.number), True, (0, 0, 0))
            number_rect = number_text.get_rect(center=marker_pos)
            new_image.blit(number_text, number_rect)

            if debug_mode:
                # Draw power stat above horse number
                power_text_pos = (horse.rect.centerx, horse.rect.centery - 35)
                font_tiny = pygame.font.Font(None, 14)
                power_text = font_tiny.render(
                    f"PWR:{horse.power:.2f}", True, (255, 255, 255)
                )
                power_text_rect = power_text.get_rect(center=power_text_pos)
                # Draw background for power text
                power_bg_rect = power_text_rect.inflate(4, 2)
                pygame.draw.rect(new_image, (0, 0, 0, 180), power_bg_rect)
                new_image.blit(power_text, power_text_rect)

                # Draw centrifugal force if active
                if horse.centrifugal_force > 0.01:
                    cf_text_pos = (horse.rect.centerx, horse.rect.centery - 50)
                    cf_text = font_tiny.render(
                        f"CF:{horse.centrifugal_force:.2f}", True, (255, 150, 0)
                    )
                    cf_text_rect = cf_text.get_rect(center=cf_text_pos)
                    # Draw background for CF text
                    cf_bg_rect = cf_text_rect.inflate(4, 2)
                    pygame.draw.rect(new_image, (0, 0, 0, 180), cf_bg_rect)
                    new_image.blit(cf_text, cf_text_rect)

                # Draw direction vector
                pygame.draw.line(
                    new_image,
                    "green",
                    horse.rect.center,
                    horse.rect.center + horse.get_vec_rotated() * 100,
                )

                # Draw wit circle (lookahead area) with easing based on activation
                horse_direction = horse.get_vec_rotated()
                lookahead_center = horse.rect.center + (
                    horse_direction * horse.wit_level
                )

                # Color intensity based on activation timer (easing effect)
                intensity = int(horse.wit_activation_timer * 255)
                circle_color = (255, intensity, 255)  # Magenta with varying intensity
                pygame.draw.circle(
                    new_image, circle_color, lookahead_center, horse.wit_radius, 2
                )

                # Draw wit action text if activated
                if horse.wit_action:
                    font_small = pygame.font.Font(None, 16)
                    wit_text = font_small.render(horse.wit_action, True, (255, 255, 0))
                    text_pos = (horse.rect.centerx - 40, horse.rect.centery - 35)

                    # Draw background for text
                    text_bg_rect = wit_text.get_rect(topleft=text_pos)
                    text_bg_rect.inflate_ip(4, 2)
                    pygame.draw.rect(new_image, (0, 0, 0, 180), text_bg_rect)

                    new_image.blit(wit_text, text_pos)

                # Draw lines to detected horses in wit circle
                for horse_ahead in horse.horses_ahead:
                    other_pos = horse_ahead["horse"].rect.center
                    line_color = (
                        (255, 200, 0) if horse_ahead["distance"] < 80 else (150, 150, 0)
                    )
                    pygame.draw.line(
                        new_image, line_color, horse.rect.center, other_pos, 1
                    )

                # Draw vision rays
                horse_pos = pygame.Vector2(horse.rect.center)
                for angle_offset, distance in horse.vision_rays:
                    ray_angle = horse.steer_angle + angle_offset
                    ray_dir = horse.vector.rotate(ray_angle).normalize()
                    ray_end = horse_pos + (ray_dir * distance)

                    # Color based on distance (red = close, yellow = far)
                    if distance < 30:
                        color = "red"
                    elif distance < 60:
                        color = "orange"
                    else:
                        color = "yellow"

                    pygame.draw.line(new_image, color, horse_pos, ray_end, 1)
                    pygame.draw.circle(new_image, color, ray_end, 2)

                # Draw proximity circle (cyan for awareness radius)
                pygame.draw.circle(
                    new_image, "cyan", horse.rect.center, horse.proximity_radius, 1
                )

                # Draw collision box (red for bounding box)
                pygame.draw.rect(new_image, "red", horse.collision_box, 1)

        if debug_mode:
            pygame.draw.rect(new_image, "yellow", self.topleft_corner, 1)
            pygame.draw.rect(new_image, "yellow", self.topright_corner, 1)
            pygame.draw.rect(new_image, "yellow", self.bottomleft_corner, 1)
            pygame.draw.rect(new_image, "yellow", self.bottomright_corner, 1)
            pygame.draw.rect(new_image, "blue", self.top_sprint, 1)
            pygame.draw.rect(new_image, "blue", self.bottom_sprint, 1)

            # Draw all 4 sprint fences (filled red rectangles for visibility) - debug only
            pygame.draw.rect(new_image, (255, 0, 0), self.top_sprint_top_fence)
            pygame.draw.rect(new_image, (255, 0, 0), self.top_sprint_bottom_fence)
            pygame.draw.rect(new_image, (255, 0, 0), self.bottom_sprint_top_fence)
            pygame.draw.rect(new_image, (255, 0, 0), self.bottom_sprint_bottom_fence)

        # Apply zoom scaling if needed
        if zoom != 1.0:
            new_width = int(new_image.get_width() * zoom)
            new_height = int(new_image.get_height() * zoom)
            new_image = pygame.transform.smoothscale(new_image, (new_width, new_height))

        # Apply camera offset when blitting to display
        blit_pos = (self.rect.x + camera_offset.x, self.rect.y + camera_offset.y)
        display.blit(new_image, blit_pos)


class UmaSim:
    def __init__(self):
        pygame.init()
        self.display = pygame.display.set_mode([320 * 5, 180 * 5], pygame.RESIZABLE)
        self.asset_loader = AssetLoader()
        self.asset_loader.load("HORSE", HORSE)
        self.asset_loader.load("RACECOURSE", RACECOURSE)
        self.race = Race(self.asset_loader)
        self.clock = pygame.Clock()
        self.dt = 0
        self.race_started = False
        self.debug_mode = True  # Debug visualization enabled by default

        # Camera system
        self.camera_offset = pygame.Vector2(0, 0)
        self.camera_smoothness = 0.05  # How smoothly the camera follows
        self.camera_zoom = 1.0  # Current zoom level
        self.target_zoom = 1.0  # Target zoom level
        self.zoom_smoothness = 0.03  # How smoothly zoom transitions

        # Camera state machine
        self.camera_mode = "all_horses"  # "all_horses" or "closest_pair"
        self.camera_timer = 0
        self.camera_duration = random.uniform(3, 6)  # Random duration for each mode
        self.closest_horses = []  # Stores the pair of closest horses

    def events(self):
        self.dt = self.clock.tick(60) * 0.001
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and not self.race_started:
                    # Start the race when space is pressed
                    self.race.start_race()
                    self.race_started = True
                elif event.key == pygame.K_TAB:
                    # Toggle debug visualization
                    self.debug_mode = not self.debug_mode
                elif event.key == pygame.K_i:
                    # Toggle inner fence hugging for all horses
                    for horse in self.race.horses:
                        horse.enable_inner_fence_hugging = (
                            not horse.enable_inner_fence_hugging
                        )
                    status = (
                        "enabled"
                        if self.race.horses[0].enable_inner_fence_hugging
                        else "disabled"
                    )
                    print(f"Inner fence hugging: {status}")

    def find_closest_horse_pair(self):
        """Find the two closest horses using centroid permutation"""
        if len(self.race.horses) < 2:
            return []

        min_distance = float("inf")
        closest_pair = []

        # Check all pairs of horses
        for i in range(len(self.race.horses)):
            for j in range(i + 1, len(self.race.horses)):
                horse1 = self.race.horses[i]
                horse2 = self.race.horses[j]

                pos1 = pygame.Vector2(horse1.rect.center)
                pos2 = pygame.Vector2(horse2.rect.center)

                distance = pos1.distance_to(pos2)

                if distance < min_distance:
                    min_distance = distance
                    closest_pair = [horse1, horse2]

        return closest_pair

    def update(self):
        self.race.update(self.dt)
        self.update_camera_mode()
        self.update_camera()

    def update_camera_mode(self):
        """Update camera mode state machine with timer"""
        if not self.race_started:
            return

        # Update timer
        self.camera_timer += self.dt

        # Check if it's time to switch modes
        if self.camera_timer >= self.camera_duration:
            # Switch camera mode
            if self.camera_mode == "all_horses":
                # Switch to closest pair mode
                self.camera_mode = "closest_pair"
                self.closest_horses = self.find_closest_horse_pair()
                self.target_zoom = 1.5  # Zoom in
                self.camera_duration = random.uniform(
                    2, 4
                )  # Shorter duration for zoomed view
            else:
                # Switch to all horses mode
                self.camera_mode = "all_horses"
                self.closest_horses = []
                self.target_zoom = 1.0  # Zoom out
                self.camera_duration = random.uniform(
                    3, 6
                )  # Longer duration for full view

            # Reset timer
            self.camera_timer = 0

    def update_camera(self):
        """Update camera to follow horses based on current camera mode"""
        if not self.race.horses:
            return

        # Determine which horses to focus on based on camera mode
        if self.camera_mode == "closest_pair" and self.closest_horses:
            focus_horses = self.closest_horses
        else:
            focus_horses = self.race.horses

        # Calculate the center point of focused horses
        total_x = 0
        total_y = 0
        for horse in focus_horses:
            total_x += horse.rect.centerx
            total_y += horse.rect.centery

        num_horses = len(focus_horses)
        center_x = total_x / num_horses
        center_y = total_y / num_horses

        # Smoothly interpolate zoom
        self.camera_zoom += (self.target_zoom - self.camera_zoom) * self.zoom_smoothness

        # Calculate target camera position (center the view on horses' center)
        display_center_x = self.display.get_width() / 2
        display_center_y = self.display.get_height() / 2

        target_offset = pygame.Vector2(
            display_center_x - center_x * self.camera_zoom,
            display_center_y - center_y * self.camera_zoom,
        )

        # Smoothly interpolate camera position
        self.camera_offset += (
            target_offset - self.camera_offset
        ) * self.camera_smoothness

    def render(self):
        self.display.fill("gray")
        self.race.render(
            self.display, self.debug_mode, self.camera_offset, self.camera_zoom
        )

        # Draw UI overlay (not affected by camera)
        self.draw_ui()

        pygame.display.flip()

    def draw_ui(self):
        """Draw UI elements like timer and leaderboard"""
        # Race clock at top center
        minutes = int(self.race.race_time // 60)
        seconds = int(self.race.race_time % 60)
        milliseconds = int((self.race.race_time % 1) * 100)
        time_text = f"{minutes:02d}:{seconds:02d}.{milliseconds:02d}"

        font_large = pygame.font.Font(None, 48)
        time_surface = font_large.render(time_text, True, (255, 255, 255))
        time_rect = time_surface.get_rect(center=(self.display.get_width() // 2, 30))

        # Draw background for time
        padding = 10
        bg_rect = time_rect.inflate(padding * 2, padding * 2)
        pygame.draw.rect(self.display, (0, 0, 0, 180), bg_rect)
        pygame.draw.rect(self.display, (255, 255, 255), bg_rect, 2)
        self.display.blit(time_surface, time_rect)

        # Fake leaderboard at top right
        leaderboard_x = self.display.get_width() - 200
        leaderboard_y = 20
        leaderboard_width = 180
        leaderboard_height = 200

        # Draw leaderboard background
        leaderboard_rect = pygame.Rect(
            leaderboard_x, leaderboard_y, leaderboard_width, leaderboard_height
        )
        pygame.draw.rect(self.display, (0, 0, 0, 180), leaderboard_rect)
        pygame.draw.rect(self.display, (255, 255, 255), leaderboard_rect, 2)

        # Draw "LEADERBOARD" title
        font_small = pygame.font.Font(None, 24)
        title_surface = font_small.render("LEADERBOARD", True, (255, 215, 0))
        title_rect = title_surface.get_rect(
            center=(leaderboard_x + leaderboard_width // 2, leaderboard_y + 20)
        )
        self.display.blit(title_surface, title_rect)

        # Draw fake positions
        y_offset = leaderboard_y + 50
        for i, horse in enumerate(self.race.horses):
            position_text = f"{i + 1}. #{horse.number}"
            text_surface = font_small.render(position_text, True, (255, 255, 255))
            self.display.blit(text_surface, (leaderboard_x + 20, y_offset))
            y_offset += 30

    def run(self):
        while True:
            self.events()
            self.update()
            self.render()


if __name__ == "__main__":
    umasim = UmaSim()
    umasim.run()
