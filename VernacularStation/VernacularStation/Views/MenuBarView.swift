import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    @Environment(\.openURL) private var openURL

    private var lastSyncAgo: String {
        guard let last = syncEngine.lastSyncAt else { return "Never" }
        let interval = Date().timeIntervalSince(last)
        if interval < 5 { return "Just now" }
        if interval < 60 { return "\(Int(interval))s ago" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        return "\(Int(interval / 3600))h ago"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 8) {
                Circle()
                    .fill(syncEngine.statusColor)
                    .frame(width: 10, height: 10)
                Text("\(syncEngine.stationName) -- \(syncEngine.status.displayName)")
                    .font(.headline)
                Spacer()
            }
            .padding(.horizontal)
            .padding(.top, 8)

            Divider()

            // Stats
            VStack(alignment: .leading, spacing: 4) {
                statRow(label: "Last sync", value: lastSyncAgo)
                statRow(label: "Messages today", value: "\(syncEngine.inboundCount) in / \(syncEngine.outboundCount) out")
                statRow(label: "Queue depth", value: "\(syncEngine.queueDepth)")
            }
            .padding(.horizontal)
            .font(.system(.body, design: .monospaced))

            Divider()

            // Actions
            VStack(spacing: 2) {
                Button(action: {
                    if syncEngine.isRunning {
                        syncEngine.stopSync()
                    } else {
                        syncEngine.startSync()
                    }
                }) {
                    Label(
                        syncEngine.isRunning ? "Stop Sync" : "Start Sync",
                        systemImage: syncEngine.isRunning ? "stop.circle.fill" : "play.circle.fill"
                    )
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)
                .padding(.vertical, 4)

                Button(action: {
                    openURL(URL(string: "https://vernacular.chat")!)
                }) {
                    Label("Open Dashboard", systemImage: "globe")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)
                .padding(.vertical, 4)

                Button(action: {
                    NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                    // Fallback: just activate the app to show main window
                    NSApp.activate(ignoringOtherApps: true)
                    for window in NSApp.windows where window.title.contains("Vernacular") {
                        window.makeKeyAndOrderFront(nil)
                    }
                }) {
                    Label("Settings...", systemImage: "gearshape")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)
                .padding(.vertical, 4)
            }

            Divider()

            Button(action: {
                NSApplication.shared.terminate(nil)
            }) {
                Label("Quit Vernacular Station", systemImage: "power")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
            .padding(.vertical, 4)
            .padding(.bottom, 8)
        }
        .frame(width: 280)
    }

    private func statRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(.secondary)
                .font(.caption)
            Spacer()
            Text(value)
                .font(.caption)
        }
    }
}
