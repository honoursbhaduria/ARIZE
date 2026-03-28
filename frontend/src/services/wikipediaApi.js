// Wikipedia API service for fetching gym and fitness related images

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1'
const WIKIPEDIA_QUERY_API = 'https://en.wikipedia.org/w/api.php'

// Predefined gym-related search terms with their Wikipedia page titles
const GYM_TOPICS = {
  hero: ['Gym', 'Physical_fitness', 'Bodybuilding'],
  equipment: [
    { name: 'Dumbbell', title: 'Dumbbell' },
    { name: 'Barbell', title: 'Barbell' },
    { name: 'Treadmill', title: 'Treadmill' },
    { name: 'Kettlebell', title: 'Kettlebell' },
    { name: 'Pull-up Bar', title: 'Pull-up_(exercise)' },
    { name: 'Exercise Bike', title: 'Stationary_bicycle' },
    { name: 'Rowing Machine', title: 'Indoor_rower' },
    { name: 'Cable Machine', title: 'Cable_machine' }
  ],
  exercises: [
    { name: 'Bench Press', title: 'Bench_press' },
    { name: 'Squat', title: 'Squat_(exercise)' },
    { name: 'Deadlift', title: 'Deadlift' },
    { name: 'Pull-up', title: 'Pull-up_(exercise)' },
    { name: 'Push-up', title: 'Push-up' },
    { name: 'Plank', title: 'Plank_(exercise)' },
    { name: 'Lunges', title: 'Lunge_(exercise)' },
    { name: 'Shoulder Press', title: 'Overhead_press' }
  ],
  classes: [
    { name: 'Yoga', title: 'Yoga' },
    { name: 'Pilates', title: 'Pilates' },
    { name: 'CrossFit', title: 'CrossFit' },
    { name: 'HIIT', title: 'High-intensity_interval_training' },
    { name: 'Spinning', title: 'Indoor_cycling' },
    { name: 'Zumba', title: 'Zumba' }
  ]
}

/**
 * Fetch page summary with thumbnail from Wikipedia REST API
 */
export async function getPageSummary(title) {
  try {
    const response = await fetch(
      `${WIKIPEDIA_API_BASE}/page/summary/${encodeURIComponent(title)}`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail?.source || null,
      originalImage: data.originalimage?.source || null,
      pageUrl: data.content_urls?.desktop?.page || null
    }
  } catch (error) {
    console.error(`Failed to fetch page summary for ${title}:`, error)
    return null
  }
}

/**
 * Fetch images for a Wikipedia page
 */
export async function getPageImages(title, limit = 5) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'images|pageimages',
      imlimit: limit.toString(),
      piprop: 'original|thumbnail',
      pithumbsize: '400',
      format: 'json',
      origin: '*'
    })

    const response = await fetch(`${WIKIPEDIA_QUERY_API}?${params}`)

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    const pages = data.query?.pages || {}
    const page = Object.values(pages)[0]

    return {
      thumbnail: page?.thumbnail?.source || null,
      original: page?.original?.source || null,
      images: page?.images?.map(img => img.title) || []
    }
  } catch (error) {
    console.error(`Failed to fetch images for ${title}:`, error)
    return null
  }
}

/**
 * Fetch multiple equipment items with their images
 */
export async function getEquipmentData() {
  const results = await Promise.all(
    GYM_TOPICS.equipment.map(async (item) => {
      const summary = await getPageSummary(item.title)
      return {
        name: item.name,
        ...summary
      }
    })
  )
  return results.filter(item => item.thumbnail)
}

/**
 * Fetch exercise data with images
 */
export async function getExerciseData() {
  const results = await Promise.all(
    GYM_TOPICS.exercises.map(async (item) => {
      const summary = await getPageSummary(item.title)
      return {
        name: item.name,
        ...summary
      }
    })
  )
  return results.filter(item => item.thumbnail)
}

/**
 * Fetch fitness class data with images
 */
export async function getClassesData() {
  const results = await Promise.all(
    GYM_TOPICS.classes.map(async (item) => {
      const summary = await getPageSummary(item.title)
      return {
        name: item.name,
        ...summary
      }
    })
  )
  return results.filter(item => item.thumbnail)
}

/**
 * Get hero section image
 */
export async function getHeroImage() {
  for (const title of GYM_TOPICS.hero) {
    const summary = await getPageSummary(title)
    if (summary?.originalImage || summary?.thumbnail) {
      return summary
    }
  }
  return null
}

/**
 * Search Wikipedia for gym-related content
 */
export async function searchGymContent(query, limit = 10) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: `${query} fitness gym exercise`,
      srlimit: limit.toString(),
      format: 'json',
      origin: '*'
    })

    const response = await fetch(`${WIKIPEDIA_QUERY_API}?${params}`)

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    return data.query?.search || []
  } catch (error) {
    console.error(`Failed to search for ${query}:`, error)
    return []
  }
}

/**
 * Fetch a fuller plain-text extract for a page.
 */
export async function getPageFullExtract(title, maxChars = 6000) {
  try {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'extracts',
      explaintext: '1',
      exsectionformat: 'plain',
      exchars: String(maxChars),
      titles: title,
      format: 'json',
      origin: '*'
    })

    const response = await fetch(`${WIKIPEDIA_QUERY_API}?${params}`)
    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`)
    }

    const data = await response.json()
    const pages = data?.query?.pages || {}
    const page = Object.values(pages)[0]
    const extract = (page?.extract || '').trim()
    return extract || null
  } catch (error) {
    console.error(`Failed to fetch full extract for ${title}:`, error)
    return null
  }
}

/**
 * Resolve posture article data from Wikipedia using a topic name.
 */
export async function getPostureReadingContent(topicName) {
  const normalized = String(topicName || '').trim()
  const mapped = GYM_TOPICS.exercises.find(
    (item) => item.name.toLowerCase() === normalized.toLowerCase()
  )
  const pageTitle = mapped?.title || normalized || 'Physical_fitness'

  const summary = await getPageSummary(pageTitle)
  const fullExtract = await getPageFullExtract(pageTitle)

  if (!summary && !fullExtract) {
    return null
  }

  return {
    topic: mapped?.name || summary?.title || normalized || 'Posture Reading',
    wikiTitle: summary?.title || pageTitle,
    extract: fullExtract || summary?.extract || '',
    thumbnail: summary?.thumbnail || null,
    pageUrl: summary?.pageUrl || null,
  }
}

export { GYM_TOPICS }
