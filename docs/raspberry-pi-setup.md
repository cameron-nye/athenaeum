# Raspberry Pi Display Setup Guide

This guide walks you through setting up a Raspberry Pi as a dedicated wall-mounted calendar display.

## Requirements

### Hardware

- **Raspberry Pi 4** (recommended) or Raspberry Pi 3B+
- MicroSD card (16GB or larger)
- HDMI cable
- TV/Monitor (1920x1080 resolution works best)
- Power supply (official Pi power supply recommended)
- (Optional) Case with passive cooling

### Software

- Raspberry Pi OS (Lite or Desktop)
- Chromium browser (installed by setup script)

## Quick Setup

### 1. Prepare the Pi

1. Download and install [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Flash Raspberry Pi OS to your SD card
3. Enable SSH and configure WiFi during imaging
4. Boot the Pi and connect via SSH or directly with keyboard/monitor

### 2. Register the Display

1. Log into your Athenaeum dashboard
2. Go to **Settings > Displays**
3. Click **Add Display** and give it a name (e.g., "Kitchen Display")
4. Copy the **Setup URL** shown after creation

### 3. Run the Setup Script

```bash
# Download the setup script
curl -O https://raw.githubusercontent.com/your-repo/athenaeum/main/scripts/pi-setup.sh
chmod +x pi-setup.sh

# Run with your display URL
sudo ./pi-setup.sh "https://your-domain.com/setup?token=YOUR_TOKEN"
```

The script will:

- Install required packages (Chromium, unclutter, xdotool)
- Disable screen blanking
- Configure auto-login and kiosk mode
- Set up watchdog for crash recovery
- Schedule daily reboot for memory management

### 4. Reboot

```bash
sudo reboot
```

The Pi will automatically start in kiosk mode displaying your calendar.

## Manual Setup (Alternative)

If you prefer manual configuration:

### Install Packages

```bash
sudo apt update
sudo apt install -y chromium-browser unclutter xdotool
```

### Disable Screen Blanking

Create `/etc/X11/xorg.conf.d/10-blanking.conf`:

```
Section "ServerFlags"
    Option "BlankTime" "0"
    Option "StandbyTime" "0"
    Option "SuspendTime" "0"
    Option "OffTime" "0"
EndSection
```

### Create Kiosk Script

Create `~/kiosk.sh`:

```bash
#!/bin/bash
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &

chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --no-first-run \
    "YOUR_DISPLAY_URL"
```

Make executable:

```bash
chmod +x ~/kiosk.sh
```

### Configure Autostart

Add to `~/.config/autostart/kiosk.desktop`:

```
[Desktop Entry]
Type=Application
Name=Athenaeum Display
Exec=/home/pi/kiosk.sh
```

## Troubleshooting

### Display shows black screen

1. Check if Chromium is running: `pgrep chromium`
2. Try restarting manually: `pkill chromium && ~/kiosk.sh`
3. Check logs: `cat /var/log/kiosk-watchdog.log`

### Display shows "Invalid token" error

1. The setup token may have been regenerated
2. Go to dashboard > Settings > Displays
3. Copy the new Setup URL
4. Run setup script again with new URL

### Screen keeps turning off

1. Verify xorg blanking config exists
2. Run: `xset q` to check DPMS settings
3. Manually disable: `xset -dpms`

### Chromium crashes frequently

1. Check memory usage: `free -h`
2. The watchdog should auto-restart
3. Manual restart: `sudo reboot`

### WiFi disconnects

1. Edit `/etc/wpa_supplicant/wpa_supplicant.conf`
2. Ensure correct SSID and password
3. Consider using Ethernet for reliability

## Maintenance

### Viewing Logs

```bash
# Watchdog logs
cat /var/log/kiosk-watchdog.log

# System logs
journalctl -b
```

### Manual Updates

```bash
# Stop the display
pkill chromium

# Update system
sudo apt update && sudo apt upgrade -y

# Reboot to restart display
sudo reboot
```

### Changing Display Settings

Changes made in the Athenaeum dashboard (theme, layout, etc.) are applied automatically to the display without needing to touch the Pi.

## Advanced Configuration

### Custom Resolution

Edit `/boot/config.txt`:

```
hdmi_group=2
hdmi_mode=82  # 1920x1080 @ 60Hz
```

### Vertical Display (Portrait Mode)

Add to `/boot/config.txt`:

```
display_rotate=1  # 90 degrees clockwise
```

### Multiple Displays

1. Register each display in the dashboard
2. Each gets its own Setup URL
3. Run setup script on each Pi with its specific URL

## Security Notes

- The display token should be kept secret
- If compromised, regenerate the token in dashboard settings
- The Pi should be on a trusted network
- Consider network segmentation for IoT devices
