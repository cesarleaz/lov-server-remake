import mongoose from 'mongoose'
import { MONGODB_URI } from '../constants.js'

try {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ MongoDB connected successfully')
} catch {
  console.error('❌ MongoDB connection error:', error)
  throw error
}
