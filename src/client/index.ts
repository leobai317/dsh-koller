import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { KollerStateView } from '../service.ts'
import { KollerPet } from './KollerPet.tsx'
import { injectKollerCss } from './style.ts'

const POLL_MS = 800

async function apiFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined
    ? {}
    : {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
  if (!response.ok) throw new Error(`koller ${path} failed: ${response.status}`)
  return (await response.json()) as T
}

const kollerApi = {
  state: () => apiFetch<KollerStateView>('/api/koller/state'),
  setVisible: (visible: boolean) => apiFetch('/api/koller/set-visible', { visible }),
  setConfig: (patch: Record<string, number>) => apiFetch('/api/koller/set-config', patch),
}

export function apply(): void {
  if ((window as { __kollerApplied?: boolean }).__kollerApplied) return
  ;(window as { __kollerApplied?: boolean }).__kollerApplied = true

  injectKollerCss()

  const container = document.createElement('div')
  container.dataset.dshKollerRoot = ''
  document.body.appendChild(container)
  const root = createRoot(container)

  let snapshot: KollerStateView | null = null
  let timer: number | undefined
  let pending = false

  const render = (): void => {
    root.render(createElement(KollerPet, {
      state: snapshot,
      onHide: () => { void kollerApi.setVisible(false).then(pollNow) },
      onSummon: () => { void kollerApi.setVisible(true).then(pollNow) },
      onResize: (delta) => {
        if (snapshot !== null) void kollerApi.setConfig({ size: snapshot.display.size + delta }).then(pollNow)
      },
      onDragEnd: (right, bottom) => { void kollerApi.setConfig({ right, bottom }).then(pollNow) },
    }))
  }

  const pollNow = (): void => {
    if (pending) return
    pending = true
    kollerApi.state().then((value) => {
      snapshot = value
      render()
    }, () => {
      // transport error: keep last snapshot
    }).finally(() => { pending = false })
  }

  const start = (): void => {
    if (timer === undefined && document.visibilityState === 'visible') {
      timer = window.setInterval(pollNow, POLL_MS)
    }
  }
  const stop = (): void => {
    if (timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') { pollNow(); start() } else { stop() }
  }

  pollNow()
  start()
  document.addEventListener('visibilitychange', onVisibility)
}