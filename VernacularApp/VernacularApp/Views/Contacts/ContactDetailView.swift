import SwiftUI

struct ContactDetailView: View {
    let contact: Contact

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Header card
                VStack(spacing: 14) {
                    AvatarView(
                        name: contact.displayName,
                        size: 88,
                        fontSize: .system(size: 30, weight: .bold)
                    )

                    Text(contact.displayName)
                        .font(.system(size: 24, weight: .bold, design: .rounded))

                    if let company = contact.company, !company.isEmpty {
                        HStack(spacing: 6) {
                            if let title = contact.jobTitle {
                                Text(title)
                            }
                            if contact.jobTitle != nil {
                                Text("at")
                                    .foregroundColor(.vnSubtext)
                            }
                            Text(company)
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vnSubtext)
                    }

                    // Quick actions
                    HStack(spacing: 20) {
                        QuickActionButton(icon: "bubble.left.fill", label: "Message", color: .vnBlue)
                        QuickActionButton(icon: "sparkles", label: "AI Draft", color: .purple)
                        QuickActionButton(icon: "phone.fill", label: "Call", color: .green)
                    }
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 24)
                .padding(.horizontal, 16)
                .background(.white)

                // Info sections
                VStack(spacing: 12) {
                    // Contact info
                    if contact.phone != nil || contact.email != nil {
                        InfoSection(title: "CONTACT") {
                            if let phone = contact.phone {
                                InfoRow(icon: "phone.fill", iconColor: .green, label: "Phone", value: phone)
                            }
                            if let email = contact.email {
                                InfoRow(icon: "envelope.fill", iconColor: .vnBlue, label: "Email", value: email)
                            }
                        }
                    }

                    // Location
                    if contact.city != nil {
                        InfoSection(title: "LOCATION") {
                            let loc = [contact.city, contact.state].compactMap { $0 }.joined(separator: ", ")
                            InfoRow(icon: "mappin.circle.fill", iconColor: .red, label: "Location", value: loc)
                        }
                    }

                    // Social
                    if contact.linkedinUrl != nil || contact.instagramHandle != nil || contact.twitterHandle != nil {
                        InfoSection(title: "SOCIAL") {
                            if let linkedin = contact.linkedinUrl {
                                InfoRow(icon: "link", iconColor: .vnBlue, label: "LinkedIn", value: linkedin)
                            }
                            if let ig = contact.instagramHandle {
                                InfoRow(icon: "camera.fill", iconColor: .purple, label: "Instagram", value: "@\(ig)")
                            }
                            if let twitter = contact.twitterHandle {
                                InfoRow(icon: "at", iconColor: .cyan, label: "X / Twitter", value: "@\(twitter)")
                            }
                        }
                    }

                    // Tags
                    if let tags = contact.tags, !tags.isEmpty {
                        InfoSection(title: "TAGS") {
                            FlowLayout(spacing: 8) {
                                ForEach(tags, id: \.self) { tag in
                                    Text(tag)
                                        .font(.system(size: 12, weight: .medium))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.vnLightBlue, in: Capsule())
                                        .foregroundColor(.vnBlue)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                    }

                    // Notes
                    if let notes = contact.notes, !notes.isEmpty {
                        InfoSection(title: "NOTES") {
                            Text(notes)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct QuickActionButton: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .frame(width: 48, height: 48)
                .background(color.opacity(0.1), in: Circle())
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.vnSubtext)
        }
    }
}

struct InfoSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(.tertiaryLabel))
                .tracking(0.5)
                .padding(.horizontal, 16)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content
            }
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct InfoRow: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: 28, height: 28)
                .background(iconColor.opacity(0.1), in: RoundedRectangle(cornerRadius: 7))

            VStack(alignment: .leading, spacing: 1) {
                Text(label)
                    .font(.system(size: 11))
                    .foregroundStyle(Color(.tertiaryLabel))
                Text(value)
                    .font(.system(size: 15))
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }
        return (positions, CGSize(width: maxWidth, height: y + rowHeight))
    }
}
