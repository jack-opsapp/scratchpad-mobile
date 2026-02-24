import SwiftUI

struct SectionListView: View {
    let page: SlatePage
    @EnvironmentObject var authService: AuthService
    @EnvironmentObject var viewModel: NotesViewModel

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.sections.isEmpty {
                ProgressView()
                    .tint(Color(hex: "948b72"))
            } else if viewModel.sections.isEmpty {
                Text("No sections")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                List(viewModel.sections) { section in
                    NavigationLink(value: section) {
                        Label(section.name, systemImage: "folder")
                            .font(.caption2)
                    }
                }
            }
        }
        .navigationTitle(page.name)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: SlateSection.self) { section in
            NoteListView(section: section)
                .environmentObject(authService)
                .environmentObject(viewModel)
        }
        .task {
            #if targetEnvironment(simulator)
            viewModel.loadMockSections(forPage: page.id)
            #else
            await viewModel.fetchSections(pageId: page.id, authService: authService)
            #endif
        }
    }
}
