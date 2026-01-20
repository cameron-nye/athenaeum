#!/bin/bash
#
# Athenaeum Display - Raspberry Pi Kiosk Setup Script
# REQ-3-014: Kiosk configuration for wall-mounted displays
#
# This script configures a Raspberry Pi to run as a dedicated display kiosk.
# Run as: sudo ./pi-setup.sh <display-url>
#
# Example: sudo ./pi-setup.sh "https://your-domain.com/setup?token=abc123"
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Athenaeum Display - Kiosk Setup      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check for root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root (sudo)${NC}"
   exit 1
fi

# Check for display URL argument
if [ -z "$1" ]; then
    echo -e "${RED}Usage: sudo ./pi-setup.sh <display-url>${NC}"
    echo ""
    echo "Example: sudo ./pi-setup.sh \"https://your-domain.com/setup?token=abc123\""
    exit 1
fi

DISPLAY_URL="$1"
KIOSK_USER="${SUDO_USER:-pi}"
KIOSK_HOME="/home/$KIOSK_USER"

echo -e "${YELLOW}Installing as user: $KIOSK_USER${NC}"
echo -e "${YELLOW}Display URL: $DISPLAY_URL${NC}"
echo ""

# Update system
echo -e "${GREEN}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${GREEN}Installing required packages...${NC}"
apt-get install -y \
    chromium-browser \
    unclutter \
    xdotool \
    xserver-xorg \
    x11-xserver-utils \
    xinit

# Disable screen blanking and DPMS
echo -e "${GREEN}Disabling screen blanking...${NC}"
mkdir -p /etc/X11/xorg.conf.d
cat > /etc/X11/xorg.conf.d/10-blanking.conf << 'XCONFIG'
Section "ServerFlags"
    Option "BlankTime" "0"
    Option "StandbyTime" "0"
    Option "SuspendTime" "0"
    Option "OffTime" "0"
EndSection
XCONFIG

# Create kiosk startup script
echo -e "${GREEN}Creating kiosk launcher script...${NC}"
cat > "$KIOSK_HOME/kiosk.sh" << KIOSKSCRIPT
#!/bin/bash
# Athenaeum Display Kiosk Launcher

# Disable screen saver
xset s off
xset s noblank
xset -dpms

# Hide cursor after 0.5 seconds of inactivity
unclutter -idle 0.5 -root &

# Wait for network
sleep 5

# Launch Chromium in kiosk mode
chromium-browser \\
    --kiosk \\
    --noerrdialogs \\
    --disable-infobars \\
    --disable-session-crashed-bubble \\
    --disable-restore-session-state \\
    --disable-translate \\
    --no-first-run \\
    --fast \\
    --fast-start \\
    --disable-features=TranslateUI \\
    --disk-cache-dir=/dev/null \\
    --overscroll-history-navigation=0 \\
    --disable-pinch \\
    --check-for-update-interval=604800 \\
    "$DISPLAY_URL"
KIOSKSCRIPT

chmod +x "$KIOSK_HOME/kiosk.sh"
chown "$KIOSK_USER:$KIOSK_USER" "$KIOSK_HOME/kiosk.sh"

# Create autostart directory and desktop file
echo -e "${GREEN}Configuring autostart...${NC}"
mkdir -p "$KIOSK_HOME/.config/autostart"
cat > "$KIOSK_HOME/.config/autostart/kiosk.desktop" << AUTOSTART
[Desktop Entry]
Type=Application
Name=Athenaeum Display
Exec=$KIOSK_HOME/kiosk.sh
X-GNOME-Autostart-enabled=true
AUTOSTART

chown -R "$KIOSK_USER:$KIOSK_USER" "$KIOSK_HOME/.config"

# Create watchdog script
echo -e "${GREEN}Creating watchdog script...${NC}"
cat > "$KIOSK_HOME/kiosk-watchdog.sh" << 'WATCHDOG'
#!/bin/bash
# Athenaeum Display Watchdog
# Restarts Chromium if it becomes unresponsive

LOG_FILE="/var/log/kiosk-watchdog.log"

# Check if Chromium is running
if ! pgrep -x "chromium-browse" > /dev/null; then
    echo "$(date): Chromium not running, restarting..." >> "$LOG_FILE"
    # Kill any zombie processes
    pkill -9 chromium || true
    # Start fresh
    DISPLAY=:0 /home/pi/kiosk.sh &
fi

# Check if Chromium is responsive (using xdotool)
if pgrep -x "chromium-browse" > /dev/null; then
    # Try to get window info - if this fails, Chromium is frozen
    if ! DISPLAY=:0 xdotool search --name "Chromium" 2>/dev/null | head -1; then
        echo "$(date): Chromium appears frozen, restarting..." >> "$LOG_FILE"
        pkill -9 chromium || true
        sleep 2
        DISPLAY=:0 /home/pi/kiosk.sh &
    fi
fi
WATCHDOG

chmod +x "$KIOSK_HOME/kiosk-watchdog.sh"
chown "$KIOSK_USER:$KIOSK_USER" "$KIOSK_HOME/kiosk-watchdog.sh"

# Setup cron jobs
echo -e "${GREEN}Setting up cron jobs...${NC}"

# Create cron entries
CRON_FILE="/tmp/kiosk_cron"
cat > "$CRON_FILE" << 'CRONTAB'
# Athenaeum Display Cron Jobs

# Watchdog - check every 5 minutes
*/5 * * * * /home/pi/kiosk-watchdog.sh

# Daily restart at 3:30 AM for memory management
30 3 * * * /sbin/reboot
CRONTAB

# Install cron for the user
crontab -u "$KIOSK_USER" "$CRON_FILE"
rm "$CRON_FILE"

# Enable auto-login for the display user
echo -e "${GREEN}Enabling auto-login...${NC}"
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << AUTOLOGIN
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KIOSK_USER --noclear %I \$TERM
AUTOLOGIN

# Configure bash profile to start X
echo -e "${GREEN}Configuring auto-start X...${NC}"
if ! grep -q "startx" "$KIOSK_HOME/.bash_profile" 2>/dev/null; then
    cat >> "$KIOSK_HOME/.bash_profile" << 'BASHPROFILE'

# Start X on login (for kiosk mode)
if [[ -z $DISPLAY ]] && [[ $(tty) = /dev/tty1 ]]; then
    startx
fi
BASHPROFILE
    chown "$KIOSK_USER:$KIOSK_USER" "$KIOSK_HOME/.bash_profile"
fi

# Create .xinitrc to run kiosk
echo -e "${GREEN}Creating .xinitrc...${NC}"
cat > "$KIOSK_HOME/.xinitrc" << 'XINITRC'
#!/bin/sh
exec /home/pi/kiosk.sh
XINITRC
chmod +x "$KIOSK_HOME/.xinitrc"
chown "$KIOSK_USER:$KIOSK_USER" "$KIOSK_HOME/.xinitrc"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!                      ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "The following has been configured:"
echo -e "  - Chromium browser in kiosk mode"
echo -e "  - Cursor auto-hide (unclutter)"
echo -e "  - Screen blanking disabled"
echo -e "  - Auto-login enabled"
echo -e "  - Autostart on boot"
echo -e "  - Watchdog script (checks every 5 minutes)"
echo -e "  - Daily reboot at 3:30 AM"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Reboot the Pi: sudo reboot"
echo -e "  2. The display should automatically open to: $DISPLAY_URL"
echo -e "  3. If the URL has a setup token, the display will be paired"
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo -e "  - Logs: /var/log/kiosk-watchdog.log"
echo -e "  - Manual start: ~/kiosk.sh"
echo -e "  - Kill browser: pkill chromium"
echo ""
