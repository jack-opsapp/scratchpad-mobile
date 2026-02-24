import SwiftUI

@MainActor
final class NotesViewModel: ObservableObject {
    @Published var pages: [SlatePage] = []
    @Published var sections: [SlateSection] = []
    @Published var notes: [SlateNote] = []
    @Published var isLoading = false
    @Published var error: String?

    #if targetEnvironment(simulator)
    func loadMockData() {
        pages = [
            SlatePage(id: "2542161e-493c-4ca6-be3b-a9e2efe7589d", name: "General", userId: "mock", createdAt: nil, isShared: false),
            SlatePage(id: "44c869a9-85a1-4218-a3df-fe212b61a7e9", name: "OPS", userId: "mock", createdAt: nil, isShared: false),
            SlatePage(id: "f2230fd0-1a5c-4efb-a777-b5071e70e316", name: "Scratchpad", userId: "mock", createdAt: nil, isShared: false),
            SlatePage(id: "3a93e4b0-8c32-4654-b64d-5ebeab1de0f8", name: "LMC", userId: "mock", createdAt: nil, isShared: false),
            SlatePage(id: "6e686ea8-7815-4030-a695-5b45001c63fc", name: "Canpro", userId: "mock", createdAt: nil, isShared: false)
        ]
    }

    func loadMockSections() {
        // Sections vary by page - load based on which page was tapped
        // Default: General page sections
        sections = [
            SlateSection(id: "6c291712-5496-4991-8068-f3430ea3623b", name: "TODAY", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 0),
            SlateSection(id: "17d024e2-a243-437e-801b-3fd00c2c3fa8", name: "Business Ideas", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 1),
            SlateSection(id: "defb8b92-9e04-419d-ab77-7b7d0027c103", name: "Gifts", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 2),
            SlateSection(id: "37e757a2-9c2e-4c14-a219-e22c1bf41a0d", name: "MOLT", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 3)
        ]
    }

    func loadMockSections(forPage pageId: String) {
        switch pageId {
        case "2542161e-493c-4ca6-be3b-a9e2efe7589d": // General
            sections = [
                SlateSection(id: "6c291712-5496-4991-8068-f3430ea3623b", name: "TODAY", pageId: pageId, position: 0),
                SlateSection(id: "17d024e2-a243-437e-801b-3fd00c2c3fa8", name: "Business Ideas", pageId: pageId, position: 1),
                SlateSection(id: "defb8b92-9e04-419d-ab77-7b7d0027c103", name: "Gifts", pageId: pageId, position: 2),
                SlateSection(id: "37e757a2-9c2e-4c14-a219-e22c1bf41a0d", name: "MOLT", pageId: pageId, position: 3),
                SlateSection(id: "e0d1a238-baa9-44e9-828f-6b46080bd45a", name: "Requested Features", pageId: pageId, position: 4)
            ]
        case "44c869a9-85a1-4218-a3df-fe212b61a7e9": // OPS
            sections = [
                SlateSection(id: "47fd6757-9431-4c03-8a7a-6a765a149aa5", name: "iOS", pageId: pageId, position: 0),
                SlateSection(id: "0831c247-48f2-4bb4-bd6c-b91753468561", name: "WEB APP", pageId: pageId, position: 1),
                SlateSection(id: "87ef05f4-7e1e-4d44-800d-f19faa199c89", name: "SITE", pageId: pageId, position: 2),
                SlateSection(id: "1880c4d8-b17e-4815-86a0-9fd7e85c74ec", name: "Courses", pageId: pageId, position: 3),
                SlateSection(id: "e545ead7-35d2-4737-973c-9429af93a2fd", name: "Blog", pageId: pageId, position: 4)
            ]
        case "f2230fd0-1a5c-4efb-a777-b5071e70e316": // Scratchpad
            sections = [
                SlateSection(id: "1954ee86-31b2-403a-8f7c-406c26ee2d6b", name: "bugs", pageId: pageId, position: 0),
                SlateSection(id: "efc2b916-a63f-4555-8117-40e44267a418", name: "features", pageId: pageId, position: 1),
                SlateSection(id: "1c5d22e6-f44c-452e-87c8-d5c161c79fa3", name: "Bug Fixes - Testing", pageId: pageId, position: 2)
            ]
        default:
            sections = []
        }
    }

    func loadMockNotes() {
        loadMockNotes(forSection: "6c291712-5496-4991-8068-f3430ea3623b")
    }

    func loadMockNotes(forSection sectionId: String) {
        switch sectionId {
        case "6c291712-5496-4991-8068-f3430ea3623b": // TODAY
            notes = [
                SlateNote(id: "998b40db-210a-4009-adf2-300db48c3fc6", content: "Send invoices for verity, WJ", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "d3d25618-4f33-4c51-99ab-ee571073b23c", content: "Summit Brook quote", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "29c63f52-5e94-45f9-98b2-16f360e3e6b4", content: "Kristy email reply", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "e9067716-9fd4-4d54-9ee9-814df04561da", content: "Floor plates to Harry and Matt", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock")
            ]
        case "17d024e2-a243-437e-801b-3fd00c2c3fa8": // Business Ideas
            notes = [
                SlateNote(id: "873e2e4c-e800-40a1-9822-8035b72a6071", content: "Create knowledge database of all user thoughts, ideas", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "b82491c6-e097-44f3-934b-8b9a107f59f8", content: "an ai job interviewer with knowledge base", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "9602bce7-12f4-4c5c-bbe2-910913c4c7e2", content: "Pet door with camera and remote open, pet recognition with AI", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock")
            ]
        case "47fd6757-9431-4c03-8a7a-6a765a149aa5": // OPS iOS
            notes = [
                SlateNote(id: "cc6a40f4-ee8f-4333-8112-ec75b064d53d", content: "team members not visible in 'assign team' dropdown", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "fb13392e-69fe-45d5-8b3e-77716068ff0e", content: "Need to perform a complete SYNC audit", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "980e43c9-4232-4d62-b4f1-c2d9b8b70494", content: "allow the agent to draft invoices", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock")
            ]
        case "efc2b916-a63f-4555-8117-40e44267a418": // Scratchpad features
            notes = [
                SlateNote(id: "76393fba-cb6c-47c4-9488-d830dec17ade", content: "build apple watch app", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "c1753305-cc0a-49a5-a50d-b45ff9f1573c", content: "build mac desktop app", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock"),
                SlateNote(id: "3fc1c8da-93c6-4571-ba0f-697e0751b438", content: "Connect to calendar for time-sensitive events", sectionId: sectionId, isCompleted: false, createdAt: nil, userId: "mock")
            ]
        default:
            notes = []
        }
    }
    #endif

    func fetchPages(authService: AuthService) async {
        guard let userId = authService.userId,
              let token = await authService.ensureValidToken() else {
            error = "Not authenticated"
            return
        }

        isLoading = true
        error = nil

        do {
            pages = try await SupabaseService.shared.fetchPages(userId: userId, token: token)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func fetchSections(pageId: String, authService: AuthService) async {
        guard let token = await authService.ensureValidToken() else {
            error = "Not authenticated"
            return
        }

        isLoading = true
        do {
            sections = try await SupabaseService.shared.fetchSections(pageId: pageId, token: token)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func fetchNotes(sectionId: String, authService: AuthService) async {
        guard let token = await authService.ensureValidToken() else {
            error = "Not authenticated"
            return
        }

        isLoading = true
        do {
            notes = try await SupabaseService.shared.fetchNotes(sectionId: sectionId, token: token)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func toggleNote(_ note: SlateNote, authService: AuthService) async {
        guard let token = await authService.ensureValidToken() else { return }

        let newValue = !(note.isCompleted ?? false)

        // Optimistic update
        if let index = notes.firstIndex(where: { $0.id == note.id }) {
            notes[index].isCompleted = newValue
        }

        do {
            try await SupabaseService.shared.toggleNoteCompletion(
                noteId: note.id,
                isCompleted: newValue,
                token: token
            )
        } catch {
            // Rollback
            if let index = notes.firstIndex(where: { $0.id == note.id }) {
                notes[index].isCompleted = !newValue
            }
            self.error = error.localizedDescription
        }
    }
}
