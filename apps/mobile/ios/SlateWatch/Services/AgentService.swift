import Foundation

/// Sends messages to the Slate AI agent API
actor AgentService {
    static let shared = AgentService()

    private let agentURL = "https://slate.opsapp.co/api/agent"

    private init() {}

    func send(
        message: String,
        userId: String,
        token: String,
        conversationHistory: [[String: String]] = []
    ) async throws -> AgentResponse {
        guard let url = URL(string: agentURL) else {
            throw AgentError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30

        let body: [String: Any] = [
            "message": message,
            "userId": userId,
            "conversationHistory": conversationHistory,
            "source": "watch",
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw AgentError.requestFailed
        }

        return try JSONDecoder().decode(AgentResponse.self, from: data)
    }

    enum AgentError: Error, LocalizedError {
        case invalidURL, requestFailed

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid URL"
            case .requestFailed: return "Agent request failed"
            }
        }
    }
}
