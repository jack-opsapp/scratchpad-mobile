import SwiftUI

/// Voice input service for watchOS.
/// Uses watchOS system dictation (via text input controller) as the primary mechanism.
/// AVAudioEngine-based recording is a future enhancement for on-device transcription.
@MainActor
final class SpeechService: ObservableObject {
    @Published var isRecording = false
    @Published var transcription = ""
    @Published var error: String?

    func requestPermission() {
        // watchOS dictation doesn't need explicit permission
    }

    /// Start "recording" — on watchOS, this is a visual indicator.
    /// Actual voice input happens via system dictation (presentTextInputController).
    func startRecording() {
        transcription = ""
        error = nil
        isRecording = true
    }

    func stopRecording() {
        isRecording = false
    }

    /// Set transcription from external source (e.g., system dictation result)
    func setTranscription(_ text: String) {
        transcription = text
        isRecording = false
    }
}
