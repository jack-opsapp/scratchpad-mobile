import SwiftUI

/// Standalone voice input screen (for dedicated voice capture)
struct VoiceInputView: View {
    @ObservedObject var speechService: SpeechService
    let onComplete: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    private let accent = Color(hex: "948b72")

    var body: some View {
        VStack(spacing: 12) {
            if !speechService.transcription.isEmpty {
                ScrollView {
                    Text(speechService.transcription)
                        .font(.body)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                Text(speechService.isRecording ? "Listening..." : "Tap to record")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            HStack(spacing: 20) {
                // Record / Stop
                Button {
                    if speechService.isRecording {
                        speechService.stopRecording()
                    } else {
                        speechService.startRecording()
                    }
                } label: {
                    Image(systemName: speechService.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.largeTitle)
                        .foregroundColor(speechService.isRecording ? .red : accent)
                }
                .buttonStyle(.plain)

                // Send
                if !speechService.transcription.isEmpty && !speechService.isRecording {
                    Button {
                        onComplete(speechService.transcription)
                        dismiss()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.largeTitle)
                            .foregroundColor(accent)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .navigationTitle("Voice")
        .navigationBarTitleDisplayMode(.inline)
    }
}
