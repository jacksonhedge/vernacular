import SwiftUI

enum SidebarTab: String, CaseIterable, Identifiable {
    case status = "Status"
    case messages = "Messages"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .status: return "antenna.radiowaves.left.and.right"
        case .messages: return "message.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

struct MainView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    @State private var selectedTab: SidebarTab = .status

    var body: some View {
        NavigationSplitView {
            List(SidebarTab.allCases, selection: $selectedTab) { tab in
                Label(tab.rawValue, systemImage: tab.icon)
                    .tag(tab)
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 160, ideal: 180)
        } detail: {
            switch selectedTab {
            case .status:
                StatusView()
            case .messages:
                MessagesListView()
            case .settings:
                SettingsFormView()
            }
        }
        .navigationTitle("Vernacular Station")
    }
}

// MARK: - Messages List View

struct MessagesListView: View {
    @EnvironmentObject var syncEngine: SyncEngine
    @State private var filterDirection: MessageDirection?

    var filteredMessages: [SyncMessage] {
        if let filter = filterDirection {
            return syncEngine.recentMessages.filter { $0.direction == filter }
        }
        return syncEngine.recentMessages
    }

    var body: some View {
        VStack(spacing: 0) {
            // Filter bar
            HStack {
                Text("Recent Messages")
                    .font(.headline)
                Spacer()
                Picker("Filter", selection: $filterDirection) {
                    Text("All").tag(nil as MessageDirection?)
                    Text("Inbound").tag(MessageDirection.inbound as MessageDirection?)
                    Text("Outbound").tag(MessageDirection.outbound as MessageDirection?)
                }
                .pickerStyle(.segmented)
                .frame(width: 240)
            }
            .padding()

            Divider()

            if filteredMessages.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "message")
                        .font(.system(size: 40))
                        .foregroundStyle(.secondary)
                    Text("No messages yet")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                    Text("Messages will appear here as they sync")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Table(filteredMessages) {
                    TableColumn("Direction") { msg in
                        HStack(spacing: 4) {
                            Image(systemName: msg.direction == .inbound ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                                .foregroundStyle(msg.direction == .inbound ? .blue : .green)
                            Text(msg.direction.rawValue.capitalized)
                                .font(.caption)
                        }
                    }
                    .width(min: 80, ideal: 100)

                    TableColumn("Phone", value: \.contactPhone)
                        .width(min: 110, ideal: 130)

                    TableColumn("Message", value: \.message)
                        .width(min: 200, ideal: 300)

                    TableColumn("Time") { msg in
                        Text(msg.sentAt ?? msg.createdAt, style: .time)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .width(min: 60, ideal: 80)

                    TableColumn("Status") { msg in
                        Text(msg.status.rawValue)
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(statusColor(msg.status).opacity(0.15))
                            .clipShape(Capsule())
                    }
                    .width(min: 60, ideal: 80)
                }
            }
        }
    }

    private func statusColor(_ status: MessageStatus) -> Color {
        switch status {
        case .sent, .delivered, .synced: return .green
        case .pending: return .orange
        case .failed: return .red
        }
    }
}

// MARK: - Settings Form

struct SettingsFormView: View {
    @AppStorage("supabaseURL") private var supabaseURL = "https://yremtwhlkawlixvlceaj.supabase.co"
    @AppStorage("supabaseKey") private var supabaseKey = ""
    @AppStorage("stationName") private var stationName = "Wade"
    @AppStorage("stationPhone") private var stationPhone = ""
    @AppStorage("heartbeatInterval") private var heartbeatInterval: Double = 30
    @AppStorage("inboundInterval") private var inboundInterval: Double = 5
    @AppStorage("outboundInterval") private var outboundInterval: Double = 5

    var body: some View {
        Form {
            Section("Supabase Connection") {
                TextField("Supabase URL", text: $supabaseURL)
                    .textFieldStyle(.roundedBorder)
                SecureField("API Key (anon/service)", text: $supabaseKey)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Station Identity") {
                TextField("Station Name", text: $stationName)
                    .textFieldStyle(.roundedBorder)
                TextField("Phone Number", text: $stationPhone)
                    .textFieldStyle(.roundedBorder)
            }

            Section("Sync Intervals (seconds)") {
                HStack {
                    Text("Heartbeat")
                    Spacer()
                    TextField("", value: $heartbeatInterval, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                    Text("s")
                }
                HStack {
                    Text("Inbound Sync")
                    Spacer()
                    TextField("", value: $inboundInterval, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                    Text("s")
                }
                HStack {
                    Text("Outbound Sync")
                    Spacer()
                    TextField("", value: $outboundInterval, format: .number)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 80)
                    Text("s")
                }
            }

            Section("Paths") {
                LabeledContent("chat.db") {
                    Text("~/Library/Messages/chat.db")
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                }
            }

            Section {
                HStack {
                    Spacer()
                    Text("Changes take effect on next sync start")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle("Settings")
    }
}
