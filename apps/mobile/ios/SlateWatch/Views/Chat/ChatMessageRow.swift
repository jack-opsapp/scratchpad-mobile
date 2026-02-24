import SwiftUI

struct ChatMessageRow: View {
    let message: ChatMessage

    private let accent = Color(hex: "948b72")

    var body: some View {
        HStack {
            if message.role == .user {
                Spacer(minLength: 20)
            }

            Text(message.content)
                .font(.caption2)
                .padding(8)
                .background(
                    message.role == .user
                        ? accent.opacity(0.3)
                        : Color.white.opacity(0.1)
                )
                .cornerRadius(10)
                .foregroundColor(.white)

            if message.role == .assistant {
                Spacer(minLength: 20)
            }
        }
    }
}
