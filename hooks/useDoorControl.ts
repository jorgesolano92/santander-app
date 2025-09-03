// Hook simplificado para evitar errores de compilación
export function useDoorControl() {
  return {
    systemStatus: null,
    isLoading: false,
    error: null,
    connectionStatus: 'online' as const,
    currentScheduleMode: null,
    refreshStatus: async () => {},
    changeMode: async (mode: string) => true,
    toggleEmergency: async (activate: boolean) => true,
    controlDoor: async (doorId: string, action: string) => true,
    configure: async (config: any) => true,
    checkUpdates: async () => ({ hasUpdate: false }),
    validateDevice: async () => true,
    determineScheduleMode: async () => null,
  };
}