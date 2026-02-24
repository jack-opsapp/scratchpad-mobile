import Foundation

// MARK: - Data Models

struct SlatePage: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let userId: String?
    let createdAt: String?
    let isShared: Bool?

    enum CodingKeys: String, CodingKey {
        case id, name
        case userId = "user_id"
        case createdAt = "created_at"
        case isShared = "is_shared"
    }
}

struct SlateSection: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let pageId: String
    let position: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, position
        case pageId = "page_id"
    }
}

struct SlateNote: Codable, Identifiable, Hashable {
    let id: String
    let content: String?
    let sectionId: String
    var isCompleted: Bool?
    let createdAt: String?
    let userId: String?

    enum CodingKeys: String, CodingKey {
        case id, content
        case sectionId = "section_id"
        case isCompleted = "is_completed"
        case createdAt = "created_at"
        case userId = "user_id"
    }
}

// MARK: - Chat Models

struct ChatMessage: Identifiable, Hashable {
    let id: String
    let role: MessageRole
    let content: String
    let timestamp: Date

    init(role: MessageRole, content: String) {
        self.id = UUID().uuidString
        self.role = role
        self.content = content
        self.timestamp = Date()
    }

    enum MessageRole: String, Hashable {
        case user
        case assistant
    }

    var asDictionary: [String: String] {
        ["role": role.rawValue, "content": content]
    }
}

// MARK: - Agent Response

struct AgentResponse: Decodable {
    let type: String
    let message: String?
}

// MARK: - Color Extension

import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
