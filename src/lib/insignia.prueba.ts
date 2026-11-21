import { afterEach, describe, expect, it, vi } from 'vitest'
import { ponInsignia, sabePonerInsignia } from './insignia'

const original = globalThis.navigator

function conNavegador(valor: unknown) {
  Object.defineProperty(globalThis, 'navigator', { value: valor, writable: true, configurable: true })
}

afterEach(() => {
  conNavegador(original)
})

describe('la insignia del icono', () => {
  it('pone el número cuando hay avisos sin leer', async () => {
    const puesta = vi.fn().mockResolvedValue(undefined)
    const quitada = vi.fn().mockResolvedValue(undefined)
    conNavegador({ setAppBadge: puesta, clearAppBadge: quitada })

    await ponInsignia(3)
    expect(puesta).toHaveBeenCalledWith(3)
    expect(quitada).not.toHaveBeenCalled()
  })

  it('la quita cuando no queda nada', async () => {
    const puesta = vi.fn().mockResolvedValue(undefined)
    const quitada = vi.fn().mockResolvedValue(undefined)
    conNavegador({ setAppBadge: puesta, clearAppBadge: quitada })

    await ponInsignia(0)
    expect(quitada).toHaveBeenCalled()
    expect(puesta).not.toHaveBeenCalled()
  })

  it('un navegador que no sabe no es un error', async () => {
    conNavegador({})
    expect(sabePonerInsignia()).toBe(false)
    await expect(ponInsignia(2)).resolves.toBeUndefined()
  })

  it('y si lo intenta y falla, tampoco', async () => {
    // En el iPhone, sin instalar la aplicación, esto rechaza.
    conNavegador({ setAppBadge: () => Promise.reject(new Error('no permitido')) })
    await expect(ponInsignia(2)).resolves.toBeUndefined()
  })
})
