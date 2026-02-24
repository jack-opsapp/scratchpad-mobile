import Foundation

/// React Native bridge module to expose WatchSessionManager to JS
@objc(WatchSessionBridge)
final class WatchSessionBridge: NSObject {

    @objc func syncToken(_ sessionJSON: String,
                         resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
        WatchSessionManager.shared.syncToken(sessionJSON)
        resolve(true)
    }

    @objc func clearToken(_ resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
        WatchSessionManager.shared.clearToken()
        resolve(true)
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
