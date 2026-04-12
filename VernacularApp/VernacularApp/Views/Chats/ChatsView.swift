import SwiftUI

struct ChatsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var conversations: [Conversation] = []
    @State private var searchText = ""
    @State private var isLoading = true

    var filtered: [Conversation] {
        if searchText.isEmpty { return conversations }
        return conversations.filter { conv in
            let name = conv.contact?.displayName ?? ""
            let preview = conv.lastMessagePreview ?? ""
            let query = searchText.lowercased()
            return name.lowercased().contains(query) || preview.lowercased().contains(query)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                        Text("Loading conversations...")
                            .font(.vnCaption)
                            .foregroundColor(.vnSubtext)
                    }
                    .frame(maxHeight: .infinity)
                } else if conversations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 48))
                            .foregroundColor(.vnBlue.opacity(0.3))
                        Text("No Conversations Yet")
                            .font(.vnHeadline)
                        Text("Your messages will appear here")
                            .font(.vnBody)
                            .foregroundColor(.vnSubtext)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List(filtered) { conversation in
                        NavigationLink(value: conversation) {
                            ConversationRow(conversation: conversation)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Chats")
            .searchable(text: $searchText, prompt: "Search messages")
            .navigationDestination(for: Conversation.self) { conversation in
                ChatDetailView(conversation: conversation)
            }
            .refreshable { await loadConversations() }
            .task { await loadConversations() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // New message
                    } label: {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vnBlue)
                    }
                }
            }
        }
    }

    private func loadConversations() async {
        guard supabase.isAuthenticated else {
            isLoading = false
            return
        }
        do {
            conversations = try await supabase.fetchConversations()
        } catch {
            print("Failed to load conversations: \(error)")
        }
        isLoading = false
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: conversation.contact?.displayName ?? "?",
                size: 52,
                fontSize: .system(size: 18, weight: .semibold)
            )

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(conversation.contact?.displayName ?? "Unknown")
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(1)

                    Spacer()

                    if let date = conversation.lastMessageAt {
                        Text(date, style: .relative)
                            .font(.system(size: 12))
                            .foregroundColor(.vnSubtext)
                    }
                }

                HStack(alignment: .top) {
                    Text(conversation.lastMessagePreview ?? "No messages yet")
                        .font(.system(size: 14))
                        .foregroundColor(.vnSubtext)
                        .lineLimit(2)

                    Spacer(minLength: 8)

                    if let count = conversation.unreadCount, count > 0 {
                        Text("\(count)")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.vnBlue, in: Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}
