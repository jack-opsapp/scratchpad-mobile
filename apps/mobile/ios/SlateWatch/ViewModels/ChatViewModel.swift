import SwiftUI

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var error: String?

    private let maxHistory = 10

    #if targetEnvironment(simulator)
    func loadMockMessages() {
        messages = [
            ChatMessage(role: .assistant, content: "Hey! I'm your Slate assistant. Ask me anything about your notes or tasks."),
            ChatMessage(role: .user, content: "What's on my list today?"),
            ChatMessage(role: .assistant, content: "You have 3 open tasks in Work: Review PR, ship watchOS app, and update design tokens.")
        ]
    }
    #endif

    func send(text: String, authService: AuthService) async {
        guard let userId = authService.userId,
              let token = await authService.ensureValidToken() else {
            error = "Not authenticated"
            return
        }

        let userMessage = ChatMessage(role: .user, content: text)
        messages.append(userMessage)
        isLoading = true
        error = nil

        let history = messages.suffix(maxHistory).map { $0.asDictionary }

        do {
            let response = try await AgentService.shared.send(
                message: text,
                userId: userId,
                token: token,
                conversationHistory: Array(history)
            )
            let assistantMessage = ChatMessage(role: .assistant, content: response.message ?? "Done.")
            messages.append(assistantMessage)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func clearHistory() {
        messages.removeAll()
    }
}
