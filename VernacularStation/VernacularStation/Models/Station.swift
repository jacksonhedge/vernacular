import Foundation

enum StationStatus: String, Codable, CaseIterable {
    case online
    case offline
    case error

    var displayName: String {
        switch self {
        case .online: return "Online"
        case .offline: return "Offline"
        case .error: return "Error"
        }
    }

    var emoji: String {
        switch self {
        case .online: return "green"
        case .offline: return "gray"
        case .error: return "red"
        }
    }
}

struct Station: Codable, Identifiable {
    var id: String { name }
    var name: String
    var phoneNumber: String
    var status: StationStatus
    var lastHeartbeat: Date?
    var messagesSynced: Int
    var lastSyncAt: Date?

    static var empty: Station {
        Station(
            name: "",
            phoneNumber: "",
            status: .offline,
            lastHeartbeat: nil,
            messagesSynced: 0,
            lastSyncAt: nil
        )
    }
}
