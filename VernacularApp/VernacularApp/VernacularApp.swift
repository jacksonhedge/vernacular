import SwiftUI

@main
struct VernacularApp: App {
    @StateObject private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(supabase)
                .onOpenURL { url in
                    Task { await supabase.handleOAuthRedirect(url: url) }
                }
        }
    }
}

struct RootView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                // Branded splash
                ZStack {
                    Color.white.ignoresSafeArea()
                    VStack(spacing: 14) {
                        Image("VernacularLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 72, height: 72)
                        ProgressView()
                    }
                }
            } else if supabase.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .onAppear {
            Task.detached {
                // Check for stored session off main actor
                let stored = supabase.client.auth.currentSession
                await MainActor.run {
                    if let stored {
                        supabase.currentUser = stored.user
                        supabase.isAuthenticated = true
                        // Load org in background - don't block UI
                        Task { await supabase.restoreSession() }
                    }
                    isLoading = false
                }
            }
        }
    }
}
