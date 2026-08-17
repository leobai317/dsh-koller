export const KOLLER_CSS = `
.koller-pet-root { position: fixed; z-index: 2147483000; cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; }
.koller-pet-root.hovered .koller-pet-toolbar { opacity: 1; pointer-events: auto; }
.koller-pet-stage { position: relative; width: 100%; height: 100%; }
.koller-pet-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 300ms ease; pointer-events: none; }
.koller-pet-img.show { opacity: 1; }
.koller-pet-img.bounce { animation: koller-bounce 600ms ease; }
@keyframes koller-bounce {
  0% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-18px) scale(1.06); }
  60% { transform: translateY(0) scale(0.97); }
  80% { transform: translateY(-6px) scale(1.02); }
  100% { transform: translateY(0) scale(1); }
}
.koller-pet-bubble { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); background: rgba(17, 24, 39, 0.92); color: #fff; font-size: 12px; line-height: 1.4; padding: 4px 10px; border-radius: 999px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.25); }
.koller-pet-toolbar { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); display: flex; gap: 4px; background: rgba(17, 24, 39, 0.9); border-radius: 8px; padding: 4px; opacity: 0; transition: opacity 150ms ease; pointer-events: none; }
.koller-pet-btn { background: none; border: none; color: #fff; font-size: 14px; line-height: 1; padding: 4px 7px; border-radius: 5px; cursor: pointer; }
.koller-pet-btn:hover { background: rgba(255,255,255,0.18); }
.koller-pet-summon { position: fixed; z-index: 2147483000; right: 24px; bottom: 20px; background: rgba(17,24,39,0.92); color: #fff; border: none; border-radius: 999px; padding: 8px 14px; font-size: 13px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.koller-pet-summon:hover { background: rgba(17,24,39,1); }
`

export function injectKollerCss(): () => void {
  const id = 'koller-pet-style'
  if (document.querySelector(`style[data-plugin-css="${id}"]`) !== null) return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = '@leo6666666/dsh-koller'
  tag.dataset.pluginCss = id
  tag.textContent = KOLLER_CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}