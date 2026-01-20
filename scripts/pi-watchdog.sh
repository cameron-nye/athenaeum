#!/bin/bash
#
# Athenaeum Display - Watchdog Script
# REQ-3-015: Crash recovery for kiosk display
#
# This script checks if Chromium is running and responsive,
# and restarts it if necessary. Should be run via cron every 5 minutes.
#
# Crontab entry: */5 * * * * /home/pi/pi-watchdog.sh
#

LOG_FILE="/var/log/kiosk-watchdog.log"
KIOSK_SCRIPT="/home/pi/kiosk.sh"
MAX_LOG_SIZE=1048576  # 1MB

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "${LOG_FILE}.old"
fi

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" >> "$LOG_FILE"
}

# Function to restart kiosk
restart_kiosk() {
    log_message "Restarting kiosk..."

    # Kill any existing Chromium processes
    pkill -9 chromium-browse 2>/dev/null || true
    pkill -9 chromium 2>/dev/null || true

    # Wait for processes to die
    sleep 2

    # Restart kiosk
    if [ -x "$KIOSK_SCRIPT" ]; then
        DISPLAY=:0 "$KIOSK_SCRIPT" &
        log_message "Kiosk script started"
    else
        log_message "ERROR: Kiosk script not found or not executable: $KIOSK_SCRIPT"
    fi
}

# Check 1: Is Chromium running at all?
if ! pgrep -x "chromium-browse" > /dev/null 2>&1; then
    log_message "Chromium not running"
    restart_kiosk
    exit 0
fi

# Check 2: Can we find a Chromium window? (indicates responsiveness)
CHROMIUM_WINDOW=$(DISPLAY=:0 xdotool search --name "Chromium" 2>/dev/null | head -1)

if [ -z "$CHROMIUM_WINDOW" ]; then
    log_message "Cannot find Chromium window (may be frozen)"
    restart_kiosk
    exit 0
fi

# Check 3: Check memory usage (restart if Chromium uses too much)
CHROMIUM_PID=$(pgrep -x "chromium-browse" | head -1)
if [ -n "$CHROMIUM_PID" ]; then
    # Get memory usage in KB
    MEM_KB=$(ps -o rss= -p "$CHROMIUM_PID" 2>/dev/null | tr -d ' ')

    # If using more than 1.5GB RAM, restart
    if [ -n "$MEM_KB" ] && [ "$MEM_KB" -gt 1572864 ]; then
        log_message "Chromium memory usage too high: ${MEM_KB}KB - restarting"
        restart_kiosk
        exit 0
    fi
fi

# All checks passed
# log_message "Watchdog check passed"  # Uncomment for verbose logging
exit 0
