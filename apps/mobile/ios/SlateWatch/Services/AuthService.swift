import Foundation
import Security
import WatchConnectivity

@MainActor
final class AuthService: NSObject, ObservableObject {
    @Published var isAuthenticated = false
    @Published var accessToken: String?
    @Published var userId: String?

    private let sharedKeychainGroup = "X47H96M34K.co.opsapp.slate.shared"
    private let appGroupId = "group.co.opsapp.slate"

    override init() {
        super.init()
        loadToken()
    }

    // MARK: - Token Loading (fallback chain)

    /// Try: 1) Shared Keychain → 2) App Group UserDefaults → 3) WatchConnectivity
    func loadToken() {
        // 1. Shared Keychain
        if let token = loadFromSharedKeychain(key: "slate_access_token"),
           let uid = loadFromSharedKeychain(key: "slate_user_id") {
            self.accessToken = token
            self.userId = uid
            self.isAuthenticated = true
            return
        }

        // 2. App Group UserDefaults
        if let defaults = UserDefaults(suiteName: appGroupId),
           let token = defaults.string(forKey: "slate_access_token"),
           let uid = defaults.string(forKey: "slate_user_id") {
            self.accessToken = token
            self.userId = uid
            self.isAuthenticated = true
            return
        }

        // 3. Request from phone
        requestTokenFromPhone()
    }

    // MARK: - Shared Keychain

    private func loadFromSharedKeychain(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "co.opsapp.slate.shared",
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

    // MARK: - WatchConnectivity

    func requestTokenFromPhone() {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(["request": "authToken"], replyHandler: { [weak self] reply in
            Task { @MainActor in
                if let token = reply["accessToken"] as? String,
                   let uid = reply["userId"] as? String {
                    self?.accessToken = token
                    self?.userId = uid
                    self?.isAuthenticated = true
                }
            }
        }, errorHandler: nil)
    }

    // MARK: - Token Update (from WatchConnectivity)

    func updateToken(accessToken: String, userId: String) {
        self.accessToken = accessToken
        self.userId = userId
        self.isAuthenticated = true
    }

    func clearAuth() {
        accessToken = nil
        userId = nil
        isAuthenticated = false
    }

    // MARK: - Token Expiry Check

    var isTokenExpired: Bool {
        guard let token = accessToken else { return true }
        // Decode JWT exp claim
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return true }

        var base64 = String(parts[1])
        while base64.count % 4 != 0 { base64.append("=") }

        guard let data = Data(base64Encoded: base64),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else { return true }

        return Date().timeIntervalSince1970 >= exp
    }

    /// Ensure we have a valid token, requesting from phone if expired
    func ensureValidToken() async -> String? {
        if let token = accessToken, !isTokenExpired {
            return token
        }
        // Request fresh token from phone
        requestTokenFromPhone()
        // Wait briefly for response
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        return accessToken
    }
}
