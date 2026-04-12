import SwiftUI

struct ContactsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var contacts: [Contact] = []
    @State private var searchText = ""
    @State private var isLoading = true

    var filtered: [Contact] {
        if searchText.isEmpty { return contacts }
        return contacts.filter { contact in
            let name = contact.displayName.lowercased()
            let phone = contact.phone?.lowercased() ?? ""
            let email = contact.email?.lowercased() ?? ""
            let query = searchText.lowercased()
            return name.contains(query) || phone.contains(query) || email.contains(query)
        }
    }

    var grouped: [(String, [Contact])] {
        let dict = Dictionary(grouping: filtered) { contact in
            let first = contact.displayName.first?.uppercased() ?? "#"
            return first.rangeOfCharacter(from: .letters) != nil ? first : "#"
        }
        return dict.sorted { $0.key < $1.key }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                        Text("Loading contacts...")
                            .font(.vnCaption)
                            .foregroundColor(.vnSubtext)
                    }
                    .frame(maxHeight: .infinity)
                } else if contacts.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 48))
                            .foregroundColor(.vnBlue.opacity(0.3))
                        Text("No Contacts Yet")
                            .font(.vnHeadline)
                        Text("Your contacts will appear here")
                            .font(.vnBody)
                            .foregroundColor(.vnSubtext)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        ForEach(grouped, id: \.0) { letter, sectionContacts in
                            Section {
                                ForEach(sectionContacts) { contact in
                                    NavigationLink(value: contact) {
                                        ContactRow(contact: contact)
                                    }
                                    .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                }
                            } header: {
                                Text(letter)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.vnSubtext)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Contacts")
            .searchable(text: $searchText, prompt: "Search by name, phone, or email")
            .navigationDestination(for: Contact.self) { contact in
                ContactDetailView(contact: contact)
            }
            .refreshable { await loadContacts() }
            .task { await loadContacts() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        // Add contact
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.vnBlue)
                    }
                }
            }
        }
    }

    private func loadContacts() async {
        guard supabase.isAuthenticated else {
            isLoading = false
            return
        }
        do {
            contacts = try await supabase.fetchContacts()
        } catch {
            print("Failed to load contacts: \(error)")
        }
        isLoading = false
    }
}

struct ContactRow: View {
    let contact: Contact

    var body: some View {
        HStack(spacing: 14) {
            AvatarView(
                name: contact.displayName,
                size: 42,
                fontSize: .system(size: 15, weight: .semibold)
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(contact.displayName)
                    .font(.system(size: 15, weight: .medium))

                if let company = contact.company, !company.isEmpty {
                    Text(company)
                        .font(.system(size: 13))
                        .foregroundColor(.vnSubtext)
                } else if let phone = contact.phone {
                    Text(phone)
                        .font(.system(size: 13))
                        .foregroundColor(.vnSubtext)
                }
            }
        }
        .padding(.vertical, 2)
    }
}
