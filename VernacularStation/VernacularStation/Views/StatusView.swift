import SwiftUI

struct StatusView: View {
    @EnvironmentObject var syncEngine: SyncEngine

    private var uptimeString: String {
        let total = Int(syncEngine.uptime)
        if total == 0 { return "--" }
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else if minutes > 0 {
            return "\(minutes)m \(seconds)s"
        }
        return "\(seconds)s"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Status Header
                statusHeader

                // Metric Cards
                metricsGrid

                // Activity Log
                activityLogSection
            }
            .padding(24)
        }
    }

    // MARK: - Status Header

    private var statusHeader: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(syncEngine.statusColor.opacity(0.2))
                    .frame(width: 60, height: 60)

                Circle()
                    .fill(syncEngine.statusColor)
                    .frame(width: 24, height: 24)
                    .overlay {
                        if syncEngine.isRunning && syncEngine.errors.isEmpty {
                            Circle()
                                .stroke(syncEngine.statusColor.opacity(0.5), lineWidth: 2)
                                .frame(width: 36, height: 36)
                                .scaleEffect(syncEngine.isRunning ? 1.3 : 1.0)
                                .opacity(syncEngine.isRunning ? 0 : 1)
                                .animation(
                                    .easeInOut(duration: 1.5).repeatForever(autoreverses: false),
                                    value: syncEngine.isRunning
                                )
                        }
                    }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(syncEngine.stationName.isEmpty ? "Unconfigured" : syncEngine.stationName)
                    .font(.title)
                    .fontWeight(.semibold)

                if !syncEngine.stationPhone.isEmpty {
                    Text(syncEngine.stationPhone)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Text(syncEngine.status.displayName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(syncEngine.statusColor.opacity(0.15))
                    .foregroundStyle(syncEngine.statusColor)
                    .clipShape(Capsule())
            }

            Spacer()

            // Start / Stop button
            Button(action: {
                if syncEngine.isRunning {
                    syncEngine.stopSync()
                } else {
                    syncEngine.startSync()
                }
            }) {
                Label(
                    syncEngine.isRunning ? "Stop" : "Start",
                    systemImage: syncEngine.isRunning ? "stop.fill" : "play.fill"
                )
                .font(.headline)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(syncEngine.isRunning ? .red : .green)
        }
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Metrics Grid

    private var metricsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            MetricCard(
                title: "Inbound Today",
                value: "\(syncEngine.inboundCount)",
                icon: "arrow.down.circle.fill",
                color: .blue
            )
            MetricCard(
                title: "Outbound Today",
                value: "\(syncEngine.outboundCount)",
                icon: "arrow.up.circle.fill",
                color: .green
            )
            MetricCard(
                title: "Queue Depth",
                value: "\(syncEngine.queueDepth)",
                icon: "tray.full.fill",
                color: syncEngine.queueDepth > 0 ? .orange : .gray
            )
            MetricCard(
                title: "Uptime",
                value: uptimeString,
                icon: "clock.fill",
                color: .purple
            )
        }
    }

    // MARK: - Activity Log

    private var activityLogSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Recent Activity")
                    .font(.headline)
                Spacer()
                Text("\(syncEngine.activityLog.count) events")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if syncEngine.activityLog.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "text.below.photo")
                        .font(.title)
                        .foregroundStyle(.quaternary)
                    Text("No activity yet. Start the sync engine to begin.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
            } else {
                VStack(spacing: 0) {
                    ForEach(syncEngine.activityLog.prefix(10)) { entry in
                        HStack(spacing: 8) {
                            Circle()
                                .fill(logColor(entry.type))
                                .frame(width: 6, height: 6)

                            Text(entry.timestamp, style: .time)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(.secondary)
                                .frame(width: 70, alignment: .leading)

                            Text(entry.message)
                                .font(.caption)
                                .lineLimit(1)

                            Spacer()
                        }
                        .padding(.vertical, 6)
                        .padding(.horizontal, 12)

                        if entry.id != syncEngine.activityLog.prefix(10).last?.id {
                            Divider()
                                .padding(.leading, 26)
                        }
                    }
                }
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func logColor(_ type: ActivityLogEntry.LogType) -> Color {
        switch type {
        case .info: return .blue
        case .success: return .green
        case .warning: return .orange
        case .error: return .red
        }
    }
}

// MARK: - Metric Card

struct MetricCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.system(.title, design: .rounded))
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
    }
}
