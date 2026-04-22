import SwiftUI

enum AccountType: String, CaseIterable {
    case personal = "personal"
    case business = "business"

    var title: String {
        switch self {
        case .personal: return "Personal"
        case .business: return "Business"
        }
    }

    var subtitle: String {
        switch self {
        case .personal: return "AI messaging for you"
        case .business: return "CRM, teams & automation"
        }
    }

    var icon: String {
        switch self {
        case .personal: return "person.fill"
        case .business: return "building.2.fill"
        }
    }
}

struct LoginView: View {
    @EnvironmentObject var supabase: SupabaseService
    @StateObject private var biometric = BiometricService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var companyName = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedAccountType: AccountType = .personal
    @State private var showBiometricPrompt = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color(red: 0.96, green: 0.97, blue: 1.0),
                    Color.white,
                    Color(red: 0.96, green: 0.97, blue: 1.0)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    Spacer().frame(height: 60)

                    // Logo
                    Image("VernacularLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 88, height: 88)
                        .shadow(color: .vnBlue.opacity(0.3), radius: 16, y: 6)

                    Text("Vernacular")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .padding(.top, 14)

                    Text("Your work phone, without the work phone")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.vnSubtext)
                        .padding(.top, 4)

                    // Account type picker (sign up only)
                    if isSignUp {
                        VStack(spacing: 10) {
                            Text("Choose your account type")
                                .font(.vnCaption)
                                .foregroundColor(.vnSubtext)
                                .textCase(.uppercase)
                                .tracking(0.5)

                            HStack(spacing: 10) {
                                ForEach(AccountType.allCases, id: \.self) { type in
                                    AccountTypeCard(
                                        type: type,
                                        isSelected: selectedAccountType == type
                                    ) {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                            selectedAccountType = type
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.top, 28)
                        .padding(.horizontal, 28)
                        .transition(.asymmetric(
                            insertion: .opacity.combined(with: .scale(scale: 0.95)).animation(.easeOut(duration: 0.3)),
                            removal: .opacity.animation(.easeIn(duration: 0.15))
                        ))
                    }

                    // Form card
                    VStack(spacing: 0) {
                        VStack(spacing: 14) {
                            if isSignUp {
                                StyledTextField(
                                    icon: "person.fill",
                                    placeholder: "Full Name",
                                    text: $fullName,
                                    contentType: .name
                                )
                                .transition(.opacity.combined(with: .move(edge: .top)))

                                if selectedAccountType == .business {
                                    StyledTextField(
                                        icon: "building.2.fill",
                                        placeholder: "Company Name",
                                        text: $companyName,
                                        contentType: .organizationName
                                    )
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }

                            StyledTextField(
                                icon: "envelope.fill",
                                placeholder: "Email",
                                text: $email,
                                contentType: .emailAddress,
                                keyboardType: .emailAddress
                            )

                            StyledSecureField(
                                icon: "lock.fill",
                                placeholder: "Password",
                                text: $password
                            )

                            Toggle(isOn: Binding(
                                get: { biometric.isBiometricEnabled },
                                set: { newValue in
                                    // Only set the flag here; actual credential storage happens after successful sign-in
                                    biometric.isBiometricEnabled = newValue
                                    UserDefaults.standard.set(newValue, forKey: "biometric_auth_enabled")
                                }
                            )) {
                                HStack(spacing: 12) {
                                    Image(systemName: biometric.biometricIcon)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.vnBlue.opacity(0.8))
                                    Text("Sign in with Face scan")
                                        .font(.system(size: 14))
                                }
                            }
                            .tint(.vnBlue)
                        }

                        if let error = errorMessage {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .font(.caption)
                                Text(error)
                                    .font(.caption)
                            }
                            .foregroundStyle(.red)
                            .padding(.top, 12)
                        }

                        // CTA Button
                        Button {
                            Task { await authenticate() }
                        } label: {
                            Group {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text(isSignUp ? "Create \(selectedAccountType.title) Account" : "Sign In")
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(
                                LinearGradient(
                                    colors: [.vnBlue, .vnDarkBlue],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .shadow(color: .vnBlue.opacity(0.35), radius: 8, y: 4)
                        }
                        .disabled(email.isEmpty || password.isEmpty || isLoading || (isSignUp && fullName.isEmpty))
                        .opacity(email.isEmpty || password.isEmpty || (isSignUp && fullName.isEmpty) ? 0.5 : 1)
                        .padding(.top, 20)

                        // Or separator
                        HStack {
                            Rectangle().fill(Color(.systemGray4)).frame(height: 1)
                            Text("OR")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.vnSubtext)
                            Rectangle().fill(Color(.systemGray4)).frame(height: 1)
                        }
                        .padding(.top, 18)

                        // Apple Sign In
                        Button {
                            Task {
                                do { try await supabase.signInWithApple() } catch { errorMessage = error.localizedDescription }
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "apple.logo")
                                    .font(.system(size: 18, weight: .semibold))
                                Text("Continue with Apple")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Color.black)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.top, 12)

                        // Google Sign In
                        Button {
                            Task {
                                do { try await supabase.signInWithGoogle() } catch { errorMessage = error.localizedDescription }
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "g.circle.fill")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundStyle(.red)
                                Text("Continue with Google")
                                    .font(.system(size: 15, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Color(.systemGray6))
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        // Email magic link
                        Button {
                            Task {
                                do {
                                    try await supabase.sendMagicLink(to: email)
                                    errorMessage = "Magic link sent to \(email). Check your inbox."
                                } catch { errorMessage = error.localizedDescription }
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "envelope.fill")
                                    .font(.system(size: 16))
                                Text("Email me a sign-in link")
                                    .font(.system(size: 14, weight: .medium))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color(.systemGray6).opacity(0.7))
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .padding(.top, 12)
                        .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty)
                        .opacity(email.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1)

                        // Phone OTP inline UI
                        PhoneOTPSection()
                            .padding(.top, 10)
                    }
                    .padding(24)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: .black.opacity(0.06), radius: 20, y: 8)
                    .padding(.horizontal, 24)
                    .padding(.top, isSignUp ? 20 : 36)

                    // Face ID button
                    if !isSignUp && biometric.hasStoredCredentials {
                        Button {
                            Task { await authenticateWithBiometric() }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: biometric.biometricIcon)
                                    .font(.system(size: 18))
                                Text("Sign in with \(biometric.biometricName)")
                                    .font(.system(size: 15, weight: .medium, design: .rounded))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(Color(.systemGray6))
                            .foregroundStyle(.primary)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 12)
                        .transition(.opacity)
                    }

                    // Toggle
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            isSignUp.toggle()
                            errorMessage = nil
                        }
                    } label: {
                        Text(isSignUp ? "Already have an account? **Sign In**" : "New here? **Create an Account**")
                            .font(.system(size: 14, weight: .regular))
                            .foregroundColor(.vnSubtext)
                    }
                    .padding(.top, 20)

                    Spacer().frame(height: 40)
                }
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private func authenticate() async {
        isLoading = true
        errorMessage = nil
        do {
            if isSignUp {
                try await supabase.signUp(
                    email: email,
                    password: password,
                    fullName: fullName,
                    accountType: selectedAccountType.rawValue,
                    companyName: selectedAccountType == .business ? companyName : nil
                )
            } else {
                try await supabase.signIn(email: email, password: password)
                // Offer to enable biometric if available and toggle is on
                if biometric.isBiometricAvailable && biometric.isBiometricEnabled {
                    // Store or update credentials for Face scan sign-in if user opted in
                    biometric.enable(email: email, password: password)
                }
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func authenticateWithBiometric() async {
        isLoading = true
        errorMessage = nil
        guard let credentials = await biometric.authenticate() else {
            isLoading = false
            return
        }
        do {
            try await supabase.signIn(email: credentials.email, password: credentials.password)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Styled Text Fields

struct StyledTextField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    var contentType: UITextContentType? = nil
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vnBlue.opacity(0.6))
                .frame(width: 20)

            TextField(placeholder, text: $text)
                .font(.system(size: 15))
                .textContentType(contentType)
                .autocapitalization(.none)
                .keyboardType(keyboardType)
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .background(Color(.systemGray6).opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct StyledSecureField: View {
    let icon: String
    let placeholder: String
    @Binding var text: String
    @State private var showPassword = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.vnBlue.opacity(0.6))
                .frame(width: 20)

            if showPassword {
                TextField(placeholder, text: $text)
                    .font(.system(size: 15))
                    .autocapitalization(.none)
            } else {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 15))
            }

            Button {
                showPassword.toggle()
            } label: {
                Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(Color(.tertiaryLabel))
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .background(Color(.systemGray6).opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Account Type Card

struct AccountTypeCard: View {
    let type: AccountType
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 10) {
                ZStack {
                    Circle()
                        .fill(isSelected
                            ? LinearGradient(colors: [.vnBlue, .vnDarkBlue], startPoint: .topLeading, endPoint: .bottomTrailing)
                            : LinearGradient(colors: [Color(.systemGray5), Color(.systemGray5)], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                        .frame(width: 48, height: 48)

                    Image(systemName: type.icon)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(isSelected ? .white : .vnSubtext)
                }

                Text(type.title)
                    .font(.system(size: 14, weight: .semibold, design: .rounded))

                Text(type.subtitle)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(.vnSubtext)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .padding(.horizontal, 8)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.vnLightBlue : Color(.systemGray6).opacity(0.7))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .strokeBorder(isSelected ? Color.vnBlue.opacity(0.5) : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }
}
struct PhoneOTPSection: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var phone = ""
    @State private var code = ""
    @State private var sent = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Sign in with phone")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.vnSubtext)

            HStack(spacing: 8) {
                TextField("Phone number", text: $phone)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .padding(.horizontal, 12)
                    .frame(height: 44)
                    .background(Color(.systemGray6).opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                Button(sent ? "Resend" : "Send Code") {
                    Task {
                        do {
                            try await supabase.sendPhoneOTP(to: phone)
                            sent = true
                            errorMessage = "Code sent via SMS."
                        } catch { errorMessage = error.localizedDescription }
                    }
                }
                .font(.system(size: 13, weight: .semibold))
                .padding(.horizontal, 12)
                .frame(height: 44)
                .background(Color.vnLightBlue)
                .foregroundColor(.vnBlue)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .disabled(phone.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            if sent {
                HStack(spacing: 8) {
                    TextField("6-digit code", text: $code)
                        .keyboardType(.numberPad)
                        .padding(.horizontal, 12)
                        .frame(height: 44)
                        .background(Color(.systemGray6).opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    Button("Verify") {
                        Task {
                            do {
                                try await supabase.verifyPhoneOTP(phone: phone, token: code)
                            } catch { errorMessage = error.localizedDescription }
                        }
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .padding(.horizontal, 12)
                    .frame(height: 44)
                    .background(Color.vnBlue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .disabled(code.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }

            if let error = errorMessage {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.circle.fill").font(.caption)
                    Text(error).font(.caption)
                }
                .foregroundStyle(.red)
                .padding(.top, 4)
            }
        }
    }
}

