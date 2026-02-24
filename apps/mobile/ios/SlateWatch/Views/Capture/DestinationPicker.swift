import SwiftUI

struct DestinationPicker: View {
    @ObservedObject var viewModel: CaptureViewModel
    let authService: AuthService

    private let accent = Color(hex: "948b72")

    var body: some View {
        VStack(spacing: 6) {
            // Page picker
            if viewModel.pages.isEmpty {
                Text("Loading pages...")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            } else {
                Picker("Page", selection: $viewModel.selectedPage) {
                    Text("Select Page").tag(nil as SlatePage?)
                    ForEach(viewModel.pages) { page in
                        Text(page.name)
                            .tag(page as SlatePage?)
                    }
                }
                .font(.caption2)
                .tint(accent)
                .onChange(of: viewModel.selectedPage) {
                    viewModel.selectedSection = nil
                    viewModel.sections = []
                    if let page = viewModel.selectedPage {
                        Task {
                            await viewModel.loadSections(pageId: page.id, authService: authService)
                        }
                    }
                }
            }

            // Section picker (shown after page selected)
            if viewModel.selectedPage != nil && !viewModel.sections.isEmpty {
                Picker("Section", selection: $viewModel.selectedSection) {
                    Text("Select Section").tag(nil as SlateSection?)
                    ForEach(viewModel.sections) { section in
                        Text(section.name)
                            .tag(section as SlateSection?)
                    }
                }
                .font(.caption2)
                .tint(accent)
            } else if viewModel.selectedPage != nil && viewModel.sections.isEmpty {
                Text("Loading sections...")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}
