
const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const ByteArray = imports.byteArray;

const PROFILE_PATH = "/sys/firmware/acpi/platform_profile";
const CHOICES_PATH = "/sys/firmware/acpi/platform_profile_choices";
const HELPER = "/usr/local/sbin/loq-power-profile";

const PROFILES = {
    "low-power": {
        label: "🔋 Low Power",
        short: "LOW",
        icon: "battery-good-symbolic"
    },
    "balanced": {
        label: "⚖️ Balanced",
        short: "BAL",
        icon: "power-profile-balanced-symbolic"
    },
    "performance": {
        label: "🚀 Performance",
        short: "PERF",
        icon: "power-profile-performance-symbolic"
    }
};

class LoqPowerApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);

        this._destroyed = false;
        this._switching = false;
        this._timer = null;
        this._items = {};
        this._profiles = [];

        this.set_applet_tooltip("LOQ Power Mode");

        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this._menuManager.addMenu(this.menu);

        this._buildMenu();
        this._refresh();

        this._timer = Mainloop.timeout_add_seconds(3, () => {
            if (this._destroyed) return false;
            this._refresh();
            return true;
        });
    }

    // Liest eine Systemdatei und entfernt Leerzeichen.
    _readFile(path) {
        try {
            const [ok, contents] = GLib.file_get_contents(path);
            return ok ? ByteArray.toString(contents).trim() : null;
        } catch (e) {
            global.logError(e);
            return null;
        }
    }

    // Ermittelt die tatsächlich verfügbaren Firmwareprofile.
    _getAvailableProfiles() {
        const contents = this._readFile(CHOICES_PATH);
        if (!contents) return [];

        return contents.split(/\s+/).filter(p => p.length > 0);
    }

    _buildMenu() {
        this.menu.removeAll();
        this._items = {};
        const available = this._getAvailableProfiles();
        this._profiles = ["low-power", "balanced", "performance"].filter(profile => available.includes(profile));

        for (const profile of this._profiles) {
            const info = PROFILES[profile] || {
                label: profile,
                short: profile.toUpperCase(),
                icon: "system-run-symbolic"
            };

            const item = new PopupMenu.PopupMenuItem(info.label);

            item.connect("activate", () => {
                this._setProfile(profile);
            });

            this.menu.addMenuItem(item);
            this._items[profile] = item;
        }

        this.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );

        this._statusItem = new PopupMenu.PopupMenuItem(
            "Current: unknown",
            { reactive: false }
        );
        this.menu.addMenuItem(this._statusItem);

        this._errorItem = new PopupMenu.PopupMenuItem(
            "",
            { reactive: false }
        );
        this._errorItem.actor.hide();
        this.menu.addMenuItem(this._errorItem);
    }

    _showError(message) {
        global.log(`LOQ Power Applet: ${message}`);
        this._errorItem.label.set_text(message);
        this._errorItem.actor.show();
    }

    _clearError() {
        this._errorItem.label.set_text("");
        this._errorItem.actor.hide();
    }

    // Startet den privilegierten Helper asynchron.
    _setProfile(profile) {
        if (this._switching || this._destroyed) return;
        if (!this._profiles.includes(profile)) return;

        this._switching = true;
        this._clearError();
        this._statusItem.label.set_text(`Switching to ${profile}...`);

        const launcher = new Gio.SubprocessLauncher({
            flags: Gio.SubprocessFlags.STDOUT_PIPE |
                   Gio.SubprocessFlags.STDERR_PIPE
        });

        let process;

        try {
            process = launcher.spawnv([
                "sudo", "-n", HELPER, profile
            ]);
        } catch (e) {
            this._switching = false;
            this._showError(`Start failed: ${e.message}`);
            this._refresh();
            return;
        }

        process.communicate_utf8_async(null, null, (proc, result) => {
            let error = null;

            try {
                const [, stdout, stderr] =
                    proc.communicate_utf8_finish(result);

                if (!proc.get_successful()) {
                    error = stderr.trim() ||
                            stdout.trim() ||
                            "Profile switch failed";
                }
            } catch (e) {
                error = e.message;
            }

            if (this._destroyed) return;

            this._switching = false;
            this._refresh();

            if (error) {
                this._showError(error);
            } else {
                const current = this._readFile(PROFILE_PATH);

                if (current !== profile) {
                    this._showError(
                        `Requested ${profile}, active: ${current || "unknown"}`
                    );
                }
            }
        });
    }

    _refresh() {
        if (this._destroyed) return;

        const profile = this._readFile(PROFILE_PATH);
        const info = PROFILES[profile] || {
            short: profile ? profile.toUpperCase() : "?",
            icon: "system-run-symbolic"
        };

        this.set_applet_icon_symbolic_name(info.icon);
        this.set_applet_label(` ${info.short}`);
        this.set_applet_tooltip(
            `LOQ Power Mode: ${profile || "unknown"}`
        );

        if (!this._switching) {
            this._statusItem.label.set_text(
                `Current: ${profile || "unknown"}`
            );
        }

        for (const [key, item] of Object.entries(this._items)) {
            const label = PROFILES[key]?.label || key;
            const prefix = key === profile ? "✓ " : "   ";

            item.label.set_text(prefix + label);
            item.setSensitive(!this._switching && key !== profile);
        }
    }

    on_applet_clicked() {
        this._refresh();
        this.menu.toggle();
    }

    on_applet_removed_from_panel() {
        this._destroyed = true;

        if (this._timer !== null) {
            Mainloop.source_remove(this._timer);
            this._timer = null;
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new LoqPowerApplet(
        metadata, orientation, panelHeight, instanceId
    );
}

