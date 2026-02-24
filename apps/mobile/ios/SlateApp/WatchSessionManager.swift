import Foundation
import WatchConnectivity
import Security

/// Manages WatchConnectivity on the iOS side.
/// Copies auth tokens from the default Keychain to the shared group,
/// App Group UserDefaults, and sends via WCSession.
@objc final class WatchSessionManager: NSObject, WCSessionDelegate {
    @objc static let shared = WatchSessionManager()

    private let sharedKeychainGroup = "X47H96M34K.co.opsapp.slate.shared"
    private let appGroupId = "group.co.opsapp.slate"
    private let keychainService = "co.opsapp.slate.shared"

    // The service key that react-native-keychain uses for the Supabase auth token
    private let rnKeychainService = "sb-lepksnpkrnkokiwxfcsj-auth-token"

    private override init() {
        super.init()
    }

    // MARK: - Activation

    @objc func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - Token Sync

    /// Called from the RN bridge whenever the Supabase token changes.
    /// Reads the full session JSON, extracts tokens, writes to shared locations.
    @objc func syncToken(_ sessionJSON: String) {
        guard let data = sessionJSON.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let accessToken = json["access_token"] as? String,
              let user = json["user"] as? [String: Any],
              let userId = user["id"] as? String else {
            return
        }

        let refreshToken = json["refresh_token"] as? String

        // 1. Write to shared Keychain
        saveToSharedKeychain(key: "slate_access_token", value: accessToken)
        saveToSharedKeychain(key: "slate_user_id", value: userId)
        if let rt = refreshToken {
            saveToSharedKeychain(key: "slate_refresh_token", value: rt)
        }

        // 2. Write to App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(accessToken, forKey: "slate_access_token")
            defaults.set(userId, forKey: "slate_user_id")
            if let rt = refreshToken {
                defaults.set(rt, forKey: "slate_refresh_token")
            }
        }

        // 3. Send to Watch via WCSession
        sendTokenToWatch(accessToken: accessToken, userId: userId)
    }

    /// Called when user signs out
    @objc func clearToken() {
        // Clear shared Keychain
        deleteFromSharedKeychain(key: "slate_access_token")
        deleteFromSharedKeychain(key: "slate_user_id")
        deleteFromSharedKeychain(key: "slate_refresh_token")

        // Clear App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.removeObject(forKey: "slate_access_token")
            defaults.removeObject(forKey: "slate_user_id")
            defaults.removeObject(forKey: "slate_refresh_token")
        }

        // Send empty context to watch
        try? WCSession.default.updateApplicationContext(["accessToken": "", "userId": ""])
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: (any Error)?) {
        if activationState == .activated {
            // On activation, sync current token if available
            syncCurrentTokenToWatch()
        }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }

    /// Handle watch requesting a token
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        if let request = message["request"] as? String, request == "authToken" {
            // Read from shared keychain
            if let token = loadFromSharedKeychain(key: "slate_access_token"),
               let userId = loadFromSharedKeychain(key: "slate_user_id") {
                replyHandler(["accessToken": token, "userId": userId])
            } else {
                replyHandler(["error": "No token available"])
            }
        }
    }

    // MARK: - Private Helpers

    private func sendTokenToWatch(accessToken: String, userId: String) {
        guard WCSession.default.activationState == .activated else { return }
        try? WCSession.default.updateApplicationContext([
            "accessToken": accessToken,
            "userId": userId,
        ])
    }

    private func syncCurrentTokenToWatch() {
        if let token = loadFromSharedKeychain(key: "slate_access_token"),
           let userId = loadFromSharedKeychain(key: "slate_user_id") {
            sendTokenToWatch(accessToken: token, userId: userId)
        }
    }

    // MARK: - Shared Keychain Operations

    private func saveToSharedKeychain(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: sharedKeychainGroup,
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: sharedKeychainGroup,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemAdd(addQuery as CFDictionary, nil)
    }

    private func loadFromSharedKeychain(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: sharedKeychainGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func deleteFromSharedKeychain(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: sharedKeychainGroup,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
