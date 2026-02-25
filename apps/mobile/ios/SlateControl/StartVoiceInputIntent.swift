import AppIntents
import Foundation

@available(iOS 18.0, *)
struct StartVoiceInputIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Voice Input"
    static var description = IntentDescription("Open Slate and start voice input")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Write flag to shared App Group so the RN app knows to open VoiceInput
        let defaults = UserDefaults(suiteName: "group.co.opsapp.slate")
        defaults?.set(true, forKey: "pendingVoiceInput")
        defaults?.synchronize()
        return .result()
    }
}
