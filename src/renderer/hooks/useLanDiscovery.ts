/**
 * LAN Discovery Hook - Scan local network for Halo desktop instances.
 */

import { useState, useCallback } from 'react'

export interface DiscoveredServer {
  url: string
  ip: string
  port: number
}

const SCAN_TIMEOUT = 3000
const CONCURRENT = 15
const TOTAL_SCAN_MS = 30000

async function requestWithTimeout(url: string, timeoutMs: number): Promise<any> {
  return new Promise((resolve) => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      resolve(null)
    }, timeoutMs)

    fetch(url, { 
      signal: controller.signal, 
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
      .then((res) => {
        clearTimeout(timer)
        if (res.ok) {
          res.json().then(resolve).catch(() => resolve(null))
        } else {
          resolve(null)
        }
      })
      .catch(() => {
        clearTimeout(timer)
        resolve(null)
      })
  })
}

export function useLanDiscovery() {
  const [devices, setDevices] = useState<DiscoveredServer[]>([])
  const [scanning, setScanning] = useState(false)

  const scan = useCallback(async () => {
    if (scanning) return
    setScanning(true)
    setDevices([])
    console.log('[LanDiscovery] Scan started')

    // Try WebRTC to get local IP
    let localIp: string | null = null
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then((o) => pc.setLocalDescription(o))
      pc.onicecandidate = (ice) => {
        if (!ice?.candidate?.candidate) return
        const m = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(ice.candidate.candidate)
        if (m && !m[0].startsWith('127.')) {
          localIp = m[0]
        }
      }
      await new Promise(r => setTimeout(r, 2000))
      pc.close()
    } catch (err) {
      console.log('[LanDiscovery] WebRTC error:', err)
    }

    console.log('[LanDiscovery] WebRTC local IP:', localIp)

    // Get previously successful IP and subnet from storage
    let savedIp: string | null = null
    let savedSubnet: string | null = null
    try {
      savedIp = localStorage.getItem('halo-preferred-ip')
      savedSubnet = localStorage.getItem('halo-preferred-subnet')
    } catch (e) {}

    // Smart scanning strategy:
    // 1. If WebRTC works, only scan detected subnet (fastest)
    // 2. If we have a saved IP, first scan that IP's all ports (very fast)
    // 3. Then scan the saved subnet or common subnets
    const commonSubnets = [
      '192.168.1',   // Second most common (ASUS, Netgear, Linksys)
      '192.168.0',   // Most common in China (TP-Link, D-Link, Huawei)
      '192.168.31',  // Xiaomi/Redmi routers
    ]

    let subnets: string[]
    if (localIp && !localIp.startsWith('127.')) {
      const detectedSubnet = localIp.replace(/\.\d+$/, '')
      subnets = [detectedSubnet]
      console.log('[LanDiscovery] Using detected subnet:', detectedSubnet)
    } else if (savedSubnet) {
      subnets = [savedSubnet, ...commonSubnets.filter(s => s !== savedSubnet)]
      console.log('[LanDiscovery] Using saved subnet first:', savedSubnet)
    } else {
      subnets = commonSubnets
      console.log('[LanDiscovery] WebRTC failed, scanning common subnets:', subnets)
    }

    const ports = [3456, 3457, 3458]
    const found = new Set<string>()
    const startTime = Date.now()

    // First: Fast scan saved IP's all ports (if available)
    if (savedIp && !savedIp.startsWith('127.')) {
      console.log(`[LanDiscovery] Fast scanning saved IP: ${savedIp}`)
      const savedIpUrls = ports.map(port => `http://${savedIp}:${port}`)
      await Promise.all(
        savedIpUrls.map((url) =>
          requestWithTimeout(`${url}/api/remote/status`, SCAN_TIMEOUT)
            .then((json) => {
              if (json?.success && json?.data?.active && !found.has(url)) {
                found.add(url)
                const u = new URL(url)
                const device: DiscoveredServer = {
                  url,
                  ip: u.hostname,
                  port: Number(u.port),
                }
                console.log('[LanDiscovery] Found device:', device)
                setDevices((prev) => [...prev, device])
              }
            })
        )
      )
    }

    // Second: Scan subnets
    for (const subnet of subnets) {
      if (Date.now() - startTime > TOTAL_SCAN_MS) {
        console.log('[LanDiscovery] Time budget exceeded, stopping')
        break
      }

      console.log(`[LanDiscovery] Scanning subnet: ${subnet}.x`)

      for (let h = 1; h <= 254; h += CONCURRENT) {
        if (Date.now() - startTime > TOTAL_SCAN_MS) break

        const batch: string[] = []
        for (let i = 0; i < CONCURRENT && h + i <= 254; i++) {
          for (const port of ports) {
            batch.push(`http://${subnet}.${h + i}:${port}`)
          }
        }

        await Promise.all(
          batch.map((url) =>
            requestWithTimeout(`${url}/api/remote/status`, SCAN_TIMEOUT)
              .then((json) => {
                if (json?.success && json?.data?.active && !found.has(url)) {
                  found.add(url)
                  const u = new URL(url)
                  const device: DiscoveredServer = {
                    url,
                    ip: u.hostname,
                    port: Number(u.port),
                  }
                  console.log('[LanDiscovery] Found device:', device)
                  setDevices((prev) => [...prev, device])
                  
                  // Save IP and subnet for next time
                  try {
                    localStorage.setItem('halo-preferred-ip', u.hostname)
                    localStorage.setItem('halo-preferred-subnet', subnet)
                  } catch (e) {}
                }
              })
          )
        )
      }
    }

    console.log(`[LanDiscovery] Scan complete. Found ${found.size} device(s)`)
    setScanning(false)
  }, [scanning])

  return { devices, scanning, scan }
}
