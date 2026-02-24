import SwiftUI

struct ChatTabView: View {
    @EnvironmentObject var authService: AuthService
    @StateObject private var viewModel = ChatViewModel()
    @State private var inputText = ""

    private let accent = Color(hex: "948b72")

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(viewModel.messages) { message in
                                ChatMessageRow(message: message)
                                    .id(message.id)
                            }

                            if viewModel.isLoading {
                                HStack {
                                    ProgressView()
                                        .tint(accent)
                                    Spacer()
                                }
                                .padding(.horizontal, 4)
                                .id("loading")
                            }
                        }
                        .padding(.horizontal, 4)
                        .padding(.top, 4)
                    }
                    .onChange(of: viewModel.messages.count) {
                        withAnimation {
                            proxy.scrollTo(viewModel.messages.last?.id ?? "loading", anchor: .bottom)
                        }
                    }
                }

                Divider()

                // Input area
                HStack(spacing: 8) {
                    TextField("Message...", text: $inputText)
                        .font(.caption2)
                        .onSubmit { sendMessage() }

                    Button {
                        sendMessage()
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title3)
                            .foregroundColor(inputText.isEmpty ? .gray : accent)
                    }
                    .buttonStyle(.plain)
                    .disabled(inputText.isEmpty)
                }
                .padding(.horizontal, 4)
                .padding(.vertical, 6)
            }
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            #if targetEnvironment(simulator)
            .onAppear {
                print("[SlateWatch] ChatTabView .onAppear — messages: \(viewModel.messages.count)")
                if viewModel.messages.isEmpty {
                    viewModel.loadMockMessages()
                    print("[SlateWatch] Mock messages loaded: \(viewModel.messages.count)")
                }
            }
            #endif
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputText = ""

        Task {
            await viewModel.send(text: text, authService: authService)
        }
    }
}
