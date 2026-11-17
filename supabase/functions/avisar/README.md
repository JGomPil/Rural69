# Avisos al móvil: cómo está montado

Esto es lo único de Rural69 que no vive en el navegador, y hace falta por una
razón sola: empujar un aviso exige firmar con la clave privada VAPID, y una
clave privada en el navegador no es privada.

## Las piezas

| Dónde | Qué hace |
|---|---|
| `supabase/14_avisos_push.sql` | La tabla `push_subscriptions`: a qué aparatos empujar |
| `src/lib/push.ts` | Apunta el aparato al activar los avisos. Lleva la clave **pública** |
| `public/sw.js` | Recibe el empujón y pinta el aviso, con la app cerrada |
| `supabase/functions/avisar/index.ts` | Firma, cifra y envía. Vive en Supabase |
| Un *Database Webhook* | Llama a la función cada vez que nace una fila en `notifications` |

## Si hay que volver a desplegar la función

1. Panel de Supabase → **Edge Functions** → `avisar` → **Code**.
2. Selecciona todo en `index.ts`, pega el contenido de este directorio, **Deploy**.

El nombre de la función es `avisar`, y **el archivo tiene que llamarse
`index.ts`**: es el que Supabase ejecuta. Un archivo con otro nombre no lo
importa nadie.

## Los secretos

En *Edge Functions → Secrets*, tres:

- `VAPID_PUBLIC_KEY` — la misma que está en `src/lib/push.ts`, a la vista
- `VAPID_PRIVATE_KEY` — **nunca en este repositorio, que es público**
- `VAPID_SUBJECT` — un `mailto:` de contacto, por si un servicio de push tiene
  una queja

El par se genera así, y solo hace falta si alguna vez hay que cambiarlo (lo
que obliga a que todos vuelvan a activar los avisos):

```sh
node -e "const {generateKeyPairSync}=require('crypto');
const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const b=(x)=>Buffer.from(x).toString('base64url');
console.log('publica',b(publicKey.export({type:'spki',format:'der'}).subarray(-65)));
console.log('privada',privateKey.export({format:'jwk'}).d)"
```

## El webhook

*Integrations → Database Webhooks → Webhooks*. Tabla `notifications`, evento
**Insert** y solo Insert (con Update, un aviso volvería a sonar cada vez que
alguien lo da por leído). Tipo *Supabase Edge Functions*, función `avisar`.

La cabecera `Authorization` tiene que llevar una clave privilegiada **con la
palabra `Bearer ` delante**:

```
Bearer eyJhbGciOi…
```

Esto costó una tarde. Sin el `Bearer`, Supabase rechaza la petición antes de
que el código llegue a ejecutarse y el registro muestra un **401 mudo**, sin
una sola línea que explique nada. Si vuelve a pasar, la función de ahora sí
escribe en el registro qué le ha llegado.

## Por qué la función comprueba quién la llama

Supabase ya exige un token válido, pero el de cualquier integrante del grupo
también lo es. Sin esa comprobación, cualquiera podría hacer sonar los once
móviles con el texto que quisiera.

## Comprobar que funciona sin mirar un móvil

Cuando un envío sale bien, la función escribe `last_ok_at` en esa suscripción.
Si esa marca cambia, la cadena entera está cerrada: webhook → clave → firma →
cifrado → el servicio de push lo aceptó. Lo único que no demuestra es que el
aviso se pintara en la pantalla.

Las suscripciones muertas (un móvil formateado, un navegador desinstalado) se
borran solas cuando el servicio contesta 404 o 410.
