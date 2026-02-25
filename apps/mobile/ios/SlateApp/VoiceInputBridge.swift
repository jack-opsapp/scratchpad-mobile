import Foundation

@objc(VoiceInputBridge)
class VoiceInputBridge: NSObject {

  @objc
  func checkPendingVoiceInput(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: "group.co.opsapp.slate")
    let pending = defaults?.bool(forKey: "pendingVoiceInput") ?? false
    if pending {
      defaults?.set(false, forKey: "pendingVoiceInput")
      defaults?.synchronize()
    }
    resolve(pending)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
