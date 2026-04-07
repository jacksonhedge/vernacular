import Foundation

enum MessageDirection: String, Codable {
    case inbound
    case outbound
}

enum MessageStatus: String, Codable {
    case pending
    case sent
    case delivered
    case failed
    case synced
}

struct SyncMessage: Codable, Identifiable, Hashable {
    var id: String
    var message: String
    var contactPhone: String
    var direction: MessageDirection
    var station: String
    var status: MessageStatus
    var sentAt: Date?
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case message
        case contactPhone = "contact_phone"
        case direction
        case station
        case status
        case sentAt = "sent_at"
        case createdAt = "created_at"
    }

    static func fromChatDB(
        rowID: Int64,
        text: String,
        phone: String,
        direction: MessageDirection,
        station: String,
        date: Date
    ) -> SyncMessage {
        SyncMessage(
            id: "\(station)-\(rowID)",
            message: text,
            contactPhone: phone,
            direction: direction,
            station: station,
            status: .synced,
            sentAt: date,
            createdAt: Date()
        )
    }
}
