import SwiftUI

struct NotesTabView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = NotesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.pages.isEmpty {
                    ProgressView()
                        .tint(Color(hex: "948b72"))
                } else if viewModel.pages.isEmpty {
                    Text("No pages yet")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    List(viewModel.pages) { page in
                        NavigationLink(value: page) {
                            Label(page.name, systemImage: "doc.text")
                                .font(.caption2)
                        }
                    }
                }
            }
            .navigationTitle("Notes")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: SlatePage.self) { page in
                SectionListView(page: page)
                    .environmentObject(authService)
                    .environmentObject(viewModel)
            }
        }
        .task {
            #if targetEnvironment(simulator)
            print("[SlateWatch] NotesTabView .task fired — loading mock data")
            viewModel.loadMockData()
            print("[SlateWatch] Pages loaded: \(viewModel.pages.count)")
            #else
            await viewModel.fetchPages(authService: authService)
            #endif
        }
    }
}
