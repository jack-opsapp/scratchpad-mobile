//
//  SLATE_WIDGETControl.swift
//  SLATE-WIDGET
//
//  ControlWidget for iPhone Action Button — triggers voice input in Slate.
//

import AppIntents
import SwiftUI
import WidgetKit

/// Control that appears in Settings → Action Button → Controls.
/// Pressing it opens Slate and starts voice recording.
struct SLATE_WIDGETControl: ControlWidget {
    static let kind: String = "co.opsapp.slate.voiceinput"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: StartVoiceInputIntent()) {
                Label("Voice Input", systemImage: "mic.fill")
            }
        }
        .displayName("Slate Voice")
        .description("Start voice input in Slate")
    }
}
