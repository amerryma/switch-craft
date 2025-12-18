import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Fuse from 'fuse.js';
import type { Project, Icons } from '../types.js';
import { resolveProjectPath } from '../config.js';
import { getServiceColor as getServiceHexColor } from '../emitters/services/index.js';

interface ProjectSelectorProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onCancel: () => void;
  projectsDir: string;
  noEnv?: boolean;
  icons?: Icons;
}

// True color (24-bit) ANSI codes for vibrant colors
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const RAINBOW_COLORS = [
  '\x1b[38;2;255;50;50m', // red
  '\x1b[38;2;255;150;0m', // orange
  '\x1b[38;2;255;255;0m', // yellow
  '\x1b[38;2;50;255;100m', // green
  '\x1b[38;2;0;255;255m', // cyan
  '\x1b[38;2;80;150;255m', // blue
  '\x1b[38;2;180;100;255m', // purple
  '\x1b[38;2;255;100;255m', // magenta
] as const;

// Convert hex color to ANSI escape code
function hexToAnsi(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

// Get ANSI color for a service (converts hex from registry to ANSI)
function getServiceColor(service: string): string {
  return hexToAnsi(getServiceHexColor(service));
}

// Rainbow from center outward (colors flow outward)
function rainbowText(text: string, offset: number = 0): string {
  const mid = Math.floor(text.length / 2);
  return (
    text
      .split('')
      .map((char, i) => {
        // Distance from center
        const dist = Math.abs(i - mid);
        // Subtract offset so colors flow outward from center
        const colorIndex =
          (((dist - offset) % RAINBOW_COLORS.length) + RAINBOW_COLORS.length) %
          RAINBOW_COLORS.length;
        return `${RAINBOW_COLORS[colorIndex]}${char}`;
      })
      .join('') + COLORS.reset
  );
}

// Rotate string by n positions (positive = left rotation)
function rotateString(str: string, n: number): string {
  const len = str.length;
  const shift = ((n % len) + len) % len;
  return str.slice(shift) + str.slice(0, shift);
}

// Generate preview of commands that will run (only show what will be SET, not what will be cleared)
function generatePreview(project: Project, projectsDir: string, noEnv: boolean): string[] {
  const commands: string[] = [];
  const fullPath = resolveProjectPath(projectsDir, project.path);

  if (!noEnv) {
    // Only show commands that SET something, not clear/unset commands

    // Kubectx
    if (project.kubectx) {
      commands.push(`kubectx ${project.kubectx}`);
    }

    // GCloud
    if (project.gcloud) {
      commands.push(`gcloud config activate ${project.gcloud}`);
    }

    // AWS
    if (project.aws) {
      commands.push(`export AWS_PROFILE=${project.aws}`);
    }

    // Azure
    if (project.azure) {
      commands.push(`# Azure account: ${project.azure}`);
    }

    // Custom env vars
    if (project.env) {
      for (const [key, value] of Object.entries(project.env)) {
        commands.push(`export ${key}=${value}`);
      }
    }

    // Virtual environment
    if (project.venv) {
      commands.push(`source ${project.venv}/bin/activate`);
    }
  }

  // Change directory
  commands.push(`cd ${fullPath}`);

  return commands;
}

export function ProjectSelector({
  projects,
  onSelect,
  onCancel,
  projectsDir,
  noEnv,
  icons,
}: ProjectSelectorProps) {
  const { exit } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [colorOffset, setColorOffset] = useState(0);
  const [titleRotation, setTitleRotation] = useState(0);
  const [titleDirection, setTitleDirection] = useState<'forward' | 'backward' | 'pause'>('forward');
  const [showPreview, setShowPreview] = useState(false);
  const lastCtrlAction = useRef<{ char: string; time: number }>({ char: '', time: 0 });
  const pauseCount = useRef(0);

  const TITLE = 'switch-craft';
  const FULL_LENGTH = TITLE.length; // 12 - full rotation back to start
  const PAUSE_FRAMES = 20; // ~2 seconds at 100ms interval

  const fuse = new Fuse(projects, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  });

  const filteredProjects = query ? fuse.search(query).map((r) => r.item) : projects;

  const maxVisible = 10;

  // Calculate visible window with scrolling
  const visibleProjects = filteredProjects.slice(scrollOffset, scrollOffset + maxVisible);
  const hasMoreAbove = scrollOffset > 0;
  const hasMoreBelow = scrollOffset + maxVisible < filteredProjects.length;

  // Animation effect - cycle colors and rotate title
  useEffect(() => {
    const interval = setInterval(() => {
      setColorOffset((prev) => (prev + 1) % RAINBOW_COLORS.length);

      // Title rotation animation - full left, pause, full right, pause, loop
      if (titleDirection === 'pause') {
        pauseCount.current++;
        if (pauseCount.current >= PAUSE_FRAMES) {
          setTitleDirection(titleRotation >= FULL_LENGTH ? 'backward' : 'forward');
          pauseCount.current = 0;
        }
      } else if (titleDirection === 'forward') {
        setTitleRotation((prev) => {
          if (prev >= FULL_LENGTH) {
            // Completed full rotation back to "switch-craft", pause
            setTitleDirection('pause');
            return prev;
          }
          return prev + 1;
        });
      } else if (titleDirection === 'backward') {
        setTitleRotation((prev) => {
          if (prev <= 0) {
            // Back to start, pause
            setTitleDirection('pause');
            return prev;
          }
          return prev - 1;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [titleDirection, titleRotation, FULL_LENGTH]);

  // Clean up characters added via Ctrl+key combinations
  useEffect(() => {
    const timeSince = Date.now() - lastCtrlAction.current.time;
    const char = lastCtrlAction.current.char;

    // If a character was added via Ctrl+key within last 100ms, remove it
    if (char && query.endsWith(char) && timeSince < 100) {
      setQuery(query.slice(0, -char.length));
      lastCtrlAction.current = { char: '', time: 0 };
    }
  }, [query]);

  // Reset selection and scroll when query changes
  useEffect(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [query]);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onCancel();
      exit();
      return;
    }

    if (key.ctrl && input === 'o') {
      lastCtrlAction.current = { char: 'o', time: Date.now() };
      setShowPreview((prev) => !prev);
      return;
    }

    if (key.return) {
      const selected = filteredProjects[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
      return;
    }

    if (key.upArrow) {
      if (selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);
        // Scroll up if selection goes above visible window
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
      }
      return;
    }

    if (key.downArrow) {
      if (selectedIndex < filteredProjects.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);
        // Scroll down if selection goes below visible window
        if (newIndex >= scrollOffset + maxVisible) {
          setScrollOffset(newIndex - maxVisible + 1);
        }
      }
      return;
    }
  });

  // Build header with rotating title and static rainbow (no pulse)
  const rotatedTitle = rotateString(TITLE, titleRotation);
  const staticRainbowTitle = rainbowText(rotatedTitle, 0); // offset=0 for static rainbow

  return (
    <Box flexDirection="column">
      {/* Rotating Header with static rainbow */}
      <Box marginBottom={1}>
        <Text>{`${COLORS.dim}>${COLORS.reset} ${staticRainbowTitle}`}</Text>
        <Text dimColor> - Select a project</Text>
      </Box>

      {/* Search input */}
      <Box>
        <Text color="cyan">Search: </Text>
        <TextInput value={query} onChange={setQuery} placeholder="Type to filter..." />
      </Box>

      {/* Project list - scrollable, no color unless selected, colored prefixes */}
      <Box flexDirection="column" marginTop={1}>
        {/* Scroll indicator - above */}
        {hasMoreAbove && <Text dimColor> ↑ {scrollOffset} more above</Text>}

        {visibleProjects.length === 0 ? (
          <Text dimColor> No matches found</Text>
        ) : (
          visibleProjects.map((project, visibleIndex) => {
            // Calculate actual index in filtered list
            const actualIndex = scrollOffset + visibleIndex;
            const isSelected = actualIndex === selectedIndex;

            // Build the line with ANSI codes
            let line = '';
            if (isSelected) {
              // Animated rainbow for selected item
              const selector = rainbowText('>', colorOffset);
              const name = rainbowText(project.name, colorOffset);
              line += `${selector} ${COLORS.bold}${name}${COLORS.reset}`;
            } else {
              // No color for unselected
              line += `  ${project.name}`;
            }

            // Add metadata with service-specific colors and optional icons
            const metaParts: string[] = [];
            if (project.kubectx) {
              const label = icons?.k8s ? `${icons.k8s} k8s` : 'k8s';
              metaParts.push(
                `${getServiceColor('k8s')}${label}:${COLORS.reset} ${project.kubectx}`
              );
            }
            if (project.gcloud) {
              const label = icons?.gcp ? `${icons.gcp} gcp` : 'gcp';
              metaParts.push(`${getServiceColor('gcp')}${label}:${COLORS.reset} ${project.gcloud}`);
            }
            if (project.aws) {
              const label = icons?.aws ? `${icons.aws} aws` : 'aws';
              metaParts.push(`${getServiceColor('aws')}${label}:${COLORS.reset} ${project.aws}`);
            }
            if (project.azure) {
              const label = icons?.azure ? `${icons.azure} azure` : 'azure';
              metaParts.push(
                `${getServiceColor('azure')}${label}:${COLORS.reset} ${project.azure}`
              );
            }
            if (project.venv) {
              const label = icons?.venv ? `${icons.venv} venv` : 'venv';
              metaParts.push(`${getServiceColor('venv')}${label}:${COLORS.reset} ${project.venv}`);
            }

            if (metaParts.length > 0) {
              line += ` [${metaParts.join('] [')}]`;
            }

            return (
              <Box key={project.name}>
                <Text>{line}</Text>
              </Box>
            );
          })
        )}

        {/* Scroll indicator - below */}
        {hasMoreBelow && (
          <Text dimColor> ↓ {filteredProjects.length - scrollOffset - maxVisible} more below</Text>
        )}
      </Box>

      {/* Command Preview */}
      {showPreview && filteredProjects[selectedIndex] && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
        >
          <Text bold color="cyan">
            Commands Preview:
          </Text>
          {generatePreview(filteredProjects[selectedIndex], projectsDir, noEnv ?? false).map(
            (cmd, i) => (
              <Text key={i} dimColor>
                {' '}
                {cmd}
              </Text>
            )
          )}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          [↑/↓] Navigate {'  '} [Enter] Select {'  '} [Ctrl+O] Preview {'  '} [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
}
