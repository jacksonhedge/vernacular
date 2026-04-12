import Foundation

struct Contact: Codable, Identifiable, Hashable {
    let id: UUID
    var phone: String?
    var firstName: String?
    var lastName: String?
    var fullName: String?
    var email: String?
    var company: String?
    var jobTitle: String?
    var tags: [String]?
    var notes: String?
    var city: String?
    var state: String?
    var linkedinUrl: String?
    var instagramHandle: String?
    var twitterHandle: String?
    let organizationId: UUID?
    let createdAt: Date?

    var displayName: String {
        if let full = fullName, !full.isEmpty { return full }
        let parts = [firstName, lastName].compactMap { $0 }.filter { !$0.isEmpty }
        if !parts.isEmpty { return parts.joined(separator: " ") }
        return phone ?? "Unknown"
    }

    var initials: String {
        let parts = displayName.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(displayName.prefix(2)).uppercased()
    }

    enum CodingKeys: String, CodingKey {
        case id, phone, email, company, tags, notes, city, state
        case firstName = "first_name"
        case lastName = "last_name"
        case fullName = "full_name"
        case jobTitle = "job_title"
        case linkedinUrl = "linkedin_url"
        case instagramHandle = "instagram_handle"
        case twitterHandle = "twitter_handle"
        case organizationId = "organization_id"
        case createdAt = "created_at"
    }
}
