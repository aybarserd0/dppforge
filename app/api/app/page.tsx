'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ensureOrg } from '@/lib/ensureOrg'
import { getProductLimit, normalizePlan } from '@/src/lib/server/plan'

export default function AppHome() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  }, [])

  const createSampleProduct = async () => {
    setStatus('Creating product...')

    try {
      const orgId = await ensureOrg()

      // 🔥 1. PLAN ÇEK
      const { data: orgRow, error: orgError } = await supabase
        .from('orgs')
        .select('plan')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError

      const plan = normalizePlan(String(orgRow?.plan ?? 'FREE'))
      const limit = getProductLimit(plan)

      // 🔥 2. ÜRÜN SAYISI
      const { count, error: countError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)

      if (countError) throw countError

      // 🔥 3. PAYWALL
      if ((count ?? 0) >= limit) {
        setStatus(
          '❌ Free plan en fazla 3 ürün oluşturabilir. Pro’ya geçerek sınırsız ürün ekleyebilirsin.'
        )
        return
      }

      // 🔥 4. ÜRÜN OLUŞTUR
      const { data, error } = await supabase
        .from('products')
        .insert({
          org_id: orgId,
          name_tr: 'Örnek Tişört',
          name_en: 'Sample T-Shirt',
          sku: 'TSHIRT-001',
          category: 'apparel',
          brand: 'DPPForge',
          manufacturer: 'DPPForge Test',
          country_of_manufacture: 'TR',
          status: 'draft',
        })
        .select('id')
        .single()

      if (error) throw error

      setStatus(`✅ Product created: ${data.id}`)
    } catch (e: any) {
      setStatus(`❌ ${e?.message || 'Failed to create product'}`)
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {email || '...'}</p>

      <button
        type="button"
        onClick={createSampleProduct}
        style={{ padding: 12, marginTop: 12 }}
      >
        + Create sample product
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  )
}