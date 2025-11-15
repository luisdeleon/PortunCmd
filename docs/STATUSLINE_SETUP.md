# Claude CLI Statusline Setup Guide

This guide documents the setup for displaying a custom statusline at the bottom of Claude CLI that shows:
- Current AI model (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- Current directory
- Git branch

## What You'll See

```
🤖 Sonnet 4.5 | 📁 PortunCmd | 🌿 main
```

## Complete Setup Steps

### 1. Create the Statusline Script

Create the file `~/.claude/statusline.sh`:

```bash
#!/bin/bash

# Read JSON input from stdin
json=$(cat 2>/dev/null || echo '{}')

# Fallback if no input or empty JSON
if [ -z "$json" ] || [ "$json" = "{}" ]; then
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

# Extract model name (Claude CLI uses snake_case: display_name)
model=$(echo "$json" | jq -r '.model.display_name // .model.displayName // .model.name // "Claude"' 2>/dev/null || echo "Claude")

# Extract directory paths
work_dir=$(echo "$json" | jq -r '.workspace.current_dir // .workingDirectory // ""' 2>/dev/null)
project_dir=$(echo "$json" | jq -r '.workspace.project_dir // .projectDirectory // ""' 2>/dev/null)

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
# Cyan for model, Yellow for directory, Magenta for branch
status_line="\033[36m🤖 $model\033[0m | \033[33m📁 $dir\033[0m"

if [ -n "$git_branch" ]; then
    status_line="$status_line | \033[35m🌿 $git_branch\033[0m"
fi

echo -e "$status_line"
```

Make it executable:
```bash
chmod +x ~/.claude/statusline.sh
```

### 2. Configure Claude CLI Settings

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

Edit `<project>/.claude/settings.local.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 0
  },
  "permissions": {
    "allow": [
      "Bash(~/.claude/statusline.sh)"
    ]
  }
}
```

### 3. Test the Setup

Test the script manually:

```bash
echo '{"model":{"display_name":"Sonnet 4.5"},"workspace":{"current_dir":"'$PWD'"}}' | ~/.claude/statusline.sh
```

You should see:
```
🤖 Sonnet 4.5 | 📁 <your-directory> | 🌿 <your-branch>
```

## How It Works

1. **Claude CLI** passes JSON data to the statusline script via stdin
2. **Script extracts**:
   - Model name from `.model.display_name`
   - Directory from `.workspace.current_dir`
   - Git branch by running `git branch --show-current`
3. **Displays** formatted statusline with colors

## Color Coding

- 🤖 **Cyan** - AI Model name (Sonnet 4.5, Haiku 4.5, Opus 4.1)
- 📁 **Yellow** - Current directory
- 🌿 **Magenta** - Git branch

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

3. **Test script manually** (see step 3 above)

### Model Name Shows "Claude" Instead of Actual Model

This is a fallback when:
- JSON from Claude CLI is empty/malformed
- Not in an active Claude session
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

## Advanced Customization

### Change Colors

Edit `~/.claude/statusline.sh` and modify ANSI color codes:

```bash
# Current colors:
# \033[36m = Cyan
# \033[33m = Yellow
# \033[35m = Magenta
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

### Add More Information

You can add additional fields from the JSON:

```bash
# Example: Add session ID
session_id=$(echo "$json" | jq -r '.session_id // ""' 2>/dev/null)
if [ -n "$session_id" ]; then
    status_line="$status_line | Session: ${session_id:0:8}"
fi
```

## Files Created

This setup creates:

```
~/.claude/
├── statusline.sh              # Main statusline script
└── settings.json              # Global Claude CLI settings

<project>/.claude/
└── settings.local.json        # Project-specific settings (optional)
```

## Uninstalling

To remove the statusline feature:

1. **Remove from settings**:
   ```bash
   # Edit ~/.claude/settings.json and remove the statusLine section
   ```

2. **Remove script**:
   ```bash
   rm ~/.claude/statusline.sh
   ```

## Credits

This statusline setup provides at-a-glance visibility of:
- Which AI model you're currently using (Sonnet 4.5, Haiku 4.5, Opus 4.1, etc.)
- Your current working context (directory and git branch)
