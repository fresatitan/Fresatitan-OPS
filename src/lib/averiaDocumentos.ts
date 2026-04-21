import { supabase, isSupabaseConfigured } from './supabase'
import { toValidUuid } from './utils'
import type { AveriaDocumento, TipoDocumentoAveria } from '../types/database'

const BUCKET = 'averia-documentos'

export const MIME_ACEPTADOS = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]
export const EXTS_ACEPTADOS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp'
export const MAX_BYTES = 20 * 1024 * 1024 // 20MB por archivo

export interface UploadInput {
  maquinaId: string
  maquinaEstadoId: string
  file: File
  tipo?: TipoDocumentoAveria
  subidoPor?: string | null
}

export interface UploadResult {
  ok: boolean
  documento?: AveriaDocumento
  error?: string
}

function inferirTipo(file: File): TipoDocumentoAveria {
  if (file.type === 'application/pdf') return 'parte_tecnico'
  if (file.type.startsWith('image/')) return 'foto'
  return 'otro'
}

function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
}

/**
 * Sube un archivo al bucket privado y registra el metadata en averia_documentos.
 * Path convention: {maquinaId}/{maquinaEstadoId}/{timestamp}_{nombreSanitizado}
 */
export async function uploadAveriaDocumento({
  maquinaId,
  maquinaEstadoId,
  file,
  tipo,
  subidoPor,
}: UploadInput): Promise<UploadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase no configurado' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `Archivo "${file.name}" demasiado grande (máx. ${MAX_BYTES / 1024 / 1024}MB)` }
  }
  if (!MIME_ACEPTADOS.includes(file.type)) {
    return { ok: false, error: `Formato no soportado: ${file.name} (${file.type || 'desconocido'})` }
  }

  const ts = Date.now()
  const safeName = sanitizeName(file.name)
  const path = `${maquinaId}/${maquinaEstadoId}/${ts}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { ok: false, error: `Error al subir ${file.name}: ${uploadError.message}` }
  }

  const { data, error: insertError } = await supabase
    .from('averia_documentos')
    .insert({
      maquina_estado_id: maquinaEstadoId,
      storage_path: path,
      nombre_original: file.name,
      tipo: tipo ?? inferirTipo(file),
      mime_type: file.type,
      tamano_bytes: file.size,
      subido_por: toValidUuid(subidoPor),
    })
    .select()
    .single()

  if (insertError || !data) {
    // Rollback: borrar archivo si no se pudo crear el registro
    await supabase.storage.from(BUCKET).remove([path])
    return { ok: false, error: insertError?.message ?? 'Error guardando metadatos' }
  }

  return { ok: true, documento: data as AveriaDocumento }
}

/**
 * Genera una URL firmada temporal (1 hora) para visualizar o descargar un documento.
 */
export async function getSignedUrl(storagePath: string, expiresInSec = 3600): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSec)
  if (error || !data) {
    console.error('[getSignedUrl] error:', error)
    return null
  }
  return data.signedUrl
}

export async function deleteAveriaDocumento(doc: AveriaDocumento): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, error: 'Supabase no configurado' }

  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path])
  if (storageErr) {
    console.error('[deleteAveriaDocumento] storage error:', storageErr)
    // Seguimos con el delete del registro aunque el archivo ya no esté
  }
  const { error: dbErr } = await supabase.from('averia_documentos').delete().eq('id', doc.id)
  if (dbErr) return { ok: false, error: dbErr.message }
  return { ok: true }
}
