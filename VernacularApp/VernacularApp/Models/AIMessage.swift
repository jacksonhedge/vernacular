import Foundation

struct AIMessage: Identifiable, Hashable {
    let id: UUID
    var role: Role
    var content: String
    var timestamp: Date

    enum Role: String, Hashable {
        case user
        case assistant
    }

    init(role: Role, content: String) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = Date()
    }
}
