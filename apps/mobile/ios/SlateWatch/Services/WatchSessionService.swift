import WatchConnectivity

/// WatchConnectivity handler on the watch side
final class WatchSessionService: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchSessionService()

    private override init() {
        super.init()
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // MARK: - WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: (any Error)?) {
        if activationState == .activated {
            // Try to get token from application context
            let context = session.receivedApplicationContext
            if let token = context["accessToken"] as? String,
               let userId = context["userId"] as? String {
                Task { @MainActor in
                    // AuthService will be looked up by the app
                    NotificationCenter.default.post(
                        name: .watchReceivedToken,
                        object: nil,
                        userInfo: ["accessToken": token, "userId": userId]
                    )
                }
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let token = applicationContext["accessToken"] as? String,
           let userId = applicationContext["userId"] as? String {
            Task { @MainActor in
                NotificationCenter.default.post(
                    name: .watchReceivedToken,
                    object: nil,
                    userInfo: ["accessToken": token, "userId": userId]
                )
            }
        }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        if let token = userInfo["accessToken"] as? String,
           let userId = userInfo["userId"] as? String {
            Task { @MainActor in
                NotificationCenter.default.post(
                    name: .watchReceivedToken,
                    object: nil,
                    userInfo: ["accessToken": token, "userId": userId]
                )
            }
        }
    }
}

extension Notification.Name {
    static let watchReceivedToken = Notification.Name("watchReceivedToken")
}
