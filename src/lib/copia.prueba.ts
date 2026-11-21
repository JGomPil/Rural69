import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FUERA_DE_LA_COPIA, TABLAS_COPIA, diasDesdeLaCopia, apuntaCopia } from './copia'

/**
 * Esta es la prueba que importa de todo el archivo.
 *
 * Una copia de seguridad no falla con un error: falla el día que hace
 * falta, y por lo que no está dentro. Ya pasó una vez —se bajaba 12
 * tablas de 23, sin los menús ni el recetario ni el chat— y nadie se
 * habría enterado hasta tener que restaurarla.
 *
 * Así que la lista no se repasa a ojo: se compara con el esquema. Si
 * mañana un archivo SQL crea una tabla nueva, esto se pone rojo hasta
 * que se decida si va en la copia o se deja fuera a propósito.
 */
describe('la copia se lleva todo el esquema', () => {
  const tablasDelEsquema = () => {
    const tablas = new Set<string>()
    for (const archivo of readdirSync('supabase').filter((f) => f.endsWith('.sql'))) {
      const sql = readFileSync(`supabase/${archivo}`, 'utf8')
      for (const m of sql.matchAll(/create table if not exists public\.([a-z_]+)/g)) tablas.add(m[1])
    }
    return [...tablas].sort()
  }

  it('no se deja ninguna tabla sin decidir', () => {
    const cubiertas = new Set<string>([...TABLAS_COPIA, ...FUERA_DE_LA_COPIA])
    const sinCubrir = tablasDelEsquema().filter((t) => !cubiertas.has(t))
    expect(sinCubrir).toEqual([])
  })

  it('y no nombra tablas que no existen', () => {
    const esquema = new Set(tablasDelEsquema())
    const inventadas = [...TABLAS_COPIA, ...FUERA_DE_LA_COPIA].filter((t) => !esquema.has(t))
    expect(inventadas).toEqual([])
  })

  it('deja fuera las claves de los navegadores', () => {
    // Restauradas no sirven de nada, y mejor no tenerlas en un archivo.
    expect(FUERA_DE_LA_COPIA).toContain('push_subscriptions')
    expect(TABLAS_COPIA).not.toContain('push_subscriptions')
  })
})

describe('cuándo fue la última', () => {
  it('cuenta los días desde que se bajó', () => {
    localStorage.clear()
    expect(diasDesdeLaCopia()).toBeNull()
    const hace = new Date(Date.now() - 5 * 86_400_000)
    apuntaCopia(hace)
    expect(diasDesdeLaCopia()).toBe(5)
  })
})
