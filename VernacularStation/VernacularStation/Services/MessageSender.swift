import Foundation

final class MessageSender {

    static let shared = MessageSender()

    private init() {}

    /// Send an iMessage to the given phone number using AppleScript via Messages.app.
    /// Returns true if the script executed without error.
    func send(phone: String, message: String) -> Bool {
        let escapedMessage = message
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")

        let escapedPhone = phone
            .replacingOccurrences(of: "\"", with: "\\\"")

        let script = """
        tell application "Messages"
            set targetService to 1st account whose service type = iMessage
            set targetBuddy to participant "\(escapedPhone)" of targetService
            send "\(escapedMessage)" to targetBuddy
        end tell
        """

        var error: NSDictionary?
        guard let appleScript = NSAppleScript(source: script) else {
            print("[MessageSender] Failed to create AppleScript")
            return false
        }

        appleScript.executeAndReturnError(&error)

        if let error = error {
            print("[MessageSender] AppleScript error: \(error)")
            return false
        }

        print("[MessageSender] Sent message to \(phone)")
        return true
    }
}
