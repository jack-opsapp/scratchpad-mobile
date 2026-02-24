import SwiftUI

struct CaptureTabView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = CaptureViewModel()

    private let accent = Color(hex: "948b72")

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    // Destination picker
                    DestinationPicker(
                        viewModel: viewModel,
                        authService: authService
                    )

                    // Text input
                    TextField("Note text...", text: $viewModel.noteText, axis: .vertical)
                        .font(.caption2)
                        .lineLimit(1...5)
                        .padding(8)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(8)

                    // Save button
                    if !viewModel.noteText.isEmpty && viewModel.selectedSection != nil {
                        Button {
                            Task { await viewModel.saveNote(authService: authService) }
                        } label: {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                Text("Save Note")
                            }
                            .font(.caption)
                        }
                        .tint(accent)
                        .disabled(viewModel.isSaving)
                    }

                    // Success
                    if viewModel.saved {
                        Label("Saved", systemImage: "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundColor(.green)
                    }

                    // Error
                    if let error = viewModel.error {
                        Text(error)
                            .font(.caption2)
                            .foregroundColor(.red)
                    }
                }
                .padding(.horizontal, 4)
            }
            .navigationTitle("Capture")
            .navigationBarTitleDisplayMode(.inline)
        }
        .task {
            #if targetEnvironment(simulator)
            // Real Slate data for simulator testing
            viewModel.pages = [
                SlatePage(id: "2542161e-493c-4ca6-be3b-a9e2efe7589d", name: "General", userId: "mock", createdAt: nil, isShared: false),
                SlatePage(id: "44c869a9-85a1-4218-a3df-fe212b61a7e9", name: "OPS", userId: "mock", createdAt: nil, isShared: false),
                SlatePage(id: "f2230fd0-1a5c-4efb-a777-b5071e70e316", name: "Scratchpad", userId: "mock", createdAt: nil, isShared: false)
            ]
            viewModel.sections = [
                SlateSection(id: "6c291712-5496-4991-8068-f3430ea3623b", name: "TODAY", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 0),
                SlateSection(id: "17d024e2-a243-437e-801b-3fd00c2c3fa8", name: "Business Ideas", pageId: "2542161e-493c-4ca6-be3b-a9e2efe7589d", position: 1)
            ]
            #else
            await viewModel.loadPages(authService: authService)
            #endif
        }
    }
}
