# Raspberry Pi Kiosk Display: Best Practices Guide

A comprehensive guide for building reliable 24/7 kiosk displays using Raspberry Pi with Chromium browser.

## Table of Contents

1. [Chromium Kiosk Mode Configuration](#1-chromium-kiosk-mode-configuration)
2. [Screen Burn-in Prevention](#2-screen-burn-in-prevention)
3. [Automatic Recovery from Crashes](#3-automatic-recovery-from-browser-crashes)
4. [Display Sleep/Wake Scheduling](#4-display-sleepwake-scheduling)
5. [Touch Screen Optimizations](#5-touch-screen-vs-non-touch-optimizations)
6. [Network Reconnection Handling](#6-network-reconnection-handling)
7. [Auto-Update Mechanisms](#7-auto-update-mechanisms-for-display-url)

---

## 1. Chromium Kiosk Mode Configuration

### Prerequisites

**Hardware Requirements:**
- Raspberry Pi 3 or newer with at least 1GB RAM
- Raspberry Pi 4 or 5 recommended for 24/7 operation

**Operating System:**
- Raspberry Pi OS Bookworm or Trixie (latest versions use labwc/Wayland by default)

### Installation

```bash
#!/bin/bash
# install-kiosk-packages.sh
# Install required packages for kiosk mode

sudo apt update && sudo apt upgrade -y

# For X11-based setup (more compatible)
sudo apt-get install --no-install-recommends -y \
    xserver-xorg \
    x11-xserver-utils \
    xinit \
    openbox \
    chromium-browser \
    unclutter

# For Wayland/labwc setup (default on newer Pi OS)
# Packages are typically pre-installed on desktop image
```

### Chromium Launch Flags (Essential for 24/7 Operation)

```bash
# /usr/local/bin/kiosk-browser.sh
#!/bin/bash

KIOSK_URL="${KIOSK_URL:-https://your-default-url.com}"

# Essential flags for kiosk mode
chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --incognito \
    --start-maximized \
    --disable-translate \
    --disable-notifications \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --password-store=basic \
    --disk-cache-dir=/dev/null \
    --check-for-update-interval=31536000 \
    --window-position=0,0 \
    "$KIOSK_URL"
```

**Flag Explanations:**

| Flag | Purpose |
|------|---------|
| `--kiosk` | Full-screen mode without browser chrome |
| `--noerrdialogs` | Suppress error dialogs |
| `--disable-infobars` | Hide info bars (e.g., "Chrome is being controlled") |
| `--disable-session-crashed-bubble` | Prevent crash recovery prompts |
| `--no-first-run` | Skip first-run wizard |
| `--incognito` | No persistent state between sessions |
| `--disable-pinch` | Disable pinch-to-zoom (important for touch) |
| `--overscroll-history-navigation=0` | Disable swipe navigation |
| `--password-store=basic` | Prevent keyring unlock prompts |
| `--disk-cache-dir=/dev/null` | Reduce SD card writes |

### Autostart Configuration

**For X11/Openbox Setup:**

```bash
# /etc/xdg/openbox/autostart
#!/bin/bash

# Disable power management
xset s off
xset s noblank
xset -dpms

# Hide cursor after 0.5 seconds of inactivity
unclutter -idle 0.5 -root &

# Prevent restore prompts after crash
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Start kiosk browser
/usr/local/bin/kiosk-browser.sh &
```

**For Wayland/labwc Setup (Raspberry Pi OS Bookworm+):**

```bash
# ~/.config/labwc/autostart
#!/bin/bash

# Move cursor to corner (hide it on Wayland)
wlr-randr 2>/dev/null && sleep 2 && wtype -M ctrl -M shift -k End 2>/dev/null

# Prevent restore prompts
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Start kiosk browser
/usr/local/bin/kiosk-browser.sh &
```

### Boot Configuration

```bash
# Configure auto-login to console
sudo raspi-config nonint do_boot_behaviour B2

# Add to ~/.bash_profile for X11 auto-start
echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx -- -nocursor' >> ~/.bash_profile
```

---

## 2. Screen Burn-in Prevention

### Understanding Burn-in Risks

- **LCD displays**: Minimal risk, but image persistence can occur with static content > 2 hours
- **OLED displays**: High risk; individual pixels degrade, especially blue pixels
- **Small OLED modules**: Not designed for 24/7 operation; will degrade rapidly

### Prevention Strategies

#### Strategy 1: Pixel Shifting

```bash
# /usr/local/bin/pixel-shift.sh
#!/bin/bash

# Shift content slightly every 15 minutes
# Works by reloading page with slight CSS offset

SHIFT_PIXELS=2
DIRECTION=$((RANDOM % 4))

case $DIRECTION in
    0) OFFSET="margin-top: ${SHIFT_PIXELS}px;" ;;
    1) OFFSET="margin-bottom: ${SHIFT_PIXELS}px;" ;;
    2) OFFSET="margin-left: ${SHIFT_PIXELS}px;" ;;
    3) OFFSET="margin-right: ${SHIFT_PIXELS}px;" ;;
esac

# Inject CSS via browser extension or modify displayed page
# This is typically handled at the application level
```

#### Strategy 2: Scheduled Content Refresh

```bash
# /usr/local/bin/refresh-browser.sh
#!/bin/bash

# Force refresh browser every 30 minutes to prevent static content
# Uses xdotool for X11 or wtype for Wayland

if [ -n "$WAYLAND_DISPLAY" ]; then
    # Wayland: Use wtype to send Ctrl+F5
    wtype -M ctrl -k F5
else
    # X11: Use xdotool
    export DISPLAY=:0
    xdotool key ctrl+F5
fi
```

```bash
# Add to crontab (crontab -e)
*/30 * * * * /usr/local/bin/refresh-browser.sh
```

#### Strategy 3: Brightness Management

```bash
# /usr/local/bin/set-brightness.sh
#!/bin/bash

# Reduce brightness during off-hours (50-70% recommended for longevity)
BRIGHTNESS=${1:-70}

# For official Raspberry Pi display
echo "$BRIGHTNESS" | sudo tee /sys/class/backlight/*/brightness

# For HDMI monitors with ddcutil
sudo apt-get install -y ddcutil
sudo ddcutil setvcp 10 $BRIGHTNESS
```

#### Strategy 4: Screensaver for Extended Idle

```bash
# /usr/local/bin/kiosk-screensaver.sh
#!/bin/bash

# Black screen with moving element to prevent burn-in during idle
# Create a simple HTML-based screensaver with CSS animation
# The moving element distributes pixel usage across the screen

cat > /tmp/screensaver.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
<style>
body { background: #000; margin: 0; overflow: hidden; }
.dot {
    width: 50px; height: 50px;
    background: #333;
    border-radius: 50%;
    position: absolute;
    animation: move 30s infinite linear;
}
@keyframes move {
    0% { top: 10%; left: 10%; }
    25% { top: 10%; left: 80%; }
    50% { top: 80%; left: 80%; }
    75% { top: 80%; left: 10%; }
    100% { top: 10%; left: 10%; }
}
</style>
</head>
<body><div class="dot"></div></body>
</html>
HTMLEOF
```

---

## 3. Automatic Recovery from Browser Crashes

### Systemd Service for Browser Management

```bash
# /etc/systemd/user/chromium-kiosk.service
[Unit]
Description=Chromium Kiosk Browser
After=graphical-session.target

[Service]
Type=simple
Environment=DISPLAY=:0
Environment=KIOSK_URL=https://your-url.com
ExecStartPre=/usr/local/bin/fix-chromium-crash-flags.sh
ExecStart=/usr/local/bin/kiosk-browser.sh
Restart=always
RestartSec=5

[Install]
WantedBy=graphical-session.target
```

```bash
# /usr/local/bin/fix-chromium-crash-flags.sh
#!/bin/bash

# Fix crash flags before starting Chromium
CHROMIUM_DIR="$HOME/.config/chromium"

if [ -f "$CHROMIUM_DIR/Local State" ]; then
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$CHROMIUM_DIR/Local State"
fi

if [ -f "$CHROMIUM_DIR/Default/Preferences" ]; then
    sed -i 's/"exit_type":"[^"]*"/"exit_type":"Normal"/' "$CHROMIUM_DIR/Default/Preferences"
fi

# Remove crash recovery files
rm -f "$CHROMIUM_DIR/Default/Current Session" 2>/dev/null
rm -f "$CHROMIUM_DIR/Default/Current Tabs" 2>/dev/null
```

```bash
# Enable the service
chmod +x /usr/local/bin/fix-chromium-crash-flags.sh
chmod +x /usr/local/bin/kiosk-browser.sh
systemctl --user enable chromium-kiosk.service
systemctl --user start chromium-kiosk.service
```

### Watchdog Script (Alternative Approach)

```bash
# /usr/local/bin/kiosk-watchdog.sh
#!/bin/bash

# Monitor and restart browser if it crashes
KIOSK_URL="${KIOSK_URL:-https://your-url.com}"
CHECK_INTERVAL=30

while true; do
    # Check if chromium is running
    if ! pgrep -x "chromium" > /dev/null && ! pgrep -x "chromium-browser" > /dev/null; then
        echo "$(date): Chromium not running, restarting..." >> /var/log/kiosk-watchdog.log

        # Fix crash flags
        /usr/local/bin/fix-chromium-crash-flags.sh

        # Restart browser
        /usr/local/bin/kiosk-browser.sh &
    fi

    sleep $CHECK_INTERVAL
done
```

### Hardware Watchdog for System-Level Recovery

```bash
# /etc/systemd/system.conf
# Add or modify these lines:
RuntimeWatchdogSec=10s
ShutdownWatchdogSec=10min
```

```bash
# Enable hardware watchdog
sudo systemctl daemon-reexec

# Install software watchdog for network monitoring
sudo apt-get install -y watchdog

# /etc/watchdog.conf
ping = 8.8.8.8
ping = 1.1.1.1
ping-count = 5
interface = wlan0
watchdog-device = /dev/watchdog
retry-timeout = 180
realtime = yes
interval = 20
```

```bash
sudo systemctl enable watchdog
sudo systemctl start watchdog
```

### Scheduled System Reboot

```bash
# Weekly reboot to clear memory leaks (crontab -e)
0 3 * * 0 /sbin/shutdown -r now

# Or daily during off-hours
0 4 * * * /sbin/shutdown -r now
```

---

## 4. Display Sleep/Wake Scheduling

### Using vcgencmd (Legacy, Pre-Bookworm)

```bash
# /usr/local/bin/display-power.sh
#!/bin/bash

case "$1" in
    on)
        vcgencmd display_power 1
        ;;
    off)
        vcgencmd display_power 0
        ;;
    *)
        echo "Usage: $0 {on|off}"
        exit 1
        ;;
esac
```

### Using wlr-randr (Wayland/Bookworm+)

```bash
# /usr/local/bin/display-power-wayland.sh
#!/bin/bash

# Get connected output name
OUTPUT=$(wlr-randr | grep -E "^[A-Z]" | head -1 | awk '{print $1}')

case "$1" in
    on)
        wlr-randr --output "$OUTPUT" --on
        ;;
    off)
        wlr-randr --output "$OUTPUT" --off
        ;;
    *)
        echo "Usage: $0 {on|off}"
        exit 1
        ;;
esac
```

### Using DPMS (X11)

```bash
# /usr/local/bin/display-power-x11.sh
#!/bin/bash

export DISPLAY=:0

case "$1" in
    on)
        xset dpms force on
        ;;
    off)
        xset dpms force off
        ;;
    standby)
        xset dpms force standby
        ;;
    *)
        echo "Usage: $0 {on|off|standby}"
        exit 1
        ;;
esac
```

### Cron Schedule Examples

```bash
# crontab -e
# Example: Display on at 7 AM, off at 10 PM weekdays
0 7 * * 1-5 /usr/local/bin/display-power.sh on
0 22 * * 1-5 /usr/local/bin/display-power.sh off

# Weekend schedule: on at 8 AM, off at 11 PM
0 8 * * 0,6 /usr/local/bin/display-power.sh on
0 23 * * 0,6 /usr/local/bin/display-power.sh off
```

### Complete Display Scheduler Service

```bash
# /usr/local/bin/display-scheduler.sh
#!/bin/bash

# Configuration
WEEKDAY_ON="07:00"
WEEKDAY_OFF="22:00"
WEEKEND_ON="08:00"
WEEKEND_OFF="23:00"

get_minutes() {
    echo $(( $(echo "$1" | cut -d: -f1) * 60 + $(echo "$1" | cut -d: -f2) ))
}

current_minutes() {
    echo $(( $(date +%H) * 60 + $(date +%M) ))
}

is_weekend() {
    [ "$(date +%u)" -ge 6 ]
}

should_display_be_on() {
    local now=$(current_minutes)
    local on_time off_time

    if is_weekend; then
        on_time=$(get_minutes $WEEKEND_ON)
        off_time=$(get_minutes $WEEKEND_OFF)
    else
        on_time=$(get_minutes $WEEKDAY_ON)
        off_time=$(get_minutes $WEEKDAY_OFF)
    fi

    [ $now -ge $on_time ] && [ $now -lt $off_time ]
}

# Main logic
if should_display_be_on; then
    /usr/local/bin/display-power.sh on
else
    /usr/local/bin/display-power.sh off
fi
```

```bash
# Run every minute via cron
* * * * * /usr/local/bin/display-scheduler.sh
```

---

## 5. Touch Screen vs Non-Touch Optimizations

### Touch Screen Configuration

```bash
# /usr/local/bin/configure-touchscreen.sh
#!/bin/bash

# Install touchscreen utilities
sudo apt-get install -y libinput-tools

# Disable right-click on long press (X11)
# Create xorg configuration
sudo mkdir -p /etc/X11/xorg.conf.d

cat << 'EOF' | sudo tee /etc/X11/xorg.conf.d/40-libinput.conf
Section "InputClass"
    Identifier "libinput touchscreen catchall"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/*"
    Driver "libinput"
    Option "Tapping" "on"
    Option "TappingDrag" "off"
    Option "DisableWhileTyping" "false"
EndSection
EOF
```

### Chromium Touch-Specific Flags

```bash
# Additional flags for touch screens
TOUCH_FLAGS="
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --pull-to-refresh=0 \
    --disable-features=TouchpadOverscrollHistoryNavigation \
    --touch-events=enabled \
    --enable-touch-drag-drop \
"

# For non-touch displays, disable touch entirely
NON_TOUCH_FLAGS="
    --touch-events=disabled \
"
```

### Disable Context Menu on Long Press (JavaScript)

```javascript
// Inject this JavaScript into your kiosk page
// Or use as Chromium extension

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
}, false);

document.addEventListener('touchstart', function(e) {
    // Prevent default touch behaviors that might cause issues
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });
```

### Touch Calibration (Official Raspberry Pi Display)

```bash
# /boot/firmware/config.txt
# Adjust touch sensitivity and orientation

# For 7-inch display with inverted axes
dtoverlay=vc4-kms-dsi-ili9881-7inch,invx

# Disable touch if using for non-touch kiosk
dtoverlay=vc4-kms-dsi-ili9881-7inch,disable_touch=1
```

### Cursor Hiding

```bash
# For X11 - hide cursor completely
unclutter -idle 0 -root &

# For X11 - hide after inactivity
unclutter -idle 0.5 -root &

# For Wayland - move cursor to corner
# Add to autostart script
sleep 2 && wlr-randr && wl-copy "" 2>/dev/null
# Or use dedicated tool like ydotool to move cursor off-screen
```

### Non-Touch Display Optimization

```bash
# /usr/local/bin/kiosk-browser-notouch.sh
#!/bin/bash

KIOSK_URL="${KIOSK_URL:-https://your-url.com}"

chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --incognito \
    --touch-events=disabled \
    --disable-gesture-typing \
    --password-store=basic \
    --disk-cache-dir=/dev/null \
    "$KIOSK_URL"
```

---

## 6. Network Reconnection Handling

### NetworkManager Configuration (Raspberry Pi OS Bookworm+)

```bash
# Ensure infinite reconnection attempts
sudo nmcli connection modify "Your-WiFi-SSID" connection.autoconnect-retries 0

# View current settings
nmcli connection show "Your-WiFi-SSID" | grep autoconnect
```

### Network Watchdog Script

```bash
# /usr/local/bin/network-watchdog.sh
#!/bin/bash

LOG_FILE="/var/log/network-watchdog.log"
PING_TARGET="8.8.8.8"
CHECK_INTERVAL=60
MAX_FAILURES=3

failure_count=0

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

restart_network() {
    log_message "Restarting network interface..."

    # For NetworkManager
    if command -v nmcli &> /dev/null; then
        nmcli networking off
        sleep 5
        nmcli networking on
        sleep 10
    else
        # For legacy networking
        sudo ip link set wlan0 down
        sleep 5
        sudo ip link set wlan0 up
        sleep 10
    fi
}

while true; do
    if ping -c 1 -W 5 "$PING_TARGET" > /dev/null 2>&1; then
        failure_count=0
    else
        ((failure_count++))
        log_message "Network check failed ($failure_count/$MAX_FAILURES)"

        if [ $failure_count -ge $MAX_FAILURES ]; then
            restart_network
            failure_count=0
        fi
    fi

    sleep $CHECK_INTERVAL
done
```

### Systemd Service for Network Watchdog

```bash
# /etc/systemd/system/network-watchdog.service
[Unit]
Description=Network Connection Watchdog
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/network-watchdog.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
sudo chmod +x /usr/local/bin/network-watchdog.sh
sudo systemctl enable network-watchdog.service
sudo systemctl start network-watchdog.service
```

### Browser Offline Detection and Auto-Reload (JavaScript)

```javascript
// offline-handler.js - Inject into kiosk page or use as extension

(function() {
    let retryInterval = null;
    const RETRY_DELAY = 10000; // 10 seconds

    function showOfflineMessage() {
        const overlay = document.createElement('div');
        overlay.id = 'offline-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;' +
            'background:rgba(0,0,0,0.9);color:white;display:flex;' +
            'align-items:center;justify-content:center;font-family:sans-serif;' +
            'font-size:24px;z-index:99999;';

        const message = document.createElement('div');
        message.style.textAlign = 'center';

        const title = document.createElement('div');
        title.textContent = 'Connection Lost';

        const subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size:16px;margin-top:10px;';
        subtitle.textContent = 'Reconnecting...';

        message.appendChild(title);
        message.appendChild(subtitle);
        overlay.appendChild(message);
        document.body.appendChild(overlay);
    }

    function hideOfflineMessage() {
        const overlay = document.getElementById('offline-overlay');
        if (overlay) overlay.remove();
    }

    function attemptReconnect() {
        fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
            .then(() => {
                clearInterval(retryInterval);
                hideOfflineMessage();
                window.location.reload();
            })
            .catch(() => {
                // Still offline, will retry
            });
    }

    window.addEventListener('offline', () => {
        showOfflineMessage();
        retryInterval = setInterval(attemptReconnect, RETRY_DELAY);
    });

    window.addEventListener('online', () => {
        clearInterval(retryInterval);
        hideOfflineMessage();
        window.location.reload();
    });
})();
```

---

## 7. Auto-Update Mechanisms for Display URL

### Method 1: Configuration File Approach

```bash
# /usr/local/bin/kiosk-url-manager.sh
#!/bin/bash

CONFIG_FILE="/etc/kiosk/config"
DEFAULT_URL="https://default-kiosk-url.com"

# Ensure config directory exists
sudo mkdir -p /etc/kiosk

# Get URL from config or use default
get_kiosk_url() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
        echo "${KIOSK_URL:-$DEFAULT_URL}"
    else
        echo "$DEFAULT_URL"
    fi
}

# Set new URL
set_kiosk_url() {
    local new_url="$1"
    echo "KIOSK_URL=\"$new_url\"" | sudo tee "$CONFIG_FILE"

    # Restart browser service
    systemctl --user restart chromium-kiosk.service
}

case "$1" in
    get)
        get_kiosk_url
        ;;
    set)
        set_kiosk_url "$2"
        ;;
    *)
        echo "Usage: $0 {get|set <url>}"
        exit 1
        ;;
esac
```

### Method 2: Remote Configuration Server

```bash
# /usr/local/bin/kiosk-config-sync.sh
#!/bin/bash

CONFIG_SERVER="https://your-server.com/kiosk-config"
DEVICE_ID=$(cat /etc/machine-id)
CONFIG_FILE="/etc/kiosk/config"
CHECK_INTERVAL=300  # 5 minutes

sync_config() {
    # Fetch configuration from server
    response=$(curl -s -f "$CONFIG_SERVER/$DEVICE_ID" 2>/dev/null)

    if [ $? -eq 0 ] && [ -n "$response" ]; then
        new_url=$(echo "$response" | jq -r '.url // empty')

        if [ -n "$new_url" ]; then
            current_url=$(grep KIOSK_URL "$CONFIG_FILE" 2>/dev/null | cut -d'"' -f2)

            if [ "$new_url" != "$current_url" ]; then
                echo "$(date): Updating URL to $new_url" >> /var/log/kiosk-config.log
                echo "KIOSK_URL=\"$new_url\"" | sudo tee "$CONFIG_FILE"

                # Restart browser
                systemctl --user restart chromium-kiosk.service
            fi
        fi
    fi
}

while true; do
    sync_config
    sleep $CHECK_INTERVAL
done
```

### Method 3: Systemd Path Watcher

```bash
# /etc/systemd/system/kiosk-config-watcher.service
[Unit]
Description=Kiosk Config File Watcher
After=graphical-session.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/reload-kiosk.sh

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/systemd/system/kiosk-config-watcher.path
[Unit]
Description=Watch for Kiosk Config Changes

[Path]
PathModified=/etc/kiosk/config
Unit=kiosk-config-watcher.service

[Install]
WantedBy=multi-user.target
```

```bash
# /usr/local/bin/reload-kiosk.sh
#!/bin/bash

# Wait briefly for file write to complete
sleep 2

# Restart the kiosk browser
systemctl --user restart chromium-kiosk.service

echo "$(date): Kiosk reloaded due to config change" >> /var/log/kiosk.log
```

```bash
sudo systemctl enable kiosk-config-watcher.path
sudo systemctl start kiosk-config-watcher.path
```

### Method 4: HTTP API for Remote Control

```python
#!/usr/bin/env python3
# /usr/local/bin/kiosk-api-server.py

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess
import os

CONFIG_FILE = "/etc/kiosk/config"
API_PORT = 8080

class KioskAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/status":
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            url = self.get_current_url()
            response = {"status": "running", "url": url}
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/url":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())

            new_url = data.get('url')
            if new_url:
                self.set_url(new_url)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            else:
                self.send_response(400)
                self.end_headers()

        elif self.path == "/refresh":
            subprocess.run(['systemctl', '--user', 'restart', 'chromium-kiosk.service'])
            self.send_response(200)
            self.end_headers()

        elif self.path == "/reboot":
            self.send_response(200)
            self.end_headers()
            subprocess.run(['sudo', 'reboot'])

        else:
            self.send_response(404)
            self.end_headers()

    def get_current_url(self):
        try:
            with open(CONFIG_FILE, 'r') as f:
                for line in f:
                    if line.startswith('KIOSK_URL='):
                        return line.split('=')[1].strip().strip('"')
        except FileNotFoundError:
            pass
        return ""

    def set_url(self, url):
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            f.write(f'KIOSK_URL="{url}"\n')
        subprocess.run(['systemctl', '--user', 'restart', 'chromium-kiosk.service'])

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', API_PORT), KioskAPIHandler)
    print(f"Kiosk API server running on port {API_PORT}")
    server.serve_forever()
```

```bash
# Usage examples:
# Get status
curl http://kiosk-pi:8080/status

# Set new URL
curl -X POST -H "Content-Type: application/json" \
    -d '{"url":"https://new-url.com"}' \
    http://kiosk-pi:8080/url

# Force refresh
curl -X POST http://kiosk-pi:8080/refresh

# Reboot device
curl -X POST http://kiosk-pi:8080/reboot
```

---

## Complete Setup Script

```bash
#!/bin/bash
# /usr/local/bin/setup-kiosk.sh
# Complete kiosk setup script

set -e

KIOSK_URL="${1:-https://example.com}"
KIOSK_USER="${2:-pi}"

echo "Setting up Raspberry Pi Kiosk..."
echo "URL: $KIOSK_URL"
echo "User: $KIOSK_USER"

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt-get install -y \
    xserver-xorg \
    x11-xserver-utils \
    xinit \
    openbox \
    chromium-browser \
    unclutter \
    jq \
    python3

# Create directories
sudo mkdir -p /etc/kiosk
sudo mkdir -p /usr/local/bin

# Set kiosk URL
echo "KIOSK_URL=\"$KIOSK_URL\"" | sudo tee /etc/kiosk/config

# Create kiosk browser script
cat << 'SCRIPT' | sudo tee /usr/local/bin/kiosk-browser.sh
#!/bin/bash
source /etc/kiosk/config
KIOSK_URL="${KIOSK_URL:-https://example.com}"

# Fix crash flags
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State' 2>/dev/null
sed -i 's/"exit_type":"[^"]*"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --no-first-run \
    --incognito \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --password-store=basic \
    --disk-cache-dir=/dev/null \
    "$KIOSK_URL"
SCRIPT
sudo chmod +x /usr/local/bin/kiosk-browser.sh

# Create openbox autostart
cat << 'AUTOSTART' | sudo tee /etc/xdg/openbox/autostart
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &
/usr/local/bin/kiosk-browser.sh &
AUTOSTART

# Configure auto-login
sudo raspi-config nonint do_boot_behaviour B2

# Add X auto-start to bash profile
echo '[[ -z $DISPLAY && $XDG_VTNR -eq 1 ]] && startx -- -nocursor' >> /home/$KIOSK_USER/.bash_profile

# Set session manager
sudo update-alternatives --set x-session-manager /usr/bin/openbox-session

# Configure hardware watchdog
sudo sed -i 's/#RuntimeWatchdogSec=.*/RuntimeWatchdogSec=10s/' /etc/systemd/system.conf
sudo sed -i 's/#ShutdownWatchdogSec=.*/ShutdownWatchdogSec=10min/' /etc/systemd/system.conf

# Add weekly reboot cron job
(crontab -l 2>/dev/null; echo "0 4 * * 0 /sbin/shutdown -r now") | crontab -

echo "Kiosk setup complete. Reboot to start."
echo "Run: sudo reboot"
```

---

## Sources

- [Raspberry Pi Official Kiosk Tutorial](https://www.raspberrypi.com/tutorials/how-to-use-a-raspberry-pi-in-kiosk-mode/)
- [Chromium Kiosk Mode Gist (2025)](https://gist.github.com/lellky/673d84260dfa26fa9b57287e0f67d09e)
- [Raspberry Pi Forums - Kiosk Mode with Bookworm](https://forums.raspberrypi.com/viewtopic.php?t=389880)
- [Automated RPi Web Kiosk Setup in 2025](https://benswift.me/blog/2025/07/16/automated-rpi-web-kiosk-setup-in-2025)
- [TOLDOTECHNIK Raspberry Pi Kiosk Display System](https://github.com/TOLDOTECHNIK/Raspberry-Pi-Kiosk-Display-System)
- [Reelyactive Pi Kiosk Guide](https://reelyactive.github.io/diy/pi-kiosk/)
- [Keeping Your Raspberry Pi Online with Watchdogs](https://dri.es/keeping-your-raspberry-pi-online-with-watchdogs)
- [Jeff Geerling - nmcli for WiFi on Bookworm](https://www.jeffgeerling.com/blog/2023/nmcli-wifi-on-raspberry-pi-os-12-bookworm)
- [Pi My Life Up - Raspberry Pi Kiosk](https://pimylifeup.com/raspberry-pi-kiosk/)
- [Raspberry Pi Forums - DPMS Configuration](https://tech.tpedersen.net/raspberry-pi/pi-in-the-sky/putting-raspberry-pi-monitor-to-sleep-dpms)
- [Display Module - LCD Burn-in Prevention](https://www.displaymodule.com/blogs/knowledge/how-to-prevent-lcd-screen-burn-in-static-duration-brightness-control-regular-switching)
- [Panox Display - OLED Burn-in Prevention](https://www.panoxdisplay.com/knowledge/oled-burn-in-prevention.html)
