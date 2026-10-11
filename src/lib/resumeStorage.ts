const DB_NAME = 'ai-job-tracker-db'
const STORE_NAME = 'resumes'
const RESUME_KEY = 'primary-resume'

function openResumeDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveResume(file: File): Promise<void> {
  const db = await openResumeDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put(
      {
        file,
        name: file.name,
        savedAt: new Date().toISOString(),
      },
      RESUME_KEY,
    )

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function getSavedResume(): Promise<{
  file: File
  name: string
  savedAt: string
} | null> {
  const db = await openResumeDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(RESUME_KEY)

    request.onsuccess = () => {
      db.close()
      resolve(request.result ?? null)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function deleteSavedResume(): Promise<void> {
  const db = await openResumeDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(RESUME_KEY)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}
