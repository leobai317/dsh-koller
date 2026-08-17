import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { KollerService } from './service.ts'
import { kollerPackageRoot, makeKollerRoutes } from './routes.ts'

export const name = 'koller'
export const inject = ['webServer']

export function apply(ctx: Context): void {
  const service = new KollerService(ctx)
  const routes = makeKollerRoutes({ service, packageRoot: kollerPackageRoot(import.meta.url) })
  ctx.effect(
    () => {
      const disposers = routes.map((route) => ctx.webServer.register(route))
      return () => { for (const dispose of disposers) dispose() }
    },
    'koller: routes',
  )
}