import SwiftUI

struct NoteListView: View {
    let section: SlateSection
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var viewModel: NotesViewModel

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.notes.isEmpty {
                ProgressView()
                    .tint(Color(hex: "948b72"))
            } else if viewModel.notes.isEmpty {
                Text("No notes")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                List(viewModel.notes) { note in
                    NoteRowView(note: note) {
                        Task {
                            await viewModel.toggleNote(note, authService: authService)
                        }
                    }
                }
            }
        }
        .navigationTitle(section.name)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            #if targetEnvironment(simulator)
            viewModel.loadMockNotes(forSection: section.id)
            #else
            await viewModel.fetchNotes(sectionId: section.id, authService: authService)
            #endif
        }
    }
}
