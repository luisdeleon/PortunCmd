# Claude CLI Statusline Setup Guide

This guide documents the complete setup for displaying a custom statusline at the bottom of Claude CLI that shows:
- Current AI model (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- Current directory
- Git branch
- Session usage percentage
- Week usage percentage

## What You'll See

```
🤖 Sonnet 4.5 | 📁 PortunCmd | 🌿 main | S: 32% | W: 4%
```

## Complete Setup Steps

### 1. Create the Main Statusline Script

Create the file `~/.claude/statusline.sh`:

```bash
#!/bin/bash

# Debug log file (uncomment to enable debugging)
LOG_FILE="$HOME/.claude/statusline.log"

# Read JSON input from stdin
# Use a non-blocking read to prevent hanging
json=$(cat 2>/dev/null || echo '{}')

# Fallback if no input or empty JSON
if [ -z "$json" ] || [ "$json" = "{}" ]; then
    # Use current working directory as fallback
    dir=$(basename "$PWD")
    if git rev-parse --git-dir > /dev/null 2>&1; then
        branch=$(git branch --show-current 2>/dev/null)
        if [ -n "$branch" ]; then
            echo -e "\033[36m🤖 Claude\033[0m | \033[33m📁 $dir\033[0m | \033[35m🌿 $branch\033[0m"
        else
            echo -e "\033[36m🤖 Claude\033[0m | \033[33m📁 $dir\033[0m"
        fi
    else
        echo -e "\033[36m🤖 Claude\033[0m | \033[33m📁 $dir\033[0m"
    fi
    exit 0
fi

# Debug: Log the JSON received (uncomment to debug)
# echo "$(date): JSON received: $json" >> "$LOG_FILE"

# Extract information with error handling
# Note: Claude CLI uses snake_case: display_name, not displayName
model=$(echo "$json" | jq -r '.model.display_name // .model.displayName // .model.name // "Claude"' 2>/dev/null || echo "Claude")

# Debug: Log extracted model
# echo "$(date): Extracted model: $model" >> "$LOG_FILE"

work_dir=$(echo "$json" | jq -r '.workspace.current_dir // .workingDirectory // ""' 2>/dev/null)
project_dir=$(echo "$json" | jq -r '.workspace.project_dir // .projectDirectory // ""' 2>/dev/null)

# Extract usage data from cache file (updated by background script)
CACHE_FILE="$HOME/.claude/usage-cache.txt"

# Default values
session_pct="0"
week_pct="0"

# Read from cache if it exists and is recent (less than 5 minutes old)
if [ -f "$CACHE_FILE" ]; then
    source "$CACHE_FILE" 2>/dev/null

    # Check if cache is stale (older than 5 minutes = 300 seconds)
    if [ -n "$last_update" ]; then
        current_time=$(date +%s)
        age=$((current_time - last_update))
        if [ $age -gt 300 ]; then
            # Cache is stale, reset to 0 but keep showing
            session_pct="${session_pct:-0}"
            week_pct="${week_pct:-0}"
        fi
    fi
fi

# Determine which directory to use
if [ -n "$work_dir" ] && [ "$work_dir" != "null" ] && [ "$work_dir" != '""' ]; then
    dir=$(basename "$work_dir")
    target_dir="$work_dir"
elif [ -n "$project_dir" ] && [ "$project_dir" != "null" ] && [ "$project_dir" != '""' ]; then
    dir=$(basename "$project_dir")
    target_dir="$project_dir"
else
    dir=$(basename "$PWD")
    target_dir="$PWD"
fi

# Get git branch from target directory
git_branch=""
if [ -d "$target_dir" ]; then
    if (cd "$target_dir" 2>/dev/null && git rev-parse --git-dir > /dev/null 2>&1); then
        git_branch=$(cd "$target_dir" 2>/dev/null && git branch --show-current 2>/dev/null)
    fi
fi

# Build status line with colors
# Cyan for model, Yellow for directory, Magenta for branch, Green for usage
status_line="\033[36m🤖 $model\033[0m | \033[33m📁 $dir\033[0m"

if [ -n "$git_branch" ]; then
    status_line="$status_line | \033[35m🌿 $git_branch\033[0m"
fi

# Add session usage if available (only show if > 0)
if [ "$session_pct" != "0" ] && [ "$session_pct" != "0.0" ]; then
    status_line="$status_line | \033[32mS: ${session_pct}%\033[0m"
fi

# Add week usage if available (only show if > 0)
if [ "$week_pct" != "0" ] && [ "$week_pct" != "0.0" ]; then
    status_line="$status_line | \033[32mW: ${week_pct}%\033[0m"
fi

echo -e "$status_line"
```

Make it executable:
```bash
chmod +x ~/.claude/statusline.sh
```

### 2. Create the Usage Update Script

Create the file `~/.claude/update-usage-now.sh`:

```bash
#!/bin/bash

# Manual usage update script
# Run this anytime to update your usage cache
# Usage: ~/.claude/update-usage-now.sh [session_pct] [week_pct]

CACHE_FILE="$HOME/.claude/usage-cache.txt"

# If percentages provided as arguments, use them
if [ $# -eq 2 ]; then
    session_pct=$1
    week_pct=$2
else
    # Prompt user for input
    echo "Enter current session usage % (from /usage command):"
    read session_pct
    echo "Enter current week usage % (from /usage command):"
    read week_pct
fi

# Validate inputs are numbers
if ! [[ "$session_pct" =~ ^[0-9]+$ ]]; then
    echo "Error: Session percentage must be a number"
    exit 1
fi

if ! [[ "$week_pct" =~ ^[0-9]+$ ]]; then
    echo "Error: Week percentage must be a number"
    exit 1
fi

# Write to cache file
temp_file="${CACHE_FILE}.tmp"
echo "session_pct=$session_pct" > "$temp_file"
echo "week_pct=$week_pct" >> "$temp_file"
echo "last_update=$(date +%s)" >> "$temp_file"
mv "$temp_file" "$CACHE_FILE"

echo "✅ Usage cache updated: Session ${session_pct}%, Week ${week_pct}%"
echo "   Your statusline will now show these values!"
```

Make it executable:
```bash
chmod +x ~/.claude/update-usage-now.sh
```

### 3. Configure Claude CLI Settings

#### Global Settings

Edit `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  }
}
```

#### Project-Specific Settings (Optional)

Edit `<project>/.claude/settings.local.json` to include:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  },
  "permissions": {
    "allow": [
      "Bash(~/.claude/statusline.sh)",
      "Bash(bc:*)"
    ]
  }
}
```

### 4. Add Shell Alias for Quick Updates

Add to your `~/.zshrc` (or `~/.bashrc` if using bash):

```bash
# Claude CLI usage update alias
# Quick update: cu [session%] [week%]
# Example: cu 32 4
alias cu='~/.claude/update-usage-now.sh'
alias claude-update-usage='~/.claude/update-usage-now.sh'
```

Reload your shell configuration:
```bash
source ~/.zshrc
```

### 5. Initialize the Usage Cache

After checking `/usage` in Claude CLI, initialize your cache:

```bash
cu 32 4
```

Replace `32` and `4` with your actual session and week percentages.

## Daily Usage

1. **Check usage in Claude CLI**:
   ```
   /usage
   ```

2. **Update the statusline** (in terminal):
   ```bash
   cu 35 5
   ```

That's it! Your statusline will now show the updated percentages.

## How It Works

### Architecture

1. **Statusline Script** (`~/.claude/statusline.sh`)
   - Receives JSON data from Claude CLI
   - Extracts model name, directory, git branch
   - Reads usage data from cache file
   - Displays formatted statusline

2. **Usage Cache** (`~/.claude/usage-cache.txt`)
   - Stores session and week percentages
   - Updated manually via `cu` command
   - Lightweight text file (instant reads)

3. **Update Helper** (`~/.claude/update-usage-now.sh`)
   - Takes percentages as arguments
   - Writes to cache file with timestamp
   - Validates input

### Why This Approach?

**Problem**: Claude CLI v2.0.42 doesn't expose usage data to the statusline JSON interface.

**Solution**: Manual cache updates
- ✅ Simple and lightweight
- ✅ No background processes
- ✅ No resource overhead
- ✅ No API calls
- ✅ Instant display
- ✅ You control when to update

### Data Flow

```
/usage command (in Claude CLI)
    ↓
You see: Session 35%, Week 5%
    ↓
Run: cu 35 5
    ↓
Updates: ~/.claude/usage-cache.txt
    ↓
Statusline reads cache
    ↓
Display: S: 35% | W: 5%
```

## Color Coding

- 🤖 **Cyan** - AI Model name (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- 📁 **Yellow** - Current directory
- 🌿 **Magenta** - Git branch
- **Green** - Usage percentages (S: X%, W: Y%)

## Troubleshooting

### Statusline Not Showing

1. **Check if settings are configured**:
   ```bash
   cat ~/.claude/settings.json
   ```

2. **Verify script is executable**:
   ```bash
   ls -la ~/.claude/statusline.sh
   ```

3. **Test script manually**:
   ```bash
   echo '{"model":{"display_name":"Sonnet 4.5"},"workspace":{"current_dir":"'$PWD'"}}' | ~/.claude/statusline.sh
   ```

### Usage Percentages Not Showing

1. **Check if cache file exists**:
   ```bash
   cat ~/.claude/usage-cache.txt
   ```

2. **Initialize cache**:
   ```bash
   cu 0 0
   ```

3. **Verify cache is being read**:
   - The statusline should show `S: 0% | W: 0%` after initialization

### Model Name Shows "Claude" Instead of Actual Model

This is a fallback. It means:
- JSON from Claude CLI is empty/malformed
- Usually happens when not in an active Claude session
- Will show correct model name when Claude CLI is running

### Git Branch Not Showing

1. **Ensure you're in a git repository**:
   ```bash
   git status
   ```

2. **Check if branch has a name**:
   ```bash
   git branch --show-current
   ```

## Debugging

### Enable Debug Logging

Edit `~/.claude/statusline.sh` and uncomment these lines:

```bash
# Change from:
# echo "$(date): JSON received: $json" >> "$LOG_FILE"

# To:
echo "$(date): JSON received: $json" >> "$LOG_FILE"
```

Then check the log:
```bash
tail -f ~/.claude/statusline.log
```

### Disable Debug Logging

Re-comment the lines and remove the log file:
```bash
rm ~/.claude/statusline.log
```

## Advanced Customization

### Change Colors

Edit `~/.claude/statusline.sh` and modify ANSI color codes:

```bash
# Current colors:
# \033[36m = Cyan
# \033[33m = Yellow
# \033[35m = Magenta
# \033[32m = Green
# \033[0m  = Reset

# Available colors:
# \033[30m = Black
# \033[31m = Red
# \033[32m = Green
# \033[33m = Yellow
# \033[34m = Blue
# \033[35m = Magenta
# \033[36m = Cyan
# \033[37m = White
```

### Add More Information

You can add additional fields from the JSON:

```bash
# Example: Add session ID
session_id=$(echo "$json" | jq -r '.session_id // ""' 2>/dev/null)
if [ -n "$session_id" ]; then
    status_line="$status_line | Session: ${session_id:0:8}"
fi
```

### Change Icons

Replace emojis in the statusline:

```bash
# Current:
# 🤖 = Model
# 📁 = Directory
# 🌿 = Git branch

# Change to whatever you prefer:
status_line="⚡ $model | 📂 $dir | ⎇ $git_branch"
```

## Files Created

This setup creates the following files:

```
~/.claude/
├── statusline.sh              # Main statusline script
├── update-usage-now.sh        # Usage update helper
└── usage-cache.txt           # Usage data cache (created on first update)

~/.claude/settings.json        # Global Claude CLI settings
~/.zshrc                       # Shell configuration (alias added)
```

## Uninstalling

To remove the statusline feature:

1. **Remove from settings**:
   ```bash
   # Edit ~/.claude/settings.json and remove the statusLine section
   ```

2. **Remove scripts**:
   ```bash
   rm ~/.claude/statusline.sh
   rm ~/.claude/update-usage-now.sh
   rm ~/.claude/usage-cache.txt
   ```

3. **Remove alias from shell**:
   ```bash
   # Edit ~/.zshrc and remove the cu alias lines
   ```

4. **Reload shell**:
   ```bash
   source ~/.zshrc
   ```

## Credits

This statusline setup was created to provide at-a-glance visibility of:
- Which AI model you're currently using
- Your current working context (directory, git branch)
- Session and weekly usage limits

It works around the limitation that Claude CLI v2.0.42 doesn't expose usage data through the statusline JSON interface, using a simple, lightweight caching approach instead.
