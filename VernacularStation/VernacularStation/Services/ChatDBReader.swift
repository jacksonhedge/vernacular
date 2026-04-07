import Foundation
import SQLite3

final class ChatDBReader {
    let dbPath: String

    private var db: OpaquePointer?

    init(dbPath: String? = nil) {
        self.dbPath = dbPath ?? "\(NSHomeDirectory())/Library/Messages/chat.db"
    }

    // MARK: - Open / Close

    private func open() throws {
        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            let errmsg = db.flatMap { String(cString: sqlite3_errmsg($0)) } ?? "unknown"
            throw ChatDBError.openFailed(message: errmsg)
        }
    }

    private func close() {
        if let db = db {
            sqlite3_close(db)
            self.db = nil
        }
    }

    // MARK: - Read New Inbound

    func readNewInbound(sinceRowID: Int64, stationName: String) -> [SyncMessage] {
        do {
            try open()
            defer { close() }

            let query = """
                SELECT
                    m.ROWID,
                    COALESCE(m.text, '') as text,
                    h.id as handle_id,
                    m.date as msg_date,
                    m.attributedBody
                FROM message m
                LEFT JOIN handle h ON m.handle_id = h.ROWID
                WHERE m.is_from_me = 0
                  AND m.ROWID > ?
                ORDER BY m.ROWID ASC
                LIMIT 100
            """

            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else {
                return []
            }
            defer { sqlite3_finalize(stmt) }

            sqlite3_bind_int64(stmt, 1, sinceRowID)

            var messages: [SyncMessage] = []

            while sqlite3_step(stmt) == SQLITE_ROW {
                let rowID = sqlite3_column_int64(stmt, 0)

                var text = String(cString: sqlite3_column_text(stmt, 1))
                if text.isEmpty {
                    // Try attributedBody extraction
                    if let blobPointer = sqlite3_column_blob(stmt, 4) {
                        let blobSize = Int(sqlite3_column_bytes(stmt, 4))
                        let data = Data(bytes: blobPointer, count: blobSize)
                        text = extractTextFromAttributedBody(data) ?? ""
                    }
                }

                let phone = String(cString: sqlite3_column_text(stmt, 2))
                let coreDataTimestamp = sqlite3_column_int64(stmt, 3)
                let date = dateFromCoreData(timestamp: coreDataTimestamp)

                guard !text.isEmpty else { continue }

                let msg = SyncMessage.fromChatDB(
                    rowID: rowID,
                    text: text,
                    phone: normalizePhone(phone),
                    direction: .inbound,
                    station: stationName,
                    date: date
                )
                messages.append(msg)
            }

            return messages
        } catch {
            print("[ChatDBReader] Error reading inbound: \(error)")
            return []
        }
    }

    // MARK: - Read New Outbound

    func readNewOutbound(sinceRowID: Int64, stationName: String) -> [SyncMessage] {
        do {
            try open()
            defer { close() }

            let query = """
                SELECT
                    m.ROWID,
                    COALESCE(m.text, '') as text,
                    h.id as handle_id,
                    m.date as msg_date,
                    m.attributedBody
                FROM message m
                LEFT JOIN handle h ON m.handle_id = h.ROWID
                WHERE m.is_from_me = 1
                  AND m.ROWID > ?
                ORDER BY m.ROWID ASC
                LIMIT 100
            """

            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else {
                return []
            }
            defer { sqlite3_finalize(stmt) }

            sqlite3_bind_int64(stmt, 1, sinceRowID)

            var messages: [SyncMessage] = []

            while sqlite3_step(stmt) == SQLITE_ROW {
                let rowID = sqlite3_column_int64(stmt, 0)

                var text = String(cString: sqlite3_column_text(stmt, 1))
                if text.isEmpty {
                    if let blobPointer = sqlite3_column_blob(stmt, 4) {
                        let blobSize = Int(sqlite3_column_bytes(stmt, 4))
                        let data = Data(bytes: blobPointer, count: blobSize)
                        text = extractTextFromAttributedBody(data) ?? ""
                    }
                }

                let phone = String(cString: sqlite3_column_text(stmt, 2))
                let coreDataTimestamp = sqlite3_column_int64(stmt, 3)
                let date = dateFromCoreData(timestamp: coreDataTimestamp)

                guard !text.isEmpty else { continue }

                let msg = SyncMessage.fromChatDB(
                    rowID: rowID,
                    text: text,
                    phone: normalizePhone(phone),
                    direction: .outbound,
                    station: stationName,
                    date: date
                )
                messages.append(msg)
            }

            return messages
        } catch {
            print("[ChatDBReader] Error reading outbound: \(error)")
            return []
        }
    }

    // MARK: - Attachment Info

    func getAttachmentInfo(messageRowID: Int64) -> (mimeType: String, filename: String)? {
        do {
            try open()
            defer { close() }

            let query = """
                SELECT a.mime_type, a.filename
                FROM attachment a
                JOIN message_attachment_join maj ON maj.attachment_id = a.ROWID
                WHERE maj.message_id = ?
                LIMIT 1
            """

            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else {
                return nil
            }
            defer { sqlite3_finalize(stmt) }

            sqlite3_bind_int64(stmt, 1, messageRowID)

            if sqlite3_step(stmt) == SQLITE_ROW {
                let mimeType = sqlite3_column_text(stmt, 0).map { String(cString: $0) } ?? "unknown"
                let filename = sqlite3_column_text(stmt, 1).map { String(cString: $0) } ?? "unknown"
                return (mimeType, filename)
            }

            return nil
        } catch {
            return nil
        }
    }

    // MARK: - Get Latest Row ID

    func getLatestRowID() -> Int64 {
        do {
            try open()
            defer { close() }

            let query = "SELECT MAX(ROWID) FROM message"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else {
                return 0
            }
            defer { sqlite3_finalize(stmt) }

            if sqlite3_step(stmt) == SQLITE_ROW {
                return sqlite3_column_int64(stmt, 0)
            }
            return 0
        } catch {
            return 0
        }
    }

    // MARK: - Helpers

    private func dateFromCoreData(timestamp: Int64) -> Date {
        // macOS Messages stores dates as nanoseconds since 2001-01-01
        let seconds = Double(timestamp) / 1_000_000_000.0
        return Date(timeIntervalSinceReferenceDate: seconds)
    }

    private func extractTextFromAttributedBody(_ data: Data) -> String? {
        // The attributedBody is an NSKeyedArchiver blob.
        // We do a best-effort plaintext extraction by scanning for the
        // NSString content which is stored after a known marker sequence.
        guard let content = String(data: data, encoding: .utf8) else {
            // Try to find text in binary plist
            if let str = String(data: data, encoding: .ascii) {
                return cleanExtractedText(str)
            }
            return nil
        }
        return cleanExtractedText(content)
    }

    private func cleanExtractedText(_ raw: String) -> String? {
        // Strip non-printable characters and control codes
        let cleaned = raw.unicodeScalars
            .filter { $0.isASCII && ($0.value >= 32 || $0 == "\n") }
            .map { Character($0) }
        let result = String(cleaned).trimmingCharacters(in: .whitespacesAndNewlines)
        return result.isEmpty ? nil : result
    }

    private func normalizePhone(_ phone: String) -> String {
        let digits = phone.filter { $0.isNumber }
        if digits.count == 10 {
            return "+1\(digits)"
        } else if digits.count == 11 && digits.hasPrefix("1") {
            return "+\(digits)"
        }
        return phone
    }
}

// MARK: - Errors

enum ChatDBError: Error, LocalizedError {
    case openFailed(message: String)
    case queryFailed(message: String)

    var errorDescription: String? {
        switch self {
        case .openFailed(let msg): return "Failed to open chat.db: \(msg)"
        case .queryFailed(let msg): return "Query failed: \(msg)"
        }
    }
}
