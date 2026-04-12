import Foundation
import LocalAuthentication
import Security

@MainActor
final class BiometricService: ObservableObject {
    static let shared = BiometricService()

    @Published var isBiometricAvailable = false
    @Published var isBiometricEnabled = false
    @Published var biometricType: LABiometryType = .none

    private let enabledKey = "biometric_auth_enabled"
    private let keychainService = "com.hedgeinc.vernacular"
    private let keychainEmailKey = "biometric_email"
    private let keychainPasswordKey = "biometric_password"

    private init() {
        checkBiometricAvailability()
        isBiometricEnabled = UserDefaults.standard.bool(forKey: enabledKey)
    }

    // MARK: - Availability

    func checkBiometricAvailability() {
        let context = LAContext()
        var error: NSError?
        isBiometricAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        biometricType = context.biometryType
    }

    var biometricName: String {
        switch biometricType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        @unknown default: return "Biometrics"
        }
    }

    var biometricIcon: String {
        switch biometricType {
        case .faceID: return "faceid"
        case .touchID: return "touchid"
        default: return "lock.fill"
        }
    }

    var hasStoredCredentials: Bool {
        isBiometricEnabled && keychainRead(key: keychainEmailKey) != nil
    }

    // MARK: - Enable / Disable

    func enable(email: String, password: String) {
        keychainSave(key: keychainEmailKey, value: email)
        keychainSave(key: keychainPasswordKey, value: password)
        isBiometricEnabled = true
        UserDefaults.standard.set(true, forKey: enabledKey)
    }

    func disable() {
        keychainDelete(key: keychainEmailKey)
        keychainDelete(key: keychainPasswordKey)
        isBiometricEnabled = false
        UserDefaults.standard.set(false, forKey: enabledKey)
    }

    // MARK: - Authenticate

    func authenticate() async -> (email: String, password: String)? {
        let context = LAContext()
        context.localizedCancelTitle = "Use Password"

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Sign in to Vernacular"
            )
            guard success else { return nil }

            guard let email = keychainRead(key: keychainEmailKey),
                  let password = keychainRead(key: keychainPasswordKey) else {
                return nil
            }
            return (email, password)
        } catch {
            print("Biometric auth failed: \(error)")
            return nil
        }
    }

    // MARK: - Keychain

    private func keychainSave(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)

        var addQuery = query
        addQuery[kSecValueData as String] = data
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    private func keychainRead(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func keychainDelete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
