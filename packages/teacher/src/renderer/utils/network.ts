// src/renderer/utils/network.ts
export const getServerAddress = async (): Promise<string> => {
  try {
    const addresses = await window.electronAPI.getNetworkAddresses()
    // 优先使用非本地回环地址
    const preferredAddress = addresses.find(addr => 
      !addr.startsWith('127.') && 
      !addr.startsWith('::1') &&
      !addr.startsWith('fe80:')
    )
    return preferredAddress || addresses[0] || 'localhost'
  } catch (error) {
    console.error('Failed to get network addresses:', error)
    return 'localhost'
  }
}