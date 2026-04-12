import SwiftUI

struct ChatDetailView: View {
    @EnvironmentObject var supabase: SupabaseService
    let conversation: Conversation

    @State private var messages: [Message] = []
    @State private var newMessage = ""
    @State private var isLoading = true
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                            let showTail = isLastInGroup(index: index)
                            MessageBubble(message: message, showTail: showTail)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 12)
                }
                .background(Color(.systemGroupedBackground))
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation(.easeOut(duration: 0.2)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        if let last = messages.last {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Input bar
            VStack(spacing: 0) {
                Divider()
                HStack(alignment: .bottom, spacing: 10) {
                    HStack(alignment: .bottom, spacing: 8) {
                        TextField("Message", text: $newMessage, axis: .vertical)
                            .font(.system(size: 16))
                            .lineLimit(1...6)
                            .focused($isInputFocused)
                            .padding(.vertical, 8)
                            .padding(.leading, 14)

                        // AI draft button
                        Button {
                            // TODO: AI draft
                        } label: {
                            Image(systemName: "sparkles")
                                .font(.system(size: 15))
                                .foregroundColor(.vnBlue.opacity(0.5))
                        }
                        .padding(.trailing, 8)
                        .padding(.bottom, 10)
                    }
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 22))

                    Button {
                        Task { await send() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(
                                newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                    ? Color(.systemGray4)
                                    : Color.vnBlue
                            )
                            .clipShape(Circle())
                    }
                    .disabled(newMessage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.bar)
            }
        }
        .navigationTitle(conversation.contact?.displayName ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadMessages() }
    }

    private func isLastInGroup(index: Int) -> Bool {
        if index == messages.count - 1 { return true }
        return messages[index].isFromMe != messages[index + 1].isFromMe
    }

    private func loadMessages() async {
        do {
            messages = try await supabase.fetchMessages(conversationId: conversation.id)
        } catch {
            print("Failed to load messages: \(error)")
        }
        isLoading = false
    }

    private func send() async {
        let text = newMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        let phone = conversation.contact?.phone ?? ""

        let tempMessage = Message(
            id: UUID(),
            conversationId: conversation.id,
            direction: "Outbound",
            message: text,
            contactPhone: phone,
            station: "Wade",
            status: "Queued",
            sentAt: Date()
        )
        withAnimation(.easeOut(duration: 0.15)) {
            messages.append(tempMessage)
        }
        newMessage = ""

        do {
            try await supabase.sendMessage(
                conversationId: conversation.id,
                contactPhone: phone,
                text: text
            )
        } catch {
            print("Failed to send: \(error)")
        }
    }
}
