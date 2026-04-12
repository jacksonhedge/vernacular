import SwiftUI

extension Color {
    static let vnBlue = Color(red: 0.15, green: 0.48, blue: 1.0)
    static let vnDarkBlue = Color(red: 0.08, green: 0.35, blue: 0.85)
    static let vnLightBlue = Color(red: 0.15, green: 0.48, blue: 1.0).opacity(0.08)
    static let vnBackground = Color(.systemGroupedBackground)
    static let vnCardBackground = Color(.secondarySystemGroupedBackground)
    static let vnSubtext = Color(.secondaryLabel)
}

extension Font {
    static let vnTitle = Font.system(size: 28, weight: .bold, design: .rounded)
    static let vnHeadline = Font.system(size: 17, weight: .semibold, design: .rounded)
    static let vnBody = Font.system(size: 15, weight: .regular)
    static let vnCaption = Font.system(size: 12, weight: .medium)
}

struct AvatarView: View {
    let name: String
    let size: CGFloat
    var fontSize: Font = .headline
    var emojiFontSize: Font? = nil

    private static let emojis = ["🦊", "🐸", "🐙", "🦋", "🐳", "🦜", "🐼", "🦁", "🐨", "🦄", "🐲", "🦈", "🐬", "🦩", "🐝", "🍄", "🌵", "🌸", "⚡️", "🔮", "🎲", "🧊", "🫧", "🪐", "🌈", "🍀", "🎯", "🧸", "🪸", "🦑"]

    private var isPhoneNumber: Bool {
        let stripped = name.filter { $0.isNumber || $0 == "+" || $0 == "(" || $0 == ")" || $0 == "-" || $0 == " " }
        return stripped.count == name.count && name.filter(\.isNumber).count >= 7
    }

    private var emoji: String {
        let hash = abs(name.hashValue)
        return Self.emojis[hash % Self.emojis.count]
    }

    private var color: Color {
        let colors: [Color] = [
            .vnBlue,
            Color(red: 0.35, green: 0.78, blue: 0.48),
            Color(red: 0.95, green: 0.55, blue: 0.25),
            Color(red: 0.65, green: 0.40, blue: 0.90),
            Color(red: 0.92, green: 0.40, blue: 0.52),
            Color(red: 0.25, green: 0.72, blue: 0.72),
            Color(red: 0.42, green: 0.45, blue: 0.88),
        ]
        let hash = abs(name.hashValue)
        return colors[hash % colors.count]
    }

    private var initials: String {
        let parts = name.split(separator: " ").filter { part in
            // Skip parenthetical like "(Maybe)"
            !part.hasPrefix("(")
        }
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        if let first = parts.first, !first.isEmpty {
            return String(first.prefix(2)).uppercased()
        }
        return "?"
    }

    var body: some View {
        if isPhoneNumber {
            // Emoji avatar for phone-only contacts
            Circle()
                .fill(Color(.systemGray5))
                .frame(width: size, height: size)
                .overlay {
                    Text(emoji)
                        .font(emojiFontSize ?? .system(size: size * 0.48))
                }
        } else {
            // Letter avatar for named contacts
            Circle()
                .fill(
                    LinearGradient(
                        colors: [color, color.opacity(0.7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .overlay {
                    Text(initials)
                        .font(fontSize)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                }
                .shadow(color: color.opacity(0.3), radius: size * 0.1, y: size * 0.04)
        }
    }
}
