"""
Context Gardener — Garden scene.

Main Pygame scene that renders the immersive 2D garden.
Orchestrates the gardener character, plants, HUD, and rule settings panel.

The garden visualises the state from .gardener-state.json:
  - Each context file → a plant (health determines appearance)
  - Gardener character → animates through loop phases
  - HUD → health score, issue count, last run time
  - Right panel → rule settings (collapsible)
"""

import pygame
import sys
import os
from pathlib import Path
from typing import Any, Dict, Optional

from src.config import load_config, save_config


# ─── Constants ───

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
FPS = 60

# Colors
COLOR_SKY_TOP = (135, 206, 235)
COLOR_SKY_BOTTOM = (176, 226, 255)
COLOR_GRASS_1 = (76, 175, 80)
COLOR_GRASS_2 = (56, 142, 60)
COLOR_PATH = (188, 170, 140)
COLOR_PANEL_BG = (30, 40, 30, 220)
COLOR_TEXT = (50, 50, 40)
COLOR_TEXT_LIGHT = (240, 245, 230)
COLOR_HEALTH_GREEN = (46, 125, 50)
COLOR_HEALTH_YELLOW = (255, 179, 0)
COLOR_HEALTH_RED = (229, 57, 53)
COLOR_BUTTON = (60, 80, 60)
COLOR_BUTTON_HOVER = (80, 110, 80)

# Paths
SPRITES_DIR = Path(__file__).resolve().parent.parent / "sprites"


# ─── Garden Scene ───

class GardenScene:
    """Main garden scene. Owns the gardener, plants, HUD, and settings panel."""

    def __init__(self, state: Dict[str, Any], project_path: str):
        self.state = state
        self.project_path = project_path
        self.config = load_config(project_path)
        self.clock = pygame.time.Clock()
        self.running = True
        self.standby = False  # Loop stopped, garden idle
        self.loop_phase = 0  # 0-6 mapping to Observe..Decide
        self.phase_timer = 0.0

        # Screen
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("🌱 Little Gardener — Context Garden")
        self.font_small = pygame.font.SysFont("sans-serif", 14)
        self.font_medium = pygame.font.SysFont("sans-serif", 20)
        self.font_large = pygame.font.SysFont("sans-serif", 28)

        # Garden positions (plant slots in the garden grid)
        self.plants: list[dict] = []
        self._init_plants()

        # Gardener character
        self.gardener_x = 640
        self.gardener_y = 400
        self.gardener_target_x = 640
        self.gardener_target_y = 400
        self.gardener_phase = "idle"

        # HUD
        self.show_settings = False
        self.hovered_element = None

        # Sprites cache
        self.sprites: dict[str, Optional[pygame.Surface]] = {}

    def _init_plants(self):
        """Create plant objects from gardener state."""
        files = self.state.get("files", [])
        positions = self._generate_positions(len(files))
        for i, f in enumerate(files):
            score = f.get("score", 50)
            if score >= 80:
                variant = "healthy"
            elif score >= 50:
                variant = "wilting"
            else:
                variant = "dead"

            self.plants.append({
                "path": f.get("path", f"file-{i}"),
                "score": score,
                "lines": f.get("lines", 0),
                "age_days": f.get("ageDays", 0),
                "variant": variant,
                "x": positions[i][0],
                "y": positions[i][1],
                "width": 64,
                "height": 80,
                "anim_frame": 0,
            })

    def _generate_positions(self, count: int) -> list[tuple[int, int]]:
        """Generate garden grid positions for N plants."""
        positions = []
        cols = max(1, min(4, count))
        rows = (count + cols - 1) // cols
        start_x = 200
        start_y = 280
        spacing_x = 220
        spacing_y = 160
        for i in range(count):
            col = i % cols
            row = i // cols
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            positions.append((x, y))
        return positions

    def load_sprite(self, path: str) -> Optional[pygame.Surface]:
        """Load a sprite from the sprites directory, caching it."""
        if path in self.sprites:
            return self.sprites[path]
        fp = SPRITES_DIR / path
        if fp.exists():
            try:
                surf = pygame.image.load(str(fp)).convert_alpha()
                self.sprites[path] = surf
                return surf
            except pygame.error:
                pass
        self.sprites[path] = None
        return None

    # ─── Main loop ───

    def run(self):
        """Main game loop."""
        while self.running:
            dt = self.clock.tick(FPS) / 1000.0  # Delta time in seconds
            self._handle_events()
            self._update(dt)
            self._render()
            pygame.display.flip()

    def _handle_events(self):
        """Process pygame events."""
        mx, my = pygame.mouse.get_pos()
        self.hovered_element = None

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                elif event.key == pygame.K_s:  # Toggle settings
                    self.show_settings = not self.show_settings
                elif event.key == pygame.K_SPACE:  # Toggle standby
                    self.standby = not self.standby

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left click
                    # Check settings toggle
                    if self._is_over_settings_toggle(mx, my):
                        self.show_settings = not self.show_settings
                    # Check close button
                    elif self.show_settings and self._is_over_close_btn(mx, my):
                        self.show_settings = False

    def _update(self, dt: float):
        """Update game state each frame."""
        if not self.standby:
            # Animate loop phase cycling
            self.phase_timer += dt
            if self.phase_timer > 3.0:  # ~3 seconds per phase
                self.phase_timer = 0
                self.loop_phase = (self.loop_phase + 1) % 7
                self._update_gardener_target()

        # Animate plants
        for plant in self.plants:
            plant["anim_frame"] = (plant["anim_frame"] + 1) % 60

    def _update_gardener_target(self):
        """Move gardener to the next plant based on current loop phase."""
        if not self.plants:
            return

        phases = ["observe", "diagnose", "plan", "act", "verify", "learn", "decide"]
        self.gardener_phase = phases[self.loop_phase]

        # Walk toward a plant that matches the phase
        target = self.plants[self.loop_phase % len(self.plants)]
        self.gardener_target_x = target["x"] + 16
        self.gardener_target_y = target["y"] - 20

    def _render(self):
        """Render the garden scene."""
        self._render_sky()
        self._render_ground()
        self._render_paths()
        self._render_plants()
        self._render_gardener()
        self._render_hud()

        if self.show_settings:
            self._render_settings_panel()

    # ─── Render helpers ───

    def _render_sky(self):
        """Draw gradient sky background."""
        for y in range(240):
            t = y / 240
            r = int(COLOR_SKY_TOP[0] * (1 - t) + COLOR_SKY_BOTTOM[0] * t)
            g = int(COLOR_SKY_TOP[1] * (1 - t) + COLOR_SKY_BOTTOM[1] * t)
            b = int(COLOR_SKY_TOP[2] * (1 - t) + COLOR_SKY_BOTTOM[2] * t)
            pygame.draw.line(self.screen, (r, g, b), (0, y), (SCREEN_WIDTH, y))

    def _render_ground(self):
        """Draw grass ground."""
        ground_rect = pygame.Rect(0, 240, SCREEN_WIDTH, SCREEN_HEIGHT - 240)
        pygame.draw.rect(self.screen, COLOR_GRASS_1, ground_rect)

        # Grass stripes
        stripe_colors = [COLOR_GRASS_1, COLOR_GRASS_2]
        for y in range(240, SCREEN_HEIGHT, 8):
            c = stripe_colors[(y // 8) % 2]
            pygame.draw.line(self.screen, c, (0, y), (SCREEN_WIDTH, y))

    def _render_paths(self):
        """Draw garden paths."""
        # Main horizontal path
        path_rect = pygame.Rect(0, 460, SCREEN_WIDTH, 60)
        pygame.draw.rect(self.screen, COLOR_PATH, path_rect)
        pygame.draw.rect(self.screen, (170, 155, 130), path_rect, 1)

        # Small fence posts
        for x in range(0, SCREEN_WIDTH, 120):
            pygame.draw.rect(self.screen, (160, 130, 100), (x, 455, 8, 12))
            pygame.draw.rect(self.screen, (160, 130, 100), (x, 510, 8, 12))

    def _render_plants(self):
        """Render each file as a plant."""
        gardener_sprite = self.load_sprite("gardener/Gardener.png")
        for plant in self.plants:
            x, y = plant["x"], plant["y"]

            # Plant body (colored based on health)
            if plant["variant"] == "healthy":
                color = (46, 125, 50)
            elif plant["variant"] == "wilting":
                color = (255, 179, 0)
            else:
                color = (180, 60, 30)

            # Stem
            pygame.draw.rect(self.screen, (60, 140, 40), (x + 28, y + 30, 6, 40))

            if plant["variant"] == "healthy":
                # Flower top (sunflower-like)
                pygame.draw.circle(self.screen, (255, 200, 0), (x + 32, y + 20), 20)
                pygame.draw.circle(self.screen, (100, 60, 20), (x + 32, y + 20), 10)
            elif plant["variant"] == "wilting":
                # Drooping flower
                pygame.draw.circle(self.screen, (200, 160, 0), (x + 32, y + 24), 16)
                pygame.draw.circle(self.screen, (100, 60, 20), (x + 32, y + 24), 8)
            else:
                # Dead plant
                pygame.draw.line(self.screen, (100, 50, 20), (x + 28, y + 10), (x + 36, y + 70), 3)
                pygame.draw.line(self.screen, (100, 50, 20), (x + 36, y + 10), (x + 28, y + 70), 3)

            # Name tag
            label = self.font_small.render(Path(plant["path"]).name, True, (60, 60, 50))
            label_rect = label.get_rect(center=(x + 32, y + 80))
            # Background for readability
            pygame.draw.rect(self.screen, (255, 255, 240, 200), label_rect.inflate(6, 2))
            self.screen.blit(label, label_rect)

    def _render_gardener(self):
        """Render the gardener character."""
        # Smooth movement toward target
        self.gardener_x += (self.gardener_target_x - self.gardener_x) * 0.02
        self.gardener_y += (self.gardener_target_y - self.gardener_y) * 0.02

        # Draw gardener
        sprite = self.load_sprite("gardener/Gardener.png")
        if sprite:
            # Scale to appropriate size
            scaled = pygame.transform.scale(sprite, (48, 56))
            self.screen.blit(scaled, (self.gardener_x - 24, self.gardener_y - 28))
        else:
            # Fallback: draw a cute character with shapes
            body_y = int(self.gardener_y)
            body_x = int(self.gardener_x)

            # Body (overalls)
            pygame.draw.ellipse(self.screen, (60, 140, 80), (body_x - 14, body_y - 14, 28, 32))
            # Head
            pygame.draw.circle(self.screen, (255, 220, 180), (body_x, body_y - 22), 12)
            # Hat
            pygame.draw.ellipse(self.screen, (200, 170, 100), (body_x - 16, body_y - 32, 32, 10))
            pygame.draw.ellipse(self.screen, (200, 170, 100), (body_x - 10, body_y - 36, 20, 8))

        # Phase label above gardener
        phases_cn = ["🔍 Observe", "🩺 Diagnose", "📋 Plan", "🔧 Act", "✅ Verify", "📝 Learn", "🔁 Decide"]
        label = self.font_medium.render(phases_cn[self.loop_phase], True, (30, 60, 30))
        label_rect = label.get_rect(center=(self.gardener_x, self.gardener_y - 44))
        pygame.draw.rect(self.screen, (255, 255, 240, 200), label_rect.inflate(12, 4))
        self.screen.blit(label, label_rect)

    def _render_hud(self):
        """Render HUD overlay: health score, issues, settings button."""
        dx, dy = 20, 20

        # Garden name
        title = self.font_large.render("🌱 Little Gardener", True, (30, 60, 30))
        self.screen.blit(title, (dx, dy))

        # Health score
        health = self.state.get("health", {}).get("current", 100)
        if health >= 70:
            h_color = COLOR_HEALTH_GREEN
        elif health >= 40:
            h_color = COLOR_HEALTH_YELLOW
        else:
            h_color = COLOR_HEALTH_RED

        health_label = self.font_medium.render(f"健康度: {health}/100", True, h_color)
        self.screen.blit(health_label, (dx, dy + 36))

        # Health bar
        bar_bg = pygame.Rect(dx, dy + 60, 200, 16)
        bar_fill = pygame.Rect(dx, dy + 60, int(200 * health / 100), 16)
        pygame.draw.rect(self.screen, (200, 200, 200), bar_bg)
        pygame.draw.rect(self.screen, h_color, bar_fill)
        pygame.draw.rect(self.screen, (100, 100, 100), bar_bg, 1)

        # Issue count
        issues = self.state.get("issues", [])
        issue_label = self.font_small.render(f"问题: {len(issues)} 个", True, COLOR_TEXT)
        self.screen.blit(issue_label, (dx, dy + 84))

        # Settings toggle button (top right)
        self._render_settings_toggle()

        # Standby indicator
        if self.standby:
            standby_label = self.font_medium.render("⏸ 待机中 — 按 SPACE 唤醒", True, (180, 120, 40))
            sb_rect = standby_label.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 30))
            pygame.draw.rect(self.screen, (255, 255, 240, 200), sb_rect.inflate(16, 6))
            self.screen.blit(standby_label, sb_rect)

    def _render_settings_toggle(self):
        """Render the settings gear button."""
        mx, my = pygame.mouse.get_pos()
        btn_rect = pygame.Rect(SCREEN_WIDTH - 44, 16, 28, 28)
        is_hover = btn_rect.collidepoint(mx, my)
        color = COLOR_BUTTON_HOVER if is_hover else COLOR_BUTTON
        pygame.draw.rect(self.screen, color, btn_rect, border_radius=4)
        # Gear icon (simple)
        label = self.font_medium.render("⚙", True, (220, 230, 200))
        self.screen.blit(label, (SCREEN_WIDTH - 42, 18))

        if is_hover:
            tip = self.font_small.render("设置 (S)", True, (200, 200, 200))
            self.screen.blit(tip, (SCREEN_WIDTH - 100, 48))

    def _is_over_settings_toggle(self, mx: int, my: int) -> bool:
        btn_rect = pygame.Rect(SCREEN_WIDTH - 44, 16, 28, 28)
        return btn_rect.collidepoint(mx, my)

    def _is_over_close_btn(self, mx: int, my: int) -> bool:
        if not self.show_settings:
            return False
        close_rect = pygame.Rect(SCREEN_WIDTH - 320, 16, 24, 24)
        return close_rect.collidepoint(mx, my)

    # ─── Settings Panel ───

    def _render_settings_panel(self):
        """Render the collapsible rule settings panel on the right side."""
        panel_w = 300
        panel_x = SCREEN_WIDTH - panel_w
        panel_rect = pygame.Rect(panel_x, 0, panel_w, SCREEN_HEIGHT)

        # Semi-transparent background
        panel_surf = pygame.Surface((panel_w, SCREEN_HEIGHT), pygame.SRCALPHA)
        panel_surf.fill(COLOR_PANEL_BG)
        self.screen.blit(panel_surf, (panel_x, 0))

        # Title
        title = self.font_medium.render("⚙ 规则设置", True, COLOR_TEXT_LIGHT)
        self.screen.blit(title, (panel_x + 16, 20))

        # Close button
        close_label = self.font_medium.render("✕", True, (200, 200, 200))
        self.screen.blit(close_label, (panel_x + panel_w - 32, 18))

        # Sections
        y_offset = 56
        sections = [
            ("⏱ 调度", self._render_schedule_section, 120),
            ("📏 阈值", self._render_thresholds_section, 120),
            ("🔍 检测", self._render_detection_section, 100),
            ("⚡ 策略", self._render_action_section, 100),
            ("🔄 Loop 流程", self._render_loop_section, 160),
        ]

        for section_title, render_fn, height in sections:
            if y_offset + 10 > SCREEN_HEIGHT:
                break
            # Section header
            hdr = self.font_small.render(section_title, True, (200, 220, 180))
            self.screen.blit(hdr, (panel_x + 16, y_offset))
            y_offset += 22

            # Section content
            content = render_fn(panel_x + 16, y_offset)
            y_offset += content + 4

    # ── Setting section renderers ──

    def _render_schedule_section(self, x: int, y: int) -> int:
        cfg = self.config.get("schedule", {})
        texts = []
        if cfg.get("enabled"):
            texts.append(f"✓ 已启用 | {cfg.get('cron', 'N/A')}")
        else:
            texts.append("○ 未启用 (点击切换)")
        for i, t in enumerate(texts):
            lbl = self.font_small.render(t, True, (190, 200, 180))
            self.screen.blit(lbl, (x + 8, y + i * 18))
        return 40

    def _render_thresholds_section(self, x: int, y: int) -> int:
        th = self.config.get("thresholds", {})
        texts = [
            f"枯萎阈值: {th.get('staleDays', 30)} 天",
            f"膨胀行数: {th.get('maxLines', 200)} 行",
            f"膨胀字数: {th.get('maxWords', 1000)} 字",
        ]
        for i, t in enumerate(texts):
            lbl = self.font_small.render(t, True, (190, 200, 180))
            self.screen.blit(lbl, (x + 8, y + i * 18))
        return 60

    def _render_detection_section(self, x: int, y: int) -> int:
        det = self.config.get("detection", {})
        texts = [
            f"枯萎检测: {'✓' if det.get('stale', True) else '✗'}",
            f"矛盾检测: {'✓' if det.get('contradiction', True) else '✗'}",
        ]
        for i, t in enumerate(texts):
            lbl = self.font_small.render(t, True, (190, 200, 180))
            self.screen.blit(lbl, (x + 8, y + i * 18))
        return 40

    def _render_action_section(self, x: int, y: int) -> int:
        act = self.config.get("action", {})
        mode_map = {"ask": "询问后执行", "auto": "自动执行", "report-only": "仅报告"}
        mode = mode_map.get(act.get("mode", "ask"), act.get("mode", "ask"))
        texts = [
            f"策略: {mode}",
        ]
        for i, t in enumerate(texts):
            lbl = self.font_small.render(t, True, (190, 200, 180))
            self.screen.blit(lbl, (x + 8, y + i * 18))
        return 24

    def _render_loop_section(self, x: int, y: int) -> int:
        loop = self.config.get("loop", {})
        exit_cfg = loop.get("exitCondition", {})
        skip = loop.get("skipPhases", [])
        skip_text = f"跳过阶段: {'、'.join(skip) if skip else '无'}"
        texts = [
            f"停止目标: ≥{exit_cfg.get('healthTarget', 90)} 分",
            f"无改进上限: {exit_cfg.get('maxRoundsNoImprovement', 3)} 轮",
            skip_text,
        ]
        for i, t in enumerate(texts):
            lbl = self.font_small.render(t, True, (190, 200, 180))
            self.screen.blit(lbl, (x + 8, y + i * 18))
        return 56


# ─── Entry point ───

def run_garden(state: Dict[str, Any], project_path: str = "."):
    """Launch the garden window."""
    pygame.init()
    scene = GardenScene(state, project_path)
    scene.run()
    pygame.quit()
