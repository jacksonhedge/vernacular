import SwiftUI

struct MessageBubble: View {
    let message: Message
    var showTail: Bool = true

    var body: some View {
        HStack {
            if message.isFromMe { Spacer(minLength: 52) }

            VStack(alignment: message.isFromMe ? .trailing : .leading, spacing: 2) {
                Text(message.body)
                    .font(.system(size: 16))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(bubbleBackground)
                    .foregroundStyle(message.isFromMe ? .white : .primary)
                    .clipShape(BubbleShape(isFromMe: message.isFromMe, showTail: showTail))

                if showTail, let date = message.sentAt {
                    HStack(spacing: 4) {
                        Text(date, style: .time)

                        if message.isFromMe {
                            Image(systemName: message.status == "Sent" ? "checkmark.circle.fill" : "clock")
                                .font(.system(size: 9))
                        }
                    }
                    .font(.system(size: 10))
                    .foregroundStyle(Color(.tertiaryLabel))
                    .padding(.horizontal, 6)
                }
            }

            if !message.isFromMe { Spacer(minLength: 52) }
        }
        .padding(.horizontal, 4)
        .padding(.vertical, showTail ? 2 : 0)
    }

    private var bubbleBackground: some ShapeStyle {
        message.isFromMe
            ? AnyShapeStyle(LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing))
            : AnyShapeStyle(Color(.systemBackground))
    }
}

struct BubbleShape: Shape {
    let isFromMe: Bool
    let showTail: Bool

    func path(in rect: CGRect) -> Path {
        let radius: CGFloat = 18

        if isFromMe {
            return RoundedRectangle(cornerRadius: radius)
                .path(in: rect)
        } else {
            return RoundedRectangle(cornerRadius: radius)
                .path(in: rect)
        }
    }
}
