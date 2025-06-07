// src/storage/index.ts
import { Storage } from '@plasmohq/storage'

export const localStorageInstance = new Storage({
  area: 'local',
})
