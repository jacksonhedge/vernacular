import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient

    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var organizationId: UUID?

    private nonisolated init() {
        // Read config from Info.plist (populated at build time via .xcconfig)
        // Keep secrets out of source; inject via build settings or CI.
        let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String
        let anonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String

        #if DEBUG
        // In debug, allow a local fallback for convenience but assert if key is missing.
        let resolvedURL = urlString ?? "https://miuyksnwzkhiyyilchjs.supabase.co" // TODO: replace or remove fallback
        assert(anonKey != nil && !(anonKey ?? "").isEmpty, "Missing SUPABASE_ANON_KEY in Info.plist (.xcconfig)")
        #else
        // In release, do not allow missing values.
        guard let resolvedURL = urlString, let anonKey = anonKey, !resolvedURL.isEmpty, !anonKey.isEmpty else {
            fatalError("Missing Supabase configuration. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Info.plist via build settings.")
        }
        #endif

        client = SupabaseClient(
            supabaseURL: URL(string: resolvedURL)!,
            supabaseKey: anonKey ?? ""
        )
    }

    // MARK: - Auth

    func signIn(email: String, password: String) async throws {
        let session = try await client.auth.signIn(email: email, password: password)
        currentUser = session.user
        isAuthenticated = true
        await loadOrganization()
    }

    func signUp(email: String, password: String, fullName: String = "", accountType: String = "personal", companyName: String? = nil) async throws {
        var metadata: [String: AnyJSON] = [
            "full_name": .string(fullName),
            "account_type": .string(accountType)
        ]
        if let company = companyName, !company.isEmpty {
            metadata["company_name"] = .string(company)
        }

        let session = try await client.auth.signUp(
            email: email,
            password: password,
            data: metadata
        )
        currentUser = session.user
        isAuthenticated = true
    }

    func signOut() async throws {
        try await client.auth.signOut()
        currentUser = nil
        isAuthenticated = false
        organizationId = nil
    }

    func restoreSession() async {
        guard let stored = client.auth.currentSession else {
            isAuthenticated = false
            return
        }
        currentUser = stored.user
        isAuthenticated = true
        // Try to refresh the session if expired, but don't block
        if stored.expiresAt < Date().timeIntervalSince1970 {
            do {
                let refreshed = try await client.auth.refreshSession()
                currentUser = refreshed.user
            } catch {
                // Token expired and can't refresh - force re-login
                print("Session expired, forcing re-login: \(error)")
                isAuthenticated = false
                currentUser = nil
                return
            }
        }
        await loadOrganization()
    }

    // MARK: - OAuth (Apple / Google) and OTP

    // Handle incoming OAuth redirect URL from SceneDelegate/SwiftUI .onOpenURL
    func handleOAuthRedirect(url: URL) async {
        do {
            try await client.auth.session(from: url)
            await loadOrganization()
            isAuthenticated = true
        } catch {
            print("OAuth redirect handling failed: \(error)")
        }
    }

    // Sign in with Apple using Supabase's native flow (opens ASWebAuthenticationSession)
    func signInWithApple() async throws {
        // TODO: Ensure your Supabase Auth settings include Apple provider and redirect URL
        let redirect = URL(string: "io.supabase.vernacular://auth-callback")! // TODO: replace with your URL scheme
        _ = try await client.auth.signInWithOAuth(
            provider: .apple,
            redirectTo: redirect
        )
    }

    // Sign in with Google using Supabase OAuth
    func signInWithGoogle() async throws {
        // TODO: Ensure your Supabase Auth settings include Google provider and redirect URL
        let redirect = URL(string: "io.supabase.vernacular://auth-callback")! // TODO: replace with your URL scheme
        _ = try await client.auth.signInWithOAuth(
            provider: .google,
            redirectTo: redirect
        )
    }

    // Magic link (email) sign-in
    func sendMagicLink(to email: String) async throws {
        try await client.auth.signInWithOTP(email: email)
    }

    // Phone OTP sign-in: request code
    func sendPhoneOTP(to phone: String) async throws {
        try await client.auth.signInWithOTP(phone: phone)
    }

    // Phone OTP sign-in: verify code
    func verifyPhoneOTP(phone: String, token: String) async throws {
        _ = try await client.auth.verifyOTP(phone: phone, token: token, type: .sms)
        isAuthenticated = client.auth.currentUser != nil
        if isAuthenticated { await loadOrganization() }
    }

    private func loadOrganization() async {
        guard let userId = currentUser?.id else { return }
        do {
            struct UserRow: Codable {
                let organizationId: UUID?
                enum CodingKeys: String, CodingKey {
                    case organizationId = "organization_id"
                }
            }
            let users: [UserRow] = try await client.from("users")
                .select("organization_id")
                .eq("auth_id", value: userId.uuidString)
                .limit(1)
                .execute()
                .value
            organizationId = users.first?.organizationId
        } catch {
            print("Could not load org: \(error)")
        }
    }
    
    // MARK: - Conversations

    func fetchConversations() async throws -> [Conversation] {
        // RLS handles org filtering via station_id → stations.organization_id
        let conversations: [Conversation] = try await client.from("conversations")
            .select("*, contact:contacts(*)")
            .order("last_message_at", ascending: false)
            .execute()
            .value
        return conversations
    }

    // MARK: - Messages

    func fetchMessages(conversationId: UUID) async throws -> [Message] {
        let messages: [Message] = try await client.from("messages")
            .select()
            .eq("conversation_id", value: conversationId.uuidString)
            .order("sent_at", ascending: true)
            .execute()
            .value
        return messages
    }

    func sendMessage(conversationId: UUID, contactPhone: String, text: String, stationName: String = "Wade") async throws {
        struct OutboundMessage: Codable {
            let stationName: String
            let contactPhone: String
            let contactName: String
            let message: String
            let sourceSystem: String
            let organizationId: String?

            enum CodingKeys: String, CodingKey {
                case stationName = "station_name"
                case contactPhone = "contact_phone"
                case contactName = "contact_name"
                case message
                case sourceSystem = "source_system"
                case organizationId = "organization_id"
            }
        }

        let outbound = OutboundMessage(
            stationName: stationName,
            contactPhone: contactPhone,
            contactName: "",
            message: text,
            sourceSystem: "ios_app",
            organizationId: organizationId?.uuidString
        )

        try await client.from("outbound_queue")
            .insert(outbound)
            .execute()

        // Also insert into messages table for immediate UI feedback
        struct NewMessage: Codable {
            let conversationId: String
            let direction: String
            let message: String
            let contactPhone: String
            let status: String
            let sentAt: String

            enum CodingKeys: String, CodingKey {
                case conversationId = "conversation_id"
                case direction, message, status
                case contactPhone = "contact_phone"
                case sentAt = "sent_at"
            }
        }

        let msg = NewMessage(
            conversationId: conversationId.uuidString,
            direction: "Outbound",
            message: text,
            contactPhone: contactPhone,
            status: "Queued",
            sentAt: ISO8601DateFormatter().string(from: Date())
        )

        try await client.from("messages")
            .insert(msg)
            .execute()
    }

    // MARK: - Contacts

    func fetchContacts() async throws -> [Contact] {
        // RLS handles org filtering via conversations → stations.organization_id
        let contacts: [Contact] = try await client.from("contacts")
            .select()
            .order("full_name", ascending: true)
            .execute()
            .value
        return contacts
    }

    func searchContacts(query: String) async throws -> [Contact] {
        let contacts: [Contact] = try await client.from("contacts")
            .select()
            .or("full_name.ilike.%\(query)%,phone.ilike.%\(query)%,email.ilike.%\(query)%")
            .order("full_name", ascending: true)
            .limit(50)
            .execute()
            .value
        return contacts
    }

    // MARK: - AI

    func generateAIResponse(messages: [[String: String]], systemPrompt: String?) async throws -> String {
        struct AIRequest: Codable {
            let messages: [[String: String]]
            let systemPrompt: String?
            let model: String

            enum CodingKeys: String, CodingKey {
                case messages
                case systemPrompt = "system_prompt"
                case model
            }
        }

        struct AIResponse: Codable {
            let reply: String
        }

        // Call the existing Vernacular API endpoint
        let url = URL(string: "https://vernacular.chat/api/ai/chat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let session = try await client.auth.session
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        let body = AIRequest(
            messages: messages,
            systemPrompt: systemPrompt,
            model: "claude-haiku-4-5-20251001"
        )
        request.httpBody = try JSONEncoder().encode(body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(AIResponse.self, from: data)
        return response.reply
    }
}

