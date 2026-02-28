//
//  AppIntent.swift
//  SLATE-WIDGET
//
//  Voice input intent for Action Button integration.
//

import AppIntents
import Foundation

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Configuration" }
    static var description = IntentDescription("Slate widget configuration.")

    @Parameter(title: "Favorite Emoji", default: "😀")
    var favoriteEmoji: String
}

/// Intent that opens Slate and navigates to the voice input screen.
/// Used by the ControlWidget assigned to the iPhone Action Button.
struct StartVoiceInputIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Voice Input"
    static var description = IntentDescription("Open Slate and start voice input")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Write flag to shared App Group UserDefaults so the RN app
        // knows to navigate to VoiceInputScreen on foreground.
        let defaults = UserDefaults(suiteName: "group.co.opsapp.slate")
        defaults?.set(true, forKey: "pendingVoiceInput")
        defaults?.synchronize()
        return .result()
    }
}
