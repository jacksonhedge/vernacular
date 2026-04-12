import SwiftUI

struct AIView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var messages: [AIMessage] = []
    @State private var inputText = ""
    @State private var isGenerating = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if messages.isEmpty {
                    emptyState
                } else {
                    chatMessages
                }

                inputBar
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("AI")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !messages.isEmpty {
                        Button {
                            withAnimation { messages.removeAll() }
                        } label: {
                            Image(systemName: "arrow.counterclockwise")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.vnBlue)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 40)

                // AI icon with glow effect
                ZStack {
                    Circle()
                        .fill(Color.vnBlue.opacity(0.08))
                        .frame(width: 100, height: 100)

                    Circle()
                        .fill(Color.vnBlue.opacity(0.15))
                        .frame(width: 72, height: 72)

                    Image(systemName: "sparkles")
                        .font(.system(size: 32, weight: .medium))
                        .foregroundColor(.vnBlue)
                }

                VStack(spacing: 8) {
                    Text("AI Assistant")
                        .font(.system(size: 24, weight: .bold, design: .rounded))

                    Text("Draft messages, analyze tone,\nand get smart suggestions")
                        .font(.system(size: 14))
                        .foregroundColor(.vnSubtext)
                        .multilineTextAlignment(.center)
                }

                // Quick prompts
                VStack(spacing: 10) {
                    QuickPromptCard(
                        icon: "pencil.line",
                        title: "Draft a follow-up",
                        subtitle: "Get a suggested reply for your last conversation"
                    ) {
                        sendMessage("Draft a follow-up message for my most recent conversation")
                    }

                    QuickPromptCard(
                        icon: "doc.text.magnifyingglass",
                        title: "Summarize conversations",
                        subtitle: "Get a digest of recent activity and action items"
                    ) {
                        sendMessage("Give me a summary of my recent conversations and any action items")
                    }

                    QuickPromptCard(
                        icon: "text.bubble",
                        title: "Help me respond",
                        subtitle: "Get help crafting the perfect professional reply"
                    ) {
                        sendMessage("I need help crafting a professional response. What should I keep in mind?")
                    }

                    QuickPromptCard(
                        icon: "face.smiling",
                        title: "Analyze tone",
                        subtitle: "Check how your message comes across"
                    ) {
                        sendMessage("Help me analyze the tone of a message I'm about to send")
                    }
                }
                .padding(.horizontal, 20)

                Spacer().frame(height: 20)
            }
        }
    }

    // MARK: - Chat Messages

    private var chatMessages: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 20) {
                    ForEach(messages) { message in
                        AIMessageRow(message: message)
                            .id(message.id)
                    }

                    if isGenerating {
                        HStack(alignment: .top, spacing: 12) {
                            AIAvatarBadge()

                            TypingIndicator()
                                .padding(.top, 8)

                            Spacer()
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 16)
            }
            .onChange(of: messages.count) { _, _ in
                if let last = messages.last {
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Input Bar

    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
            HStack(alignment: .bottom, spacing: 10) {
                HStack(alignment: .bottom) {
                    TextField("Ask AI anything...", text: $inputText, axis: .vertical)
                        .font(.system(size: 16))
                        .lineLimit(1...5)
                        .focused($isInputFocused)
                        .padding(.vertical, 8)
                        .padding(.leading, 14)
                        .padding(.trailing, 8)
                }
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 22))

                Button {
                    sendMessage(inputText)
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 34, height: 34)
                        .background(
                            canSend
                                ? AnyShapeStyle(LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing))
                                : AnyShapeStyle(Color(.systemGray4))
                        )
                        .clipShape(Circle())
                }
                .disabled(!canSend)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.bar)
        }
    }

    private var canSend: Bool {
        !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isGenerating
    }

    // MARK: - Actions

    private func sendMessage(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let userMessage = AIMessage(role: .user, content: trimmed)
        withAnimation(.easeOut(duration: 0.15)) {
            messages.append(userMessage)
        }
        inputText = ""
        isGenerating = true

        Task {
            do {
                let apiMessages = messages.map { msg in
                    ["role": msg.role.rawValue, "content": msg.content]
                }

                let reply = try await supabase.generateAIResponse(
                    messages: apiMessages,
                    systemPrompt: "You are a helpful AI assistant for Vernacular, a messaging CRM platform. Help the user draft messages, analyze conversations, and manage their communications professionally. Be concise and actionable."
                )

                withAnimation(.easeOut(duration: 0.15)) {
                    messages.append(AIMessage(role: .assistant, content: reply))
                }
            } catch {
                withAnimation {
                    messages.append(AIMessage(role: .assistant, content: "Sorry, I couldn't generate a response. Please try again."))
                }
            }
            isGenerating = false
        }
    }
}

// MARK: - AI Message Row

struct AIMessageRow: View {
    let message: AIMessage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.role == .assistant {
                AIAvatarBadge()
            }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 6) {
                Text(message.content)
                    .font(.system(size: 15))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        message.role == .user
                            ? AnyShapeStyle(LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing))
                            : AnyShapeStyle(Color(.systemBackground))
                    )
                    .foregroundStyle(message.role == .user ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .shadow(color: .black.opacity(message.role == .assistant ? 0.04 : 0), radius: 4, y: 2)

                Text(message.timestamp, style: .time)
                    .font(.system(size: 10))
                    .foregroundStyle(Color(.tertiaryLabel))
                    .padding(.horizontal, 4)
            }
            .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)

            if message.role == .user {
                Spacer().frame(width: 4)
            }
        }
        .padding(.horizontal, 16)
    }
}

struct AIAvatarBadge: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .frame(width: 32, height: 32)

            Image(systemName: "sparkles")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Quick Prompt Card

struct QuickPromptCard: View {
    let icon: String
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.vnBlue)
                    .frame(width: 36, height: 36)
                    .background(Color.vnLightBlue, in: RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(.vnSubtext)
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(.tertiaryLabel))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(Color(.tertiaryLabel))
                    .frame(width: 7, height: 7)
                    .scaleEffect(phase == i ? 1.3 : 0.8)
                    .animation(.easeInOut(duration: 0.4).repeatForever().delay(Double(i) * 0.15), value: phase)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        .onAppear { phase = 2 }
    }
}
