import Foundation

/// Lightweight PostgREST client for watchOS
actor SupabaseService {
    static let shared = SupabaseService()

    private let baseURL = "https://lepksnpkrnkokiwxfcsj.supabase.co/rest/v1"
    private let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlcGtzbnBrcm5rb2tpd3hmY3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzgzNTgsImV4cCI6MjA0NzYxNDM1OH0.WPOxMBPMJerv_VibfDtuEz7JXZPmbnT8X1JO9sFhL3A"

    private init() {}

    // MARK: - Pages

    func fetchPages(userId: String, token: String) async throws -> [SlatePage] {
        let query = "user_id=eq.\(userId)&order=created_at.desc&select=*"
        return try await get(table: "pages", query: query, token: token)
    }

    // MARK: - Sections

    func fetchSections(pageId: String, token: String) async throws -> [SlateSection] {
        let query = "page_id=eq.\(pageId)&order=position.asc&select=*"
        return try await get(table: "sections", query: query, token: token)
    }

    // MARK: - Notes

    func fetchNotes(sectionId: String, token: String) async throws -> [SlateNote] {
        let query = "section_id=eq.\(sectionId)&order=created_at.desc&select=*"
        return try await get(table: "notes", query: query, token: token)
    }

    func toggleNoteCompletion(noteId: String, isCompleted: Bool, token: String) async throws {
        let body: [String: Any] = ["is_completed": isCompleted]
        try await patch(table: "notes", id: noteId, body: body, token: token)
    }

    func createNote(content: String, sectionId: String, userId: String, token: String) async throws -> SlateNote {
        let body: [String: Any] = [
            "content": content,
            "section_id": sectionId,
            "user_id": userId,
            "is_completed": false,
        ]
        return try await post(table: "notes", body: body, token: token)
    }

    // MARK: - Generic REST

    private func get<T: Decodable>(table: String, query: String, token: String) async throws -> T {
        let urlString = "\(baseURL)/\(table)?\(query)"
        guard let url = URL(string: urlString) else { throw ServiceError.invalidURL }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ServiceError.requestFailed
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func post<T: Decodable>(table: String, body: [String: Any], token: String) async throws -> T {
        let urlString = "\(baseURL)/\(table)"
        guard let url = URL(string: urlString) else { throw ServiceError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ServiceError.requestFailed
        }
        // PostgREST returns an array even for single inserts
        let results = try JSONDecoder().decode([T].self, from: data)
        guard let first = results.first else { throw ServiceError.emptyResponse }
        return first
    }

    private func patch(table: String, id: String, body: [String: Any], token: String) async throws {
        let urlString = "\(baseURL)/\(table)?id=eq.\(id)"
        guard let url = URL(string: urlString) else { throw ServiceError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw ServiceError.requestFailed
        }
    }

    enum ServiceError: Error, LocalizedError {
        case invalidURL, requestFailed, emptyResponse

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "Invalid URL"
            case .requestFailed: return "Request failed"
            case .emptyResponse: return "Empty response"
            }
        }
    }
}
