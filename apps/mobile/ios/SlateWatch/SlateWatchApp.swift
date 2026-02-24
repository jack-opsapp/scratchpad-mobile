import SwiftUI

@main
struct SlateWatchApp: App {
    @StateObject private var authService = AuthService()

    var body: some Scene {
        WindowGroup {
            #if targetEnvironment(simulator)
            let _ = print("[SlateWatch] Simulator mode — bypassing auth gate")
            ContentView()
                .environmentObject(authService)
            #else
            if authService.isAuthenticated {
                ContentView()
                    .environmentObject(authService)
            } else {
                AuthGateView()
                    .environmentObject(authService)
            }
            #endif
        }
    }
}

struct AuthGateView: View {
    @EnvironmentObject var authService: AuthService

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "lock.shield")
                .font(.system(size: 32))
                .foregroundColor(Color(hex: "948b72"))

            Text("Slate")
                .font(.headline)

            Text("Open the Slate app on your iPhone to sign in.")
                .font(.caption2)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            Button("Retry") {
                authService.requestTokenFromPhone()
            }
            .tint(Color(hex: "948b72"))
        }
        .padding()
    }
}
