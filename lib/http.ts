export async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, init)
  if (res.status === 402) {
    // client-side ise:
    if (typeof window !== 'undefined') window.location.href = '/admin/upgrade?required=enterprise'
    throw new Error('plan_required')
  }
  return { res, json: await res.json() }
}