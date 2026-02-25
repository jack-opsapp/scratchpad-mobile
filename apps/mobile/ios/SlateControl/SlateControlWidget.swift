import WidgetKit
import SwiftUI
import AppIntents

@available(iOS 18.0, *)
struct SlateVoiceControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "co.opsapp.slate.voiceinput") {
            ControlWidgetButton(action: StartVoiceInputIntent()) {
                Label("Voice Input", systemImage: "mic.fill")
            }
        }
        .displayName("Slate Voice")
        .description("Start voice input in Slate")
    }
}
