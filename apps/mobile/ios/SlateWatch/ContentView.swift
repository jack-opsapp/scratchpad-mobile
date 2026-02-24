import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        TabView {
            NotesTabView()
                .environmentObject(authService)

            ChatTabView()
                .environmentObject(authService)

            CaptureTabView()
                .environmentObject(authService)
        }
        .tabViewStyle(.verticalPage)
    }
}
