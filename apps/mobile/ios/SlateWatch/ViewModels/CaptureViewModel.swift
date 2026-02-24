import SwiftUI

@MainActor
final class CaptureViewModel: ObservableObject {
    @Published var selectedPage: SlatePage?
    @Published var selectedSection: SlateSection?
    @Published var noteText = ""
    @Published var isSaving = false
    @Published var saved = false
    @Published var error: String?

    @Published var pages: [SlatePage] = []
    @Published var sections: [SlateSection] = []

    func loadPages(authService: AuthService) async {
        guard let userId = authService.userId,
              let token = await authService.ensureValidToken() else { return }

        do {
            pages = try await SupabaseService.shared.fetchPages(userId: userId, token: token)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadSections(pageId: String, authService: AuthService) async {
        guard let token = await authService.ensureValidToken() else { return }

        do {
            sections = try await SupabaseService.shared.fetchSections(pageId: pageId, token: token)
        } catch {
            self.error = error.localizedDescription
        }
    }

    func saveNote(authService: AuthService) async {
        guard let section = selectedSection,
              let userId = authService.userId,
              let token = await authService.ensureValidToken(),
              !noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            error = "Select a destination and enter text"
            return
        }

        isSaving = true
        error = nil

        do {
            _ = try await SupabaseService.shared.createNote(
                content: noteText.trimmingCharacters(in: .whitespacesAndNewlines),
                sectionId: section.id,
                userId: userId,
                token: token
            )
            saved = true
            noteText = ""
            // Reset after brief delay
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            saved = false
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    func reset() {
        selectedPage = nil
        selectedSection = nil
        noteText = ""
        saved = false
        error = nil
    }
}
