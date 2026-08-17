import { createElement, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { KollerStateView } from '../service.ts'

const IMAGES: Record<string, string> = {
  waiting: '/koller/waiting.webp',
  working: '/koller/working.webp',
  done: '/koller/done.webp',
}

const IMAGE_RATIOS: Record<string, number> = {
  waiting: 211 / 640,
  working: 489 / 640,
  done: 462 / 640,
}

interface KollerPetProps {
  state: KollerStateView | null
  onHide: () => void
  onResize: (delta: number) => void
  onDragEnd: (right: number, bottom: number) => void
  onSummon: () => void
}

const clamp = (value: number, max: number): number => Math.max(0, Math.min(max, value))

export function KollerPet({ state, onHide, onResize, onDragEnd, onSummon }: KollerPetProps): ReturnType<typeof createElement> {
  const [dragPos, setDragPos] = useState<{ right: number; bottom: number } | null>(null)
  const [hovered, setHovered] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; right: number; bottom: number; moved: boolean } | null>(null)
  const lastPosRef = useRef<{ right: number; bottom: number } | null>(null)
  const hoverTimerRef = useRef<number | null>(null)

  const enterHover = (): void => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setHovered(true)
  }
  const leaveHover = (): void => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = window.setTimeout(() => setHovered(false), 300)
  }

  const onPointerDown = (e: ReactPointerEvent): void => {
    if (e.button !== 0 || state === null) return
    if ((e.target as HTMLElement).closest('button') !== null) return
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const pos = dragPos ?? state.display
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      right: pos.right,
      bottom: pos.bottom,
      moved: false,
    }
  }

  const onPointerMove = (e: ReactPointerEvent): void => {
    const d = dragRef.current
    if (d === null) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return
    d.moved = true
    lastPosRef.current = {
      right: clamp(d.right - dx, window.innerWidth - 40),
      bottom: clamp(d.bottom - dy, window.innerHeight - 40),
    }
    setDragPos(lastPosRef.current)
  }

  const onPointerUp = (): void => {
    const d = dragRef.current
    if (d === null) return
    dragRef.current = null
    if (d.moved && lastPosRef.current !== null) onDragEnd(lastPosRef.current.right, lastPosRef.current.bottom)
    lastPosRef.current = null
  }

  useEffect(() => {
    if (dragPos !== null && state !== null
      && state.display.right === dragPos.right
      && state.display.bottom === dragPos.bottom) {
      setDragPos(null)
    }
  }, [dragPos, state])

  if (state === null) return createElement('div')
  if (!state.display.visible) {
    return createElement('button', { className: 'koller-pet-summon', onClick: onSummon }, `召唤${state.name}`)
  }
  const image = IMAGES[state.image]
  const pos = dragPos ?? state.display
  return createElement('div', {
    className: `koller-pet-root${hovered ? ' hovered' : ''}`,
    style: {
      right: `${pos.right}px`,
      bottom: `${pos.bottom}px`,
      height: `${state.display.size}px`,
      width: `${Math.round(state.display.size * IMAGE_RATIOS[state.image])}px`,
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onPointerEnter: enterHover,
    onPointerLeave: leaveHover,
  },
    createElement('div', { className: 'koller-pet-toolbar' },
      createElement('button', { className: 'koller-pet-btn', onClick: () => onResize(-20), title: '变小' }, '−'),
      createElement('button', { className: 'koller-pet-btn', onClick: () => onResize(20), title: '变大' }, '+'),
      createElement('button', { className: 'koller-pet-btn', onClick: onHide, title: '隐藏' }, '✕'),
    ),
    createElement('div', { className: 'koller-pet-stage' },
      createElement('img', {
        className: `koller-pet-img show${state.image === 'done' ? ' bounce' : ''}`,
        src: image,
        alt: '',
        draggable: false,
      }),
      createElement('div', { className: 'koller-pet-bubble' }, state.bubble),
    ),
  )
}