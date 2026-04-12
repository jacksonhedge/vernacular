import Foundation

struct Message: Codable, Identifiable, Hashable {
    let id: UUID
    let conversationId: UUID?
    var direction: String // "Inbound" or "Outbound"
    var message: String?
    var contactPhone: String?
    var station: String?
    var status: String? // "Sent", "Queued", "Failed"
    var sentAt: Date?

    var isFromMe: Bool {
        direction == "Outbound"
    }

    var body: String {
        message ?? ""
    }

    enum CodingKeys: String, CodingKey {
        case id, direction, message, station, status
        case conversationId = "conversation_id"
        case contactPhone = "contact_phone"
        case sentAt = "sent_at"
    }
}
