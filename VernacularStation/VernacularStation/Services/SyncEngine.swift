import Foundation
import SwiftUI
import Combine

struct ActivityLogEntry: Identifiable {
    let id = UUID()
    let timestamp: Date
    let message: String
    let type: LogType

    enum LogType {
        case info, success, warning, error
    }
}

@MainActor
final class SyncEngine: ObservableObject {
    // MARK: - Published State

    @Published var isRunning = false
    @Published var inboundCount: Int = 0
    @Published var outboundCount: Int = 0
    @Published var lastSyncAt: Date?
    @Published var errors: [String] = []
    @Published var queueDepth: Int = 0
    @Published var recentMessages: [SyncMessage] = []
    @Published var activityLog: [ActivityLogEntry] = []
    @Published var startTime: Date?

    // MARK: - Configuration

    var stationName: String {
        UserDefaults.standard.string(forKey: "stationName") ?? "Station"
    }

    var stationPhone: String {
        UserDefaults.standard.string(forKey: "stationPhone") ?? ""
    }

    var heartbeatInterval: TimeInterval {
        UserDefaults.standard.double(forKey: "heartbeatInterval").clamped(to: 10...120, default: 30)
    }

    var inboundInterval: TimeInterval {
        UserDefaults.standard.double(forKey: "inboundInterval").clamped(to: 2...60, default: 5)
    }

    var outboundInterval: TimeInterval {
        UserDefaults.standard.double(forKey: "outboundInterval").clamped(to: 2...60, default: 5)
    }

    // MARK: - Internal

    private let supabase = SupabaseService.shared
    private let chatDB = ChatDBReader()
    private let sender = MessageSender.shared

    private var heartbeatTimer: Timer?
    private var inboundTimer: Timer?
    private var outboundTimer: Timer?
    private var lastInboundRowID: Int64 = 0
    private var lastOutboundRowID: Int64 = 0

    var statusColor: Color {
        if !isRunning { return .gray }
        if !errors.isEmpty { return .red }
        return .green
    }

    var status: StationStatus {
        if !isRunning { return .offline }
        if !errors.isEmpty { return .error }
        return .online
    }

    var uptime: TimeInterval {
        guard let start = startTime else { return 0 }
        return Date().timeIntervalSince(start)
    }

    // MARK: - Start / Stop

    func startSync() {
        guard !isRunning else { return }

        // Initialize row IDs to current max to avoid syncing entire history
        lastInboundRowID = chatDB.getLatestRowID()
        lastOutboundRowID = lastInboundRowID
        errors.removeAll()
        startTime = Date()

        log("Starting sync engine", type: .info)
        log("Station: \(stationName)", type: .info)
        log("Initialized at row ID: \(lastInboundRowID)", type: .info)

        isRunning = true

        // Heartbeat timer
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: heartbeatInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.heartbeat()
            }
        }

        // Inbound sync timer
        inboundTimer = Timer.scheduledTimer(withTimeInterval: inboundInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.syncInbound()
            }
        }

        // Outbound sync timer
        outboundTimer = Timer.scheduledTimer(withTimeInterval: outboundInterval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.syncOutbound()
            }
        }

        // Fire heartbeat immediately
        Task { await heartbeat() }
    }

    func stopSync() {
        log("Stopping sync engine", type: .warning)
        isRunning = false
        startTime = nil

        heartbeatTimer?.invalidate()
        inboundTimer?.invalidate()
        outboundTimer?.invalidate()

        heartbeatTimer = nil
        inboundTimer = nil
        outboundTimer = nil
    }

    // MARK: - Sync Inbound

    func syncInbound() async {
        let messages = chatDB.readNewInbound(sinceRowID: lastInboundRowID, stationName: stationName)
        guard !messages.isEmpty else { return }

        var synced = 0
        for msg in messages {
            do {
                try await supabase.insertMessage(msg)
                synced += 1
                recentMessages.insert(msg, at: 0)
            } catch {
                log("Failed to insert inbound: \(error.localizedDescription)", type: .error)
                errors.append(error.localizedDescription)
            }
        }

        if synced > 0 {
            inboundCount += synced
            lastSyncAt = Date()

            // Update lastInboundRowID based on the messages we got
            if let lastMsg = messages.last, let rowID = Int64(lastMsg.id.replacingOccurrences(of: "\(stationName)-", with: "")) {
                lastInboundRowID = rowID
            }

            log("Synced \(synced) inbound message(s)", type: .success)
        }

        // Trim recent messages to 200
        if recentMessages.count > 200 {
            recentMessages = Array(recentMessages.prefix(200))
        }
    }

    // MARK: - Sync Outbound

    func syncOutbound() async {
        do {
            let tasks = try await supabase.pollOutbound(stationName: stationName)
            queueDepth = tasks.count

            for task in tasks {
                let success = sender.send(phone: task.phone, message: task.message)
                let status: MessageStatus = success ? .sent : .failed

                do {
                    try await supabase.confirmSent(messageId: task.id, status: status)
                } catch {
                    log("Failed to confirm sent: \(error.localizedDescription)", type: .error)
                }

                if success {
                    outboundCount += 1
                    let syncMsg = SyncMessage(
                        id: task.id,
                        message: task.message,
                        contactPhone: task.phone,
                        direction: .outbound,
                        station: stationName,
                        status: .sent,
                        sentAt: Date(),
                        createdAt: Date()
                    )
                    recentMessages.insert(syncMsg, at: 0)
                    log("Sent outbound to \(task.phone)", type: .success)
                } else {
                    log("Failed to send to \(task.phone)", type: .error)
                    errors.append("Failed to send to \(task.phone)")
                }
            }

            lastSyncAt = Date()
        } catch {
            log("Outbound poll failed: \(error.localizedDescription)", type: .error)
        }
    }

    // MARK: - Heartbeat

    func heartbeat() async {
        do {
            let success = try await supabase.sendHeartbeat(stationName: stationName)
            if success {
                // Clear transient errors on successful heartbeat
                errors.removeAll()
            } else {
                log("Heartbeat returned non-success", type: .warning)
            }
        } catch {
            log("Heartbeat failed: \(error.localizedDescription)", type: .error)
            errors.append("Heartbeat: \(error.localizedDescription)")
        }
    }

    // MARK: - Activity Log

    private func log(_ message: String, type: ActivityLogEntry.LogType) {
        let entry = ActivityLogEntry(timestamp: Date(), message: message, type: type)
        activityLog.insert(entry, at: 0)
        if activityLog.count > 50 {
            activityLog = Array(activityLog.prefix(50))
        }
        print("[SyncEngine] \(message)")
    }
}

// MARK: - Double Extension

private extension Double {
    func clamped(to range: ClosedRange<Double>, default defaultValue: Double) -> Double {
        if self == 0 { return defaultValue }
        return min(max(self, range.lowerBound), range.upperBound)
    }
}
