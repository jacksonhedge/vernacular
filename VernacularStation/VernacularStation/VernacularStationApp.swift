import SwiftUI

@main
struct VernacularStationApp: App {
    @StateObject private var syncEngine = SyncEngine()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(syncEngine)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(syncEngine.statusColor)
            }
        }
        .menuBarExtraStyle(.window)

        WindowGroup("Vernacular Station") {
            MainView()
                .environmentObject(syncEngine)
                .frame(minWidth: 700, minHeight: 500)
        }
        .defaultSize(width: 850, height: 600)
    }
}
