import Foundation

final class SupabaseService {
    private var supabaseURL: String {
        UserDefaults.standard.string(forKey: "supabaseURL") ?? "https://yremtwhlkawlixvlceaj.supabase.co"
    }

    private var supabaseKey: String {
        UserDefaults.standard.string(forKey: "supabaseKey") ?? ""
    }

    static let shared = SupabaseService()
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }

    // MARK: - Heartbeat

    func sendHeartbeat(stationName: String) async throws -> Bool {
        let url = URL(string: "\(supabaseURL)/api/engine/ping")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")

        let body: [String: Any] = [
            "station": stationName,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else { return false }
        return (200...299).contains(httpResponse.statusCode)
    }

    // MARK: - Insert Message

    func insertMessage(_ message: SyncMessage) async throws {
        let url = URL(string: "\(supabaseURL)/rest/v1/messages")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(message)

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            throw SupabaseError.insertFailed(statusCode: statusCode)
        }
    }

    // MARK: - Poll Outbound

    func pollOutbound(stationName: String) async throws -> [OutboundTask] {
        var components = URLComponents(string: "\(supabaseURL)/api/engine/poll-outbound")!
        components.queryItems = [URLQueryItem(name: "station", value: stationName)]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            return []
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([OutboundTask].self, from: data)) ?? []
    }

    // MARK: - Confirm Sent

    func confirmSent(messageId: String, status: MessageStatus) async throws {
        let url = URL(string: "\(supabaseURL)/api/engine/confirm-sent")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(supabaseKey)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")

        let body: [String: Any] = [
            "messageId": messageId,
            "status": status.rawValue
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw SupabaseError.confirmFailed
        }
    }
}

// MARK: - Supporting Types

struct OutboundTask: Codable, Identifiable {
    let id: String
    let phone: String
    let message: String
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case phone
        case message
        case createdAt = "created_at"
    }
}

enum SupabaseError: Error, LocalizedError {
    case insertFailed(statusCode: Int)
    case confirmFailed
    case invalidURL
    case noAPIKey

    var errorDescription: String? {
        switch self {
        case .insertFailed(let code): return "Insert failed with status \(code)"
        case .confirmFailed: return "Failed to confirm message sent"
        case .invalidURL: return "Invalid Supabase URL"
        case .noAPIKey: return "No Supabase API key configured"
        }
    }
}
