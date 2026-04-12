import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var supabase: SupabaseService
    @StateObject private var biometric = BiometricService.shared
    @State private var showingSignOutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // Profile header
                Section {
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing)
                                )
                                .frame(width: 64, height: 64)
                                .shadow(color: .vnBlue.opacity(0.3), radius: 8, y: 3)

                            Image(systemName: "person.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(.white)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(supabase.currentUser?.email ?? "User")
                                .font(.system(size: 17, weight: .semibold))

                            Text("Vernacular Account")
                                .font(.system(size: 13))
                                .foregroundColor(.vnSubtext)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Color(.tertiaryLabel))
                    }
                    .padding(.vertical, 6)
                }

                // Messaging
                Section {
                    SettingsRow(icon: "bell.fill", iconColor: .red, title: "Notifications")
                    SettingsRow(icon: "moon.fill", iconColor: .indigo, title: "Quiet Hours")
                    SettingsRow(icon: "paintbrush.fill", iconColor: .orange, title: "Appearance")
                } header: {
                    Text("Messaging")
                }

                // AI
                Section {
                    SettingsRow(icon: "sparkles", iconColor: .purple, title: "AI Model")
                    SettingsRow(icon: "text.quote", iconColor: .vnBlue, title: "System Prompt")
                    SettingsRow(icon: "arrow.uturn.left.circle.fill", iconColor: .green, title: "Auto Reply")
                    SettingsRow(icon: "brain.head.profile.fill", iconColor: .pink, title: "AI Personality")
                } header: {
                    Text("AI")
                }

                // Security
                if biometric.isBiometricAvailable {
                    Section {
                        Toggle(isOn: Binding(
                            get: { biometric.isBiometricEnabled },
                            set: { enabled in
                                if enabled {
                                    // Re-enable with current session email
                                    if let email = supabase.currentUser?.email {
                                        // User will need to re-enter password on next login to store it
                                        biometric.enable(email: email, password: "")
                                    }
                                } else {
                                    biometric.disable()
                                }
                            }
                        )) {
                            HStack(spacing: 14) {
                                Image(systemName: biometric.biometricIcon)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(.white)
                                    .frame(width: 30, height: 30)
                                    .background(Color.green, in: RoundedRectangle(cornerRadius: 7))

                                Text(biometric.biometricName)
                                    .font(.system(size: 15))
                            }
                        }
                        .tint(.vnBlue)
                    } header: {
                        Text("Security")
                    } footer: {
                        Text("Use \(biometric.biometricName) to sign in quickly without entering your password.")
                    }
                }

                // Account
                Section {
                    SettingsRow(icon: "creditcard.fill", iconColor: .vnBlue, title: "Billing & Credits")
                    SettingsRow(icon: "desktopcomputer", iconColor: .gray, title: "Stations")
                    SettingsRow(icon: "person.3.fill", iconColor: .teal, title: "Team")
                    SettingsRow(icon: "lock.shield.fill", iconColor: .green, title: "Privacy & Security")
                } header: {
                    Text("Account")
                }

                // Support
                Section {
                    SettingsRow(icon: "questionmark.circle.fill", iconColor: .vnBlue, title: "Help & Support")
                    SettingsRow(icon: "doc.text.fill", iconColor: .gray, title: "Terms of Service")
                    SettingsRow(icon: "hand.raised.fill", iconColor: .gray, title: "Privacy Policy")
                } header: {
                    Text("Support")
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        showingSignOutAlert = true
                    } label: {
                        HStack {
                            Spacer()
                            Text("Sign Out")
                                .font(.system(size: 15, weight: .medium))
                            Spacer()
                        }
                    }
                }

                // Footer
                Section {
                    VStack(spacing: 6) {
                        Image("VernacularLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 32, height: 32)
                            .opacity(0.4)

                        Text("Vernacular v1.0.0")
                            .font(.system(size: 12, weight: .medium))
                        Text("Built by Hedge, Inc.")
                            .font(.system(size: 11))
                    }
                    .foregroundStyle(Color(.tertiaryLabel))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Settings")
            .alert("Sign Out?", isPresented: $showingSignOutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    Task { try? await supabase.signOut() }
                }
            } message: {
                Text("Are you sure you want to sign out of Vernacular?")
            }
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let iconColor: Color
    let title: String

    var body: some View {
        NavigationLink {
            Text("\(title) settings coming soon")
                .foregroundColor(.vnSubtext)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(iconColor, in: RoundedRectangle(cornerRadius: 7))

                Text(title)
                    .font(.system(size: 15))
            }
        }
    }
}
