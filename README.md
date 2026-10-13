# Lenovo LOQ Power Profile Applet

A lightweight Cinnamon panel applet for switching power profiles on Lenovo LOQ laptops running Linux Mint.

## Features

- Quick switching between three power profiles:
  - 🔋 **Low Power** – Energy saving
  - ⚖️ **Balanced** – Everyday usage
  - 🚀 **Performance** – Gaming and demanding applications
- Displays the currently active profile in the panel
- Automatically refreshes every 3 seconds
- Uses the Linux ACPI platform profile interface
- No password required when switching profiles after setup

## Requirements

- Linux Mint with Cinnamon Desktop
- Lenovo laptop supporting ACPI platform profiles
- `sudo` privileges for initial setup

## Installation

### 1. Install the applet

Copy the applet files into:

`~/.local/share/cinnamon/applets/loq-power@local/`

The directory should contain:

- `applet.js`
- `metadata.json`

Add the applet through **System Settings → Applets**.

### 2. Install the helper script

Copy `loq-power-profile` to `/usr/local/sbin/`:

```bash
sudo install -o root -g root -m 755 loq-power-profile /usr/local/sbin/loq-power-profile
```

### 3. Configure sudo permissions

Run:

```bash
sudo visudo -f /etc/sudoers.d/loq-power-profile
```

Add the following line, replacing `YOUR_USERNAME` with your Linux username:

```text
YOUR_USERNAME ALL=(root) NOPASSWD: /usr/local/sbin/loq-power-profile
```

Save and verify:

```bash
sudo visudo -c
```

### 4. Test

```bash
sudo -n /usr/local/sbin/loq-power-profile performance
```

The applet should now switch profiles without requesting a password.

## Compatibility

Developed and tested on a **Lenovo LOQ 15IRX9 with Linux Mint Cinnamon**.

Other Lenovo models may work if they expose the required ACPI platform profile interface.

Check supported profiles using:

```bash
cat /sys/firmware/acpi/platform_profile_choices
```

## Security

The helper script runs with root privileges. It must remain owned by root and must not be writable by regular users.

The sudoers rule grants passwordless execution of this specific helper. Only install scripts from trusted sources.

## Disclaimer

Power profile behavior depends on the laptop firmware and Linux kernel. Profile names do not necessarily correspond to identical performance characteristics across devices.

Use at your own risk.

## License

MIT License
