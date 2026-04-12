import Foundation

struct Conversation: Codable, Identifiable, Hashable {
    let id: UUID
    let stationId: UUID?
    let contactId: UUID?
    var status: String?
    var lastMessageAt: Date?
    var lastMessagePreview: String?
    var unreadCount: Int?
    var flagged: Bool?
    var goal: String?
    var aiSystemPrompt: String?
    let organizationId: UUID?

    // Joined data
    var contact: Contact?

    enum CodingKeys: String, CodingKey {
        case id, status, flagged, goal, contact
        case stationId = "station_id"
        case contactId = "contact_id"
        case lastMessageAt = "last_message_at"
        case lastMessagePreview = "last_message_preview"
        case unreadCount = "unread_count"
        case aiSystemPrompt = "ai_system_prompt"
        case organizationId = "organization_id"
    }
}
