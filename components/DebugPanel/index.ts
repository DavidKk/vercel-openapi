/**
 * Debug panel: development-only floating UI. Global provider + register/unregister by consumer.
 * - Provider at app root; panel is shown only when at least one consumer has registered (useDebugPanel).
 * - Fixed controls: switches (e.g. Force loading, Force error) and buttons; no arbitrary custom UI.
 */

export type { DebugButtonId, DebugPanelState, DebugSwitchId } from './context'
export { DEBUG_BUTTON_IDS, DEBUG_SWITCH_IDS, DebugPanelProvider, DEFAULT_DEBUG_ERROR_MESSAGE, useDebugPanel } from './context'
export { DebugPanel } from './DebugPanel'
