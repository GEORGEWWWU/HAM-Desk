// function/useHamMapsData.ts
import { ref } from 'vue'

export function useHamMapsData() {
  const d1 = ref(''), d2 = ref(''), d3 = ref(''), d4 = ref('')
  const n1 = ref(''), n2 = ref(''), n3 = ref(''), n4 = ref('')
  const loading = ref(false)
  const error = ref('')

  const load = async () => {
    loading.value = true
    error.value = ''
    try {
      const xml: string = await window.electronAPI.getHamRss()
      const doc = new DOMParser().parseFromString(xml, 'text/xml')

      doc.querySelectorAll('calculatedconditions band').forEach((e: Element) => {
        const name = e.getAttribute('name') || ''
        const time = e.getAttribute('time') || ''
        const cond = e.textContent || ''

        if (name === '80m-40m' && time === 'day') d1.value = cond
        if (name === '30m-20m' && time === 'day') d2.value = cond
        if (name === '17m-15m' && time === 'day') d3.value = cond
        if (name === '12m-10m' && time === 'day') d4.value = cond
        if (name === '80m-40m' && time === 'night') n1.value = cond
        if (name === '30m-20m' && time === 'night') n2.value = cond
        if (name === '17m-15m' && time === 'night') n3.value = cond
        if (name === '12m-10m' && time === 'night') n4.value = cond
      })
    } catch (err) {
      error.value = '加载失败'
      console.error('Failed to load HAM RSS data:', err)
    } finally {
      loading.value = false
    }
  }

  // 启动时拉一次，外部可手动调用
  load()

  return { d1, d2, d3, d4, n1, n2, n3, n4, loading, error, load }
}
